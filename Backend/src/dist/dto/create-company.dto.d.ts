import { Company } from '../types/company.types';
/**
 * Data Transfer Object for creating a new Company Profile.
 */
export type CreateCompanyDTO = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>;
//# sourceMappingURL=create-company.dto.d.ts.map