import { Request, Response } from 'express';
import { KnowledgeIndexService } from '../services/KnowledgeIndexService';
import { CreateDocumentSchema, UpdateStatusSchema, ListDocumentsQuerySchema } from '../validators/knowledge.validator';
import { KnowledgeError } from '../errors/knowledge.errors';
import { Logger } from '../../utils/logger';

const logger = new Logger('KnowledgeController');

/**
 * REST controller class handling Express requests for Knowledge Index actions.
 */
export class KnowledgeController {
  private readonly service: KnowledgeIndexService;

  constructor(service?: KnowledgeIndexService) {
    this.service = service || new KnowledgeIndexService();
  }

  /**
   * POST /knowledge/documents
   * Registers a processed document.
   */
  public registerDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      const documentId = req.body.documentId || `doc-${Date.now()}`;

      const validation = CreateDocumentSchema.safeParse(req.body);
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
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * GET /knowledge/documents/:documentId
   * Retrieves document metadata.
   */
  public getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      const { documentId } = req.params;

      const doc = await this.service.getDocument(companyId, documentId);
      res.status(200).json({
        success: true,
        message: 'Operation completed successfully.',
        data: doc,
      });
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * GET /knowledge/documents
   * Lists registered documents with filters.
   */
  public listDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      
      const validation = ListDocumentsQuerySchema.safeParse(req.query);
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
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * PATCH /knowledge/documents/:documentId/status
   * Updates processing lifecycle status.
   */
  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      const { documentId } = req.params;

      const validation = UpdateStatusSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed.',
          errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        });
        return;
      }

      await this.service.updateStatus(
        companyId,
        documentId,
        validation.data.status,
        validation.data.failureReason
      );

      res.status(200).json({
        success: true,
        message: 'Operation completed successfully.',
        data: {},
      });
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * GET /knowledge/documents/:documentId/health
   * Calculates document health reports.
   */
  public getDocumentHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      const { documentId } = req.params;

      const report = await this.service.calculateDocumentHealth(companyId, documentId);
      res.status(200).json({
        success: true,
        message: 'Operation completed successfully.',
        data: report,
      });
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * DELETE /knowledge/documents/:documentId
   * Soft deletes a registered document.
   */
  public deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';
      const { documentId } = req.params;

      await this.service.softDeleteDocument(companyId, documentId);
      res.status(200).json({
        success: true,
        message: 'Operation completed successfully.',
        data: {},
      });
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * GET /knowledge/sources
   * Lists administrative knowledge sources.
   */
  public listSources = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyId = (req as any).user?.companyId || 'default-company';

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
    } catch (err: any) {
      this.handleError(res, err);
    }
  };

  /**
   * Centralized error logger mapping custom error instances to target statuses.
   */
  private handleError(res: Response, error: any): void {
    logger.error('API execution failed.', error);

    if (error instanceof KnowledgeError) {
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
