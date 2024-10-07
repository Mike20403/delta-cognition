import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

const env = process.env.NODE_ENV;
const connectionString = process.env.MONGODB_CONNECTION_STRING;
const mongoDbUserCollection = process.env.MONGODB_USER_COLLECTION;
const envFilename = `.env.${env?.trimEnd()}`;
const wsport = process.env.WSPORT;

if (!env) {
	console.error('NODE_ENV is not set');
	process.exit(1);
}

console.log(`Detected NODE_ENV = ${env}, using ${envFilename}`);

console.log('Looking for environment file at:', path.resolve(envFilename));

try {
	const envFileContent = fs.readFileSync(path.resolve(envFilename), 'utf8');
	console.log('Environment file content:', envFileContent);
} catch (error) {
	console.error('Error reading environment file:', error);
}

if (!fs.existsSync(path.resolve(envFilename))) {
	console.log(`Environment file not found ${envFilename}`);
	console.log(`Please create file ${envFilename} and take examples from .env.example`);
	process.exit(1);
}

config({
	path: envFilename,
});

export const isProduction = env === 'production';

export const envConfig = {
	port: Number(process.env.PORT) || 4000,
	wsport: Number(wsport),
	mongoDBConnectionString: connectionString as string,
	mongoDBUserCollection: mongoDbUserCollection as string,
};
