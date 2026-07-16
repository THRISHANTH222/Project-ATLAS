"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanySchema = exports.createCompanySchema = void 0;
const zod_1 = require("zod");
/**
 * Validation schema for creating a company profile.
 * Verifies email, phone, URL format, lengths, and non-empty values.
 */
exports.createCompanySchema = zod_1.z.object({
    companyName: zod_1.z.string()
        .trim()
        .min(1, { message: 'Company name is required and cannot be empty.' })
        .max(100, { message: 'Company name cannot exceed 100 characters.' }),
    organizationType: zod_1.z.string()
        .trim()
        .min(1, { message: 'Organization type is required.' }),
    email: zod_1.z.string()
        .trim()
        .email({ message: 'Invalid email address format.' }),
    phone: zod_1.z.string()
        .trim()
        .min(5, { message: 'Phone number must be at least 5 characters.' })
        .max(20, { message: 'Phone number cannot exceed 20 characters.' })
        .regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone number format.' }),
    address: zod_1.z.string()
        .trim()
        .min(1, { message: 'Address is required.' }),
    website: zod_1.z.string()
        .trim()
        .url({ message: 'Invalid website URL format (must start with http:// or https://).' }),
    logo: zod_1.z.string()
        .trim()
        .url({ message: 'Invalid logo URL format.' })
        .optional()
        .or(zod_1.z.literal('')),
    timezone: zod_1.z.string()
        .trim()
        .min(1, { message: 'Timezone is required.' }),
    country: zod_1.z.string()
        .trim()
        .min(1, { message: 'Country is required.' }),
    state: zod_1.z.string()
        .trim()
        .min(1, { message: 'State is required.' }),
    city: zod_1.z.string()
        .trim()
        .min(1, { message: 'City is required.' }),
});
/**
 * Validation schema for updating a company profile.
 * Supports partial payloads.
 */
exports.updateCompanySchema = exports.createCompanySchema.partial();
//# sourceMappingURL=company.validator.js.map