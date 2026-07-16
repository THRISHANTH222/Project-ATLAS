import { Request, Response } from 'express';
import { KnowledgeIndexService } from '../services/KnowledgeIndexService';
/**
 * REST controller class handling Express requests for Knowledge Index actions.
 */
export declare class KnowledgeController {
    private readonly service;
    constructor(service?: KnowledgeIndexService);
    /**
     * POST /knowledge/documents
     * Registers a processed document.
     */
    registerDocument: (req: Request, res: Response) => Promise<void>;
    /**
     * GET /knowledge/documents/:documentId
     * Retrieves document metadata.
     */
    getDocument: (req: Request, res: Response) => Promise<void>;
    /**
     * GET /knowledge/documents
     * Lists registered documents with filters.
     */
    listDocuments: (req: Request, res: Response) => Promise<void>;
    /**
     * PATCH /knowledge/documents/:documentId/status
     * Updates processing lifecycle status.
     */
    updateStatus: (req: Request, res: Response) => Promise<void>;
    /**
     * GET /knowledge/documents/:documentId/health
     * Calculates document health reports.
     */
    getDocumentHealth: (req: Request, res: Response) => Promise<void>;
    /**
     * DELETE /knowledge/documents/:documentId
     * Soft deletes a registered document.
     */
    deleteDocument: (req: Request, res: Response) => Promise<void>;
    /**
     * GET /knowledge/sources
     * Lists administrative knowledge sources.
     */
    listSources: (req: Request, res: Response) => Promise<void>;
    /**
     * Centralized error logger mapping custom error instances to target statuses.
     */
    private handleError;
}
//# sourceMappingURL=KnowledgeController.d.ts.map