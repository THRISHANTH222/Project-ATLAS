import { Router } from 'express';
import { KnowledgeController } from '../controllers/KnowledgeController';

const router = Router();
const controller = new KnowledgeController();

// 1. Documents Administration
router.post('/documents', controller.registerDocument);
router.get('/documents', controller.listDocuments);
router.get('/documents/:documentId', controller.getDocument);
router.patch('/documents/:documentId/status', controller.updateStatus);
router.get('/documents/:documentId/health', controller.getDocumentHealth);
router.delete('/documents/:documentId', controller.deleteDocument);

// 2. Knowledge Sources administrative views
router.get('/sources', controller.listSources);

export const knowledgeRouter = router;
export default knowledgeRouter;
