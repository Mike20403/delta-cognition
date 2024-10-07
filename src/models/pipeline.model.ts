import mongoose, { Document, ObjectId } from 'mongoose';

export interface IPipeline extends Document {
	name: string;
	nodes: ObjectId[];
	connections: IConnection[];
}

export interface INode extends Document {
	label: string;
	position: { x: number; y: number };
	deviceId: mongoose.Schema.Types.ObjectId; // Reference to the Device model
}

export interface IConnection {
	_id?: string;
	from: string;
	to: string;
}

// Updated NodeSchema to reference the Device model
const NodeSchema = new mongoose.Schema({
	label: { type: String, required: true },
	position: {
		x: { type: Number, required: true },
		y: { type: Number, required: true },
	},
	deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true }, // Refers to Device model
});

const PipelineSchema = new mongoose.Schema({
	name: { type: String, required: true },
	nodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Node' }], // Reference to the Node model
	connections: [
		{ from: { type: String, required: true }, to: { type: String, required: true } }, // Connections between nodes
	],
});

export const Node = mongoose.model<INode>('Node', NodeSchema);
export const Pipeline = mongoose.model<IPipeline>('Pipeline', PipelineSchema);
