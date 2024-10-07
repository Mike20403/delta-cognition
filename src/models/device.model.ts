import mongoose from 'mongoose';

export enum DeviceStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive',
}

export interface IDevice extends Document {
	name: string;
	status: DeviceStatus;
	lastSeen: Date;
	lastValue?: number; // New properties for relationships
}

const DeviceSchema = new mongoose.Schema({
	name: { type: String },
	status: { type: String, required: true },
	lastSeen: { type: Date, required: true },
	lastValue: { type: Number },
	// New properties for relationships
});

export default mongoose.model<IDevice>('Device', DeviceSchema);
