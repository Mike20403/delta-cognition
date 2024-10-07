import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import Device, { DeviceStatus } from '../models/device.model';
import { Pipeline, Node } from '../models/pipeline.model';
import { ObjectId } from 'mongodb';
export interface ActiveDevices {
	[key: string]: number;
}

export class WebsocketService {
	private webSocketServer: WebSocket.Server<typeof WebSocket, typeof IncomingMessage> | null;
	private deviceIntervals: { [deviceId: string]: NodeJS.Timeout } = {}; // Track intervals for each device
	private activeConnections: { [deviceId: string]: WebSocket[] } = {}; // Track connected clients per device
	private activeDevices: ActiveDevices = {};

	constructor(port?: number) {
		port && this.connect(port);
		this.webSocketServer = null;
	}

	get websocket() {
		return this.webSocketServer;
	}

	private async getPipelineConnections() {
		const pipelines = await Pipeline.find();
		const connections: { [key: string]: string[] } = {};

		await Promise.all(
			pipelines.map(async (pipeline) => {
				await Promise.all(
					pipeline.connections.map(async (connection) => {
						const nodeFrom = await Node.findOne({ _id: connection.from });
						const nodeTo = await Node.findOne({ _id: connection.to });

						if (nodeFrom && nodeTo) {
							const deviceIdFrom = nodeFrom.deviceId.toString();
							const deviceIdTo = nodeTo.deviceId.toString();

							if (!connections[deviceIdFrom]) {
								connections[deviceIdFrom] = [];
							}

							connections[deviceIdFrom].push(deviceIdTo);
						}
					}),
				);
			}),
		);

		return connections;
	}

	// Add new client to active connections map
	private addActiveConnection(deviceId: string, ws: WebSocket) {
		if (!this.activeConnections[deviceId]) {
			this.activeConnections[deviceId] = [];
		}
		this.activeConnections[deviceId].push(ws);
	}

	// Remove client from active connections map
	private removeActiveConnection(deviceId: string, ws: WebSocket) {
		this.activeConnections[deviceId] = this.activeConnections[deviceId].filter((client) => client !== ws);
		if (this.activeConnections[deviceId].length === 0) {
			delete this.activeConnections[deviceId];
		}
	}

	// Broadcast data to all clients connected to a specific device
	private broadcastToClients(deviceId: string, data: any) {
		const clients = this.activeConnections[deviceId] || [];
		clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				this.activeDevices[deviceId] = Date.now(); // Update last seen
				client.send(JSON.stringify(data));
			}
		});
	}

	// Function to start emitting data for a device node
	private async startDeviceUpdates(deviceId: string) {
		if (!this.deviceIntervals[deviceId]) {
			this.deviceIntervals[deviceId] = setInterval(async () => {
				const data = {
					deviceId,
					status: DeviceStatus.ACTIVE,
					lastSeen: new Date(),
					timestamp: new Date(),
					value: Math.random() * 100, // Random value for device data
				};

				let device = await Device.findOne({ _id: deviceId });
				if (device) {
					device.lastSeen = data.lastSeen;
					device.status = data.status;
					device.lastValue = data.value;
				} else {
					device = new Device(data);
				}
				await device.save();

				this.broadcastToClients(deviceId, device);

				// Propagate data to connected nodes in the pipeline
				const connections = await this.getPipelineConnections();
				const outputs = connections[deviceId];

				if (outputs && outputs.length > 0) {
					outputs.forEach(async (outputDeviceId) => {
						this.forwardData(outputDeviceId, data.value); // Send data to the next node
					});
				}
			}, 2000); // Emit data every 2 seconds for each device
		}

		this.trackDeviceActivity(deviceId);
	}

	private trackDeviceActivity(deviceId: string) {
		this.activeDevices[deviceId] = Date.now();
		setInterval(async () => {
			const now = Date.now();
			if (now - this.activeDevices[deviceId] > 5000) {
				// 5-second inactivity threshold

				const device = await Device.findOne({ _id: deviceId });
				if (device) {
					device.status = DeviceStatus.INACTIVE;
					await device.save();
				}

				this.broadcastToClients(deviceId, {
					deviceId,
					status: DeviceStatus.INACTIVE,
				});
			}
		}, 5000);
	}

	private async forwardData(_id: string, value: number) {
		const now = new Date();
		const device = await Device.findOne({ _id });
		if (device) {
			device.lastSeen = now;
			device.lastValue = value;
			await device.save();
			this.broadcastToClients(_id, device);

			const connections = await this.getPipelineConnections();
			const outputs = connections[_id];
			if (outputs && outputs.length > 0) {
				outputs.forEach((outputDeviceId) => {
					this.forwardData(outputDeviceId, value);
				});
			}
		}
	}

	// Broadcast a message to all connected clients
	// private broadcastToAllClients(data: any) {
	// 	this.webSocketServer?.clients.forEach((client) => {
	// 		if (client.readyState === WebSocket.OPEN) {
	// 			client.send(JSON.stringify(data));
	// 		}
	// 	});
	// }

	// Function to handle creating a new node
	private async handleCreateNode(ws: WebSocket, nodeData: any) {
		try {
			//Create new device
			const device = new Device({
				name: nodeData.deviceName,
				status: DeviceStatus.ACTIVE,
				lastSeen: new Date(),
				lastValue: Math.random() * 100,
			});

			await device.save();
			// Create the new node
			const newNode = new Node({
				deviceId: device._id, // Assume the node has a deviceId
				label: nodeData.label || 'Unnamed Node',
				position: nodeData.position || { x: 100, y: 100 }, // Default position
			});
			await newNode.save();

			const res = {
				...newNode.toObject(),
				deviceId: device,
			};
			ws.send(JSON.stringify({ type: 'NODE_CREATED', node: res }));
			return device._id.toString();
		} catch (error) {
			console.error('Error creating new node:', error);
			ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to create node' }));
		}
	}

	private initConnectionListener(webSocketServer: WebSocket.Server) {
		webSocketServer.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
			const devices = await Device.find({});

			if (!devices?.length) {
				console.error('No devices found');
			} else {
				devices.forEach((device) => {
					this.addActiveConnection(device._id.toString(), ws);
					this.startDeviceUpdates(device._id.toString()); // Start updates for each device
				});
			}

			ws.on('message', async (message) => {
				const data = JSON.parse(message.toString());
				switch (data.type) {
					case 'CREATE_NODE': {
						console.log('Creating new node:', data.node);
						const deviceId = await this.handleCreateNode(ws, data.node);

						this.addActiveConnection(deviceId!, ws);
						this.startDeviceUpdates(deviceId!);
						break;
					}
					case 'DELETE_EDGE': {
						console.log('Deleting edge:', data);
						const { edgeId } = data;

						// Remove connection from pipeline, if no connections left, delete the pipeline
						const pipeline = await Pipeline.findOne({ 'connections._id': new ObjectId(edgeId) });
						if (pipeline) {
							pipeline.connections = pipeline.connections.filter(
								(connection) => connection._id?.toString() !== edgeId,
							);
							if (pipeline.connections.length === 0) {
								await Pipeline.deleteOne({ _id: pipeline._id });
							} else {
								await pipeline.save();
							}
						}

						console.log('Edge deleted:', edgeId);
						// Send message to clients to delete edge
						ws.send(JSON.stringify({ type: 'EDGE_DELETED', edgeId }));
						break;
					}
					default:
						console.log('Unknown message type:', data.type);
				}
			});

			ws.on('close', () => {
				console.log(`Client disconnected`);
			});
		});
	}

	// Start WebSocket server
	public connect(port: number) {
		if (this.webSocketServer) {
			console.log('WebSocket server is already running.');
			return;
		}

		try {
			console.log('WebSocket server started on port:', port);
			this.webSocketServer = new WebSocket.Server({ port });
			this.initConnectionListener(this.webSocketServer);
		} catch (err) {
			console.error('WebSocket server failed to start:', err);
			throw new Error('WebSocket server failed to start');
		}
	}
}

export const websocketService = new WebsocketService();
