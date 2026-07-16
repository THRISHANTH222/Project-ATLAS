/**
 * Interface representing a Company Profile document structure.
 */
export interface Company {
  id?: string; // Document ID (maps to companyId)
  companyName: string;
  organizationType: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo?: string;
  timezone: string;
  country: string;
  state: string;
  city: string;
  createdAt?: any;
  updatedAt?: any;
}
