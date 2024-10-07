import { Router } from 'express';
import { wrapRequestHandler } from '~/utils/handlers';
import {
	createNodesController,
	createOrUpdatePipelinesController,
	getDeviceTimeseriesDataController,
	getNodesController,
	getPipelinesController,
	updateEdgesController,
	updateNodesController,
} from '~/controllers/pipeline.controllers';

const pipelineRouter = Router();

pipelineRouter.post('/api/nodes', wrapRequestHandler(createNodesController));

pipelineRouter.get('/api/nodes', wrapRequestHandler(getNodesController));
pipelineRouter.post('/api/pipelines', wrapRequestHandler(createOrUpdatePipelinesController));

pipelineRouter.get('/api/pipelines', wrapRequestHandler(getPipelinesController));

pipelineRouter.put('/api/pipelines/edges', wrapRequestHandler(updateEdgesController));

pipelineRouter.put('/api/nodes/:nodeId', wrapRequestHandler(updateNodesController));
// pipelineRouter.delete('/api/pipelines/:nodeId', wrapRequestHandler(deletePipelineController));

pipelineRouter.get('/api/devices/:deviceId', wrapRequestHandler(getDeviceTimeseriesDataController));
export default pipelineRouter;
