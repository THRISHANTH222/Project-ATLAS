"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyController = exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
const company_validator_1 = require("../validators/company.validator");
const logger_1 = require("../utils/logger");
/**
 * Controller class handling all HTTP requests for the Company API module.
 * Only handles HTTP-related input/output, delegating logic to CompanyService.
 */
class CompanyController {
    /**
     * Helper method to extract the authenticated companyId from the request context.
     * Throws an error if authorization details are missing.
     */
    getCompanyId(req) {
        const companyId = req.user?.companyId;
        if (!companyId) {
            logger_1.logger.warn('Company endpoint access attempted without authenticated user context.');
            const error = new Error('Unauthorized: Missing company security context.');
            error.statusCode = 401;
            error.errorCode = 'UNAUTHORIZED';
            throw error;
        }
        return companyId;
    }
    /**
     * POST /company - Creates a new company profile document.
     */
    create = async (req, res, next) => {
        try {
            const companyId = this.getCompanyId(req);
            // Validate request payload
            const validationResult = company_validator_1.createCompanySchema.safeParse(req.body);
            if (!validationResult.success) {
                logger_1.logger.warn(`Validation failed during company profile creation for ID: ${companyId}`);
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
            const createdCompany = await company_service_1.companyService.createCompany(companyId, validationResult.data);
            res.status(201).json({
                success: true,
                message: 'Company profile created successfully',
                data: createdCompany,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /company - Retrieves the authenticated company profile document.
     */
    get = async (req, res, next) => {
        try {
            const companyId = this.getCompanyId(req);
            const company = await company_service_1.companyService.getCompanyById(companyId);
            res.status(200).json({
                success: true,
                data: company,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * PATCH /company - Partially updates the authenticated company profile document.
     */
    update = async (req, res, next) => {
        try {
            const companyId = this.getCompanyId(req);
            // Validate request payload (partial structure validation)
            const validationResult = company_validator_1.updateCompanySchema.safeParse(req.body);
            if (!validationResult.success) {
                logger_1.logger.warn(`Validation failed during company profile update for ID: ${companyId}`);
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
                logger_1.logger.warn(`Company update request rejected: payload is empty for ID: ${companyId}`);
                res.status(400).json({
                    success: false,
                    message: 'Update payload cannot be empty',
                });
                return;
            }
            const updatedCompany = await company_service_1.companyService.updateCompany(companyId, validationResult.data);
            res.status(200).json({
                success: true,
                message: 'Company profile updated successfully',
                data: updatedCompany,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CompanyController = CompanyController;
exports.companyController = new CompanyController();
//# sourceMappingURL=company.controller.js.map