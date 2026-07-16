import { Request, Response, NextFunction } from 'express';
import { companyService } from '../services/company.service';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import { logger } from '../utils/logger';

/**
 * Controller class handling all HTTP requests for the Company API module.
 * Only handles HTTP-related input/output, delegating logic to CompanyService.
 */
export class CompanyController {
  
  /**
   * Helper method to extract the authenticated companyId from the request context.
   * Throws an error if authorization details are missing.
   */
  private getCompanyId(req: Request): string {
    const companyId = (req as any).user?.companyId;
    if (!companyId) {
      logger.warn('Company endpoint access attempted without authenticated user context.');
      const error = new Error('Unauthorized: Missing company security context.');
      (error as any).statusCode = 401;
      (error as any).errorCode = 'UNAUTHORIZED';
      throw error;
    }
    return companyId;
  }

  /**
   * POST /company - Creates a new company profile document.
   */
  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getCompanyId(req);

      // Validate request payload
      const validationResult = createCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        logger.warn(`Validation failed during company profile creation for ID: ${companyId}`);
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      const createdCompany = await companyService.createCompany(companyId, validationResult.data);
      
      res.status(201).json({
        success: true,
        message: 'Company profile created successfully',
        data: createdCompany,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /company - Retrieves the authenticated company profile document.
   */
  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getCompanyId(req);
      const company = await companyService.getCompanyById(companyId);

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /company - Partially updates the authenticated company profile document.
   */
  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = this.getCompanyId(req);

      // Validate request payload (partial structure validation)
      const validationResult = updateCompanySchema.safeParse(req.body);
      if (!validationResult.success) {
        logger.warn(`Validation failed during company profile update for ID: ${companyId}`);
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      // Check for empty body update request
      if (Object.keys(validationResult.data).length === 0) {
        logger.warn(`Company update request rejected: payload is empty for ID: ${companyId}`);
        res.status(400).json({
          success: false,
          message: 'Update payload cannot be empty',
        });
        return;
      }

      const updatedCompany = await companyService.updateCompany(companyId, validationResult.data);

      res.status(200).json({
        success: true,
        message: 'Company profile updated successfully',
        data: updatedCompany,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const companyController = new CompanyController();
