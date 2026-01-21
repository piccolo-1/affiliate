import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

// Validation middleware factory
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(200).optional(),
  referralCode: z.string().optional()
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(200).optional().nullable(),
  payoutMethod: z.enum(['paypal', 'wire', 'crypto', 'check']).optional(),
  payoutDetails: z.string().max(1000).optional().nullable(),
  minimumPayout: z.number().min(0).max(10000).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

// ============================================
// Offer Schemas
// ============================================

export const createOfferSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url('Invalid URL'),
  previewUrl: z.string().url().optional().nullable(),
  category: z.string().max(100).optional(),
  vertical: z.enum(['nutra', 'gaming', 'finance', 'dating', 'ecommerce', 'crypto', 'sweepstakes', 'leadgen', 'software', 'other']).optional(),
  payoutType: z.enum(['cpa', 'cpl', 'cpc', 'cpm', 'cpi', 'revshare']).optional(),
  payoutAmount: z.number().min(0),
  revenueAmount: z.number().min(0).optional(),
  countries: z.array(z.string().length(2)).optional(),
  allowedTraffic: z.array(z.string()).optional(),
  restrictedTraffic: z.array(z.string()).optional(),
  conversionCap: z.number().int().positive().optional().nullable(),
  dailyCap: z.number().int().positive().optional().nullable(),
  monthlyCap: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
  trackingDomain: z.string().max(200).optional()
});

export const updateOfferSchema = createOfferSchema.partial().extend({
  status: z.enum(['active', 'paused', 'expired', 'pending']).optional()
});

// ============================================
// Admin Schemas
// ============================================

export const updateUserStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended'])
});

export const assignManagerSchema = z.object({
  managerId: z.string().uuid().optional().nullable()
});

export const createManagerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  skype: z.string().max(100).optional(),
  telegram: z.string().max(100).optional()
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['affiliate', 'advertiser', 'manager', 'admin']).optional()
});

export const updateApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  customPayout: z.number().min(0).optional()
});

export const updateConversionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'reversed']),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
});

export const createPayoutSchema = z.object({
  affiliateId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['paypal', 'wire', 'crypto', 'check']).optional(),
  notes: z.string().max(1000).optional()
});

export const updatePayoutSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  transactionId: z.string().max(200).optional()
});

// ============================================
// Tracking Link Schemas
// ============================================

export const createTrackingLinkSchema = z.object({
  offerId: z.string().uuid(),
  name: z.string().max(200).optional(),
  defaultSub1: z.string().max(200).optional(),
  defaultSub2: z.string().max(200).optional(),
  defaultSub3: z.string().max(200).optional(),
  defaultSub4: z.string().max(200).optional(),
  defaultSub5: z.string().max(200).optional()
});

// ============================================
// Postback Schemas
// ============================================

export const createPostbackSchema = z.object({
  offerId: z.string().uuid().optional().nullable(),
  url: z.string().url('Invalid URL'),
  eventType: z.enum(['conversion', 'lead', 'sale', 'install']).optional(),
  method: z.enum(['GET', 'POST']).optional()
});

// ============================================
// Query Parameter Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});
