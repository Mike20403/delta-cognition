import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { defaultErrorHandler } from '~/middlewares/error.middlewares';
import mongooseDBService from './services/mongoose-db.services';
import { envConfig } from './constants/config';
import { websocketService } from './services/websocket.services';
import pipelineRouter from './routes/pipeline.routes';

mongooseDBService.connectDB();

const app = express();

// Middleware for parsing JSON bodies
app.use(express.json());

const corsOptions: CorsOptions = {
	origin: '*',
};

app.use(cors(corsOptions));

// Start websocket server

websocketService.connect(envConfig.wsport);

// Routes
app.use('/', pipelineRouter);

// Error handling middleware
app.use(defaultErrorHandler);

// Root route
app.get('/', (req: Request, res: Response) => {
	res.send('Hello, TypeScript with Express!');
});

// Start the server
app.listen(envConfig.port, () => {
	console.log(`Server is running on http://localhost:${envConfig.port}`);
});
