import { Request, Response, NextFunction } from 'express';
/**
 * Controller class handling all HTTP requests for the Company API module.
 * Only handles HTTP-related input/output, delegating logic to CompanyService.
 */
export declare class CompanyController {
    /**
     * Helper method to extract the authenticated companyId from the request context.
     * Throws an error if authorization details are missing.
     */
    private getCompanyId;
    /**
     * POST /company - Creates a new company profile document.
     */
    create: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * GET /company - Retrieves the authenticated company profile document.
     */
    get: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * PATCH /company - Partially updates the authenticated company profile document.
     */
    update: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const companyController: CompanyController;
//# sourceMappingURL=company.controller.d.ts.map