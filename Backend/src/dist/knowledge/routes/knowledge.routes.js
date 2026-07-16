"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeRouter = void 0;
const express_1 = require("express");
const KnowledgeController_1 = require("../controllers/KnowledgeController");
const router = (0, express_1.Router)();
const controller = new KnowledgeController_1.KnowledgeController();
// 1. Documents Administration
router.post('/documents', controller.registerDocument);
router.get('/documents', controller.listDocuments);
router.get('/documents/:documentId', controller.getDocument);
router.patch('/documents/:documentId/status', controller.updateStatus);
router.get('/documents/:documentId/health', controller.getDocumentHealth);
router.delete('/documents/:documentId', controller.deleteDocument);
// 2. Knowledge Sources administrative views
router.get('/sources', controller.listSources);
exports.knowledgeRouter = router;
exports.default = exports.knowledgeRouter;
//# sourceMappingURL=knowledge.routes.js.map