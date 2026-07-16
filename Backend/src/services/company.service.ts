import { FirestoreService } from './firestore.service';
import { Company } from '../types/company.types';
import { CreateCompanyDTO } from '../dto/create-company.dto';
import { UpdateCompanyDTO } from '../dto/update-company.dto';
import { logger } from '../utils/logger';
import { DocumentNotFoundError } from '../errors/firestore.errors';

/**
 * Service class handling all company business logic.
 * Interacts with the reusable Firestore service layer.
 */
export class CompanyService {
  private firestoreService: FirestoreService<Company>;

  constructor() {
    // Reuses the generic Firestore service for the 'companies' collection
    this.firestoreService = new FirestoreService<Company>('companies');
  }

  /**
   * Creates a new company profile document.
   * Enforces uniqueness by verifying the company ID does not already exist.
   * @param companyId Authenticated company ID.
   * @param dto Company profile fields.
   * @returns The created Company profile object.
   */
  public async createCompany(companyId: string, dto: CreateCompanyDTO): Promise<Company> {
    logger.info(`Attempting to create company profile for ID: ${companyId}`);

    const exists = await this.firestoreService.exists(companyId);
    if (exists) {
      logger.warn(`Company creation rejected: ID '${companyId}' already exists.`);
      const error = new Error(`Company profile for ID '${companyId}' already exists.`);
      (error as any).statusCode = 409;
      (error as any).errorCode = 'COMPANY_ALREADY_EXISTS';
      throw error;
    }

    const company = await this.firestoreService.createWithId(companyId, dto);
    logger.info(`Successfully created company profile for ID: ${companyId}`);
    return company;
  }

  /**
   * Retrieves the company profile for the specified ID.
   * @param companyId Authenticated company ID.
   * @returns The Company profile object.
   */
  public async getCompanyById(companyId: string): Promise<Company> {
    logger.info(`Retrieving company profile for ID: ${companyId}`);
    try {
      return await this.firestoreService.getById(companyId);
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        logger.warn(`Company profile search failed: ID '${companyId}' not found.`);
        (error as any).statusCode = 404;
        (error as any).errorCode = 'COMPANY_NOT_FOUND';
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
  public async updateCompany(companyId: string, dto: UpdateCompanyDTO): Promise<Company> {
    logger.info(`Updating company profile for ID: ${companyId}`);

    const exists = await this.firestoreService.exists(companyId);
    if (!exists) {
      logger.warn(`Company update rejected: ID '${companyId}' not found.`);
      const error = new DocumentNotFoundError('companies', companyId);
      (error as any).statusCode = 404;
      (error as any).errorCode = 'COMPANY_NOT_FOUND';
      throw error;
    }

    await this.firestoreService.update(companyId, dto);
    
    // Retrieve the newly updated document to return to client
    const updatedCompany = await this.firestoreService.getById(companyId);
    logger.info(`Successfully updated company profile for ID: ${companyId}`);
    return updatedCompany;
  }
}
export const companyService = new CompanyService();
