import { Company } from '../types/company.types';
import { CreateCompanyDTO } from '../dto/create-company.dto';
import { UpdateCompanyDTO } from '../dto/update-company.dto';
/**
 * Service class handling all company business logic.
 * Interacts with the reusable Firestore service layer.
 */
export declare class CompanyService {
    private firestoreService;
    constructor();
    /**
     * Creates a new company profile document.
     * Enforces uniqueness by verifying the company ID does not already exist.
     * @param companyId Authenticated company ID.
     * @param dto Company profile fields.
     * @returns The created Company profile object.
     */
    createCompany(companyId: string, dto: CreateCompanyDTO): Promise<Company>;
    /**
     * Retrieves the company profile for the specified ID.
     * @param companyId Authenticated company ID.
     * @returns The Company profile object.
     */
    getCompanyById(companyId: string): Promise<Company>;
    /**
     * Partially updates an existing company profile document.
     * @param companyId Authenticated company ID.
     * @param dto Partial update fields.
     * @returns The updated Company profile object.
     */
    updateCompany(companyId: string, dto: UpdateCompanyDTO): Promise<Company>;
}
export declare const companyService: CompanyService;
//# sourceMappingURL=company.service.d.ts.map