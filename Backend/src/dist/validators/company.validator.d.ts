import { z } from 'zod';
/**
 * Validation schema for creating a company profile.
 * Verifies email, phone, URL format, lengths, and non-empty values.
 */
export declare const createCompanySchema: z.ZodObject<{
    companyName: z.ZodString;
    organizationType: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    address: z.ZodString;
    website: z.ZodString;
    logo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    timezone: z.ZodString;
    country: z.ZodString;
    state: z.ZodString;
    city: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyName: string;
    organizationType: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    timezone: string;
    country: string;
    state: string;
    city: string;
    logo?: string | undefined;
}, {
    companyName: string;
    organizationType: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    timezone: string;
    country: string;
    state: string;
    city: string;
    logo?: string | undefined;
}>;
/**
 * Validation schema for updating a company profile.
 * Supports partial payloads.
 */
export declare const updateCompanySchema: z.ZodObject<{
    companyName: z.ZodOptional<z.ZodString>;
    organizationType: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    website: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    timezone: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companyName?: string | undefined;
    organizationType?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    website?: string | undefined;
    logo?: string | undefined;
    timezone?: string | undefined;
    country?: string | undefined;
    state?: string | undefined;
    city?: string | undefined;
}, {
    companyName?: string | undefined;
    organizationType?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    website?: string | undefined;
    logo?: string | undefined;
    timezone?: string | undefined;
    country?: string | undefined;
    state?: string | undefined;
    city?: string | undefined;
}>;
//# sourceMappingURL=company.validator.d.ts.map