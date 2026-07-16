"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = exports.CompanyService = void 0;
const firestore_service_1 = require("./firestore.service");
const logger_1 = require("../utils/logger");
const firestore_errors_1 = require("../errors/firestore.errors");
/**
 * Service class handling all company business logic.
 * Interacts with the reusable Firestore service layer.
 */
class CompanyService {
    firestoreService;
    constructor() {
        // Reuses the generic Firestore service for the 'companies' collection
        this.firestoreService = new firestore_service_1.FirestoreService('companies');
    }
    /**
     * Creates a new company profile document.
     * Enforces uniqueness by verifying the company ID does not already exist.
     * @param companyId Authenticated company ID.
     * @param dto Company profile fields.
     * @returns The created Company profile object.
     */
    async createCompany(companyId, dto) {
        logger_1.logger.info(`Attempting to create company profile for ID: ${companyId}`);
        const exists = await this.firestoreService.exists(companyId);
        if (exists) {
            logger_1.logger.warn(`Company creation rejected: ID '${companyId}' already exists.`);
            const error = new Error(`Company profile for ID '${companyId}' already exists.`);
            error.statusCode = 409;
            error.errorCode = 'COMPANY_ALREADY_EXISTS';
            throw error;
        }
        const company = await this.firestoreService.createWithId(companyId, dto);
        logger_1.logger.info(`Successfully created company profile for ID: ${companyId}`);
        return company;
    }
    /**
     * Retrieves the company profile for the specified ID.
     * @param companyId Authenticated company ID.
     * @returns The Company profile object.
     */
    async getCompanyById(companyId) {
        logger_1.logger.info(`Retrieving company profile for ID: ${companyId}`);
        try {
            return await this.firestoreService.getById(companyId);
        }
        catch (error) {
            if (error instanceof firestore_errors_1.DocumentNotFoundError) {
                logger_1.logger.warn(`Company profile search failed: ID '${companyId}' not found.`);
                error.statusCode = 404;
                error.errorCode = 'COMPANY_NOT_FOUND';
            }
            throw error;
        }
    }
    /**
     * Partially updates an existing company profile document.
     * @param companyId Authenticated company ID.
     * @param dto Partial update fields.
     * @returns The updated Company profile object.
     */
    async updateCompany(companyId, dto) {
        logger_1.logger.info(`Updating company profile for ID: ${companyId}`);
        const exists = await this.firestoreService.exists(companyId);
        if (!exists) {
            logger_1.logger.warn(`Company update rejected: ID '${companyId}' not found.`);
            const error = new firestore_errors_1.DocumentNotFoundError('companies', companyId);
            error.statusCode = 404;
            error.errorCode = 'COMPANY_NOT_FOUND';
            throw error;
        }
        await this.firestoreService.update(companyId, dto);
        // Retrieve the newly updated document to return to client
        const updatedCompany = await this.firestoreService.getById(companyId);
        logger_1.logger.info(`Successfully updated company profile for ID: ${companyId}`);
        return updatedCompany;
    }
}
exports.CompanyService = CompanyService;
exports.companyService = new CompanyService();
//# sourceMappingURL=company.service.js.map