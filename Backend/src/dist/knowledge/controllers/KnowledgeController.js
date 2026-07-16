"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const KnowledgeIndexService_1 = require("../services/KnowledgeIndexService");
const knowledge_validator_1 = require("../validators/knowledge.validator");
const knowledge_errors_1 = require("../errors/knowledge.errors");
const logger_1 = require("../../utils/logger");
const logger = new logger_1.Logger('KnowledgeController');
/**
 * REST controller class handling Express requests for Knowledge Index actions.
 */
class KnowledgeController {
    service;
    constructor(service) {
        this.service = service || new KnowledgeIndexService_1.KnowledgeIndexService();
    }
    /**
     * POST /knowledge/documents
     * Registers a processed document.
     */
    registerDocument = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const documentId = req.body.documentId || `doc-${Date.now()}`;
            const validation = knowledge_validator_1.CreateDocumentSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed.',
                    errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
                });
                return;
            }
            const doc = await this.service.registerDocument(companyId, documentId, validation.data);
            res.status(201).json({
                success: true,
                message: 'Operation completed successfully.',
                data: doc,
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * GET /knowledge/documents/:documentId
     * Retrieves document metadata.
     */
    getDocument = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const { documentId } = req.params;
            const doc = await this.service.getDocument(companyId, documentId);
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: doc,
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * GET /knowledge/documents
     * Lists registered documents with filters.
     */
    listDocuments = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const validation = knowledge_validator_1.ListDocumentsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed.',
                    errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
                });
                return;
            }
            const result = await this.service.listDocuments(companyId, validation.data);
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: {
                    items: result.items,
                    hasMore: !!result.lastVisibleSnapshot,
                },
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * PATCH /knowledge/documents/:documentId/status
     * Updates processing lifecycle status.
     */
    updateStatus = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const { documentId } = req.params;
            const validation = knowledge_validator_1.UpdateStatusSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed.',
                    errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
                });
                return;
            }
            await this.service.updateStatus(companyId, documentId, validation.data.status, validation.data.failureReason);
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: {},
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * GET /knowledge/documents/:documentId/health
     * Calculates document health reports.
     */
    getDocumentHealth = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const { documentId } = req.params;
            const report = await this.service.calculateDocumentHealth(companyId, documentId);
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: report,
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * DELETE /knowledge/documents/:documentId
     * Soft deletes a registered document.
     */
    deleteDocument = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const { documentId } = req.params;
            await this.service.softDeleteDocument(companyId, documentId);
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: {},
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * GET /knowledge/sources
     * Lists administrative knowledge sources.
     */
    listSources = async (req, res) => {
        try {
            const companyId = req.user?.companyId || 'default-company';
            const result = await this.service.listDocuments(companyId, { limit: 100 });
            res.status(200).json({
                success: true,
                message: 'Operation completed successfully.',
                data: {
                    items: result.items.map(d => ({
                        sourceId: d.documentId,
                        filename: d.filename,
                        mimeType: d.mimeType,
                        status: d.status,
                        health: d.health,
                        updatedAt: d.updatedAt,
                    })),
                },
            });
        }
        catch (err) {
            this.handleError(res, err);
        }
    };
    /**
     * Centralized error logger mapping custom error instances to target statuses.
     */
    handleError(res, error) {
        logger.error('API execution failed.', error);
        if (error instanceof knowledge_errors_1.KnowledgeError) {
            const status = error.code === 'DOCUMENT_NOT_FOUND' ? 404 : 400;
            res.status(status).json({
                success: false,
                message: error.message,
                errors: [error.code],
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'An unexpected internal error occurred.',
            errors: ['INTERNAL_SERVER_ERROR'],
        });
    }
}
exports.KnowledgeController = KnowledgeController;
//# sourceMappingURL=KnowledgeController.js.map