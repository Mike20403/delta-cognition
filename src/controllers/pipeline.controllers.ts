import { Pipeline, Node } from '../models/pipeline.model';
import { Request, Response } from 'express';
import Device, { DeviceStatus } from '../models/device.model';

export const createOrUpdatePipelinesController = async (req: Request, res: Response) => {
	const { name, sourceNodeId, targetNodeId } = req.body;
	// fine pipeline that have nodes array includes  source or target node id
	const pipeline = await Pipeline.findOne({
		$or: [{ nodes: sourceNodeId }, { nodes: targetNodeId }],
	});

	// if exist pipeline update it
	if (pipeline) {
		// push not exist nodes
		if (!pipeline.nodes.includes(sourceNodeId)) {
			pipeline.nodes.push(sourceNodeId);
		}
		if (!pipeline.nodes.includes(targetNodeId)) {
			pipeline.nodes.push(targetNodeId);
		}
		pipeline.connections.push({ from: sourceNodeId, to: targetNodeId });
		await pipeline.save();
		return res.json(pipeline);
	} else {
		// if not exist create new pipeline
		const newPipeline = new Pipeline({
			name: name,
			nodes: [sourceNodeId, targetNodeId],
			connections: [{ from: sourceNodeId, to: targetNodeId }],
		});
		await newPipeline.save();
		return res.json(newPipeline);
	}
};
export const getNodesController = async (req: Request, res: Response) => {
	const nodes = await Node.find().populate('deviceId');
	res.json(nodes);
};

export const createNodesController = async (req: Request, res: Response) => {
	const { deviceName, label, position } = req.body;
	const device = new Device({
		name: deviceName,
		status: DeviceStatus.ACTIVE,
		lastSeen: new Date(),
	});

	await device.save();

	const node = new Node({
		label,
		position,
		deviceId: device._id,
	});

	await node.save();

	res.json(node);
};

export const updateNodesController = async (req: Request, res: Response) => {
	const { position } = req.body;
	const { nodeId } = req.params;

	const node = await Node.findOne({ _id: nodeId });
	if (node) {
		node.position = position;
		await node.save();
	}
	res.json(node);
};

export const updateEdgesController = async (req: Request, res: Response) => {
	const { pipelineId } = req.params;
	const { name, nodes, connections } = req.body;
	// const pipeline = await Pipeline({ _id: pipelineId });
};

export const getPipelinesController = async (req: Request, res: Response) => {
	const pipelines = await Pipeline.find().populate('nodes.deviceId');
	res.json(pipelines);
};

export const getDeviceTimeseriesDataController = async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	const deviceData = await Device.find({ deviceId }).sort({ timestamp: -1 });
	res.json(deviceData);
};
