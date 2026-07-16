import { z } from 'zod';

/**
 * Validation schema for creating a company profile.
 * Verifies email, phone, URL format, lengths, and non-empty values.
 */
export const createCompanySchema = z.object({
  companyName: z.string()
    .trim()
    .min(1, { message: 'Company name is required and cannot be empty.' })
    .max(100, { message: 'Company name cannot exceed 100 characters.' }),
  organizationType: z.string()
    .trim()
    .min(1, { message: 'Organization type is required.' }),
  email: z.string()
    .trim()
    .email({ message: 'Invalid email address format.' }),
  phone: z.string()
    .trim()
    .min(5, { message: 'Phone number must be at least 5 characters.' })
    .max(20, { message: 'Phone number cannot exceed 20 characters.' })
    .regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone number format.' }),
  address: z.string()
    .trim()
    .min(1, { message: 'Address is required.' }),
  website: z.string()
    .trim()
    .url({ message: 'Invalid website URL format (must start with http:// or https://).' }),
  logo: z.string()
    .trim()
    .url({ message: 'Invalid logo URL format.' })
    .optional()
    .or(z.literal('')),
  timezone: z.string()
    .trim()
    .min(1, { message: 'Timezone is required.' }),
  country: z.string()
    .trim()
    .min(1, { message: 'Country is required.' }),
  state: z.string()
    .trim()
    .min(1, { message: 'State is required.' }),
  city: z.string()
    .trim()
    .min(1, { message: 'City is required.' }),
});

/**
 * Validation schema for updating a company profile.
 * Supports partial payloads.
 */
export const updateCompanySchema = createCompanySchema.partial();
