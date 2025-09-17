import { z } from 'zod'

// Helper schemas
const emailSchema = z.string().email('Invalid email format')
const uuidSchema = z.string().uuid('Invalid UUID format')
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color format')

// Authentication schemas
export const magicLinkRequestSchema = z.object({
  email: emailSchema
})

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, 'Token is required')
})

// API Key schemas
export const createApiKeySchema = z.object({
  label: z.string()
    .min(1, 'Label is required')
    .max(50, 'Label must be 50 characters or less')
    .trim()
})

// Board schemas
export const createBoardSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  color: hexColorSchema.default('#22c55e'),
  icon: z.string()
    .optional()
    .nullable()
})

export const updateBoardSchema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or less')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  color: hexColorSchema.optional(),
  icon: z.string()
    .optional()
    .nullable()
})

// Check-in schemas
export const createCheckInSchema = z.object({
  board_id: uuidSchema,
  date: dateSchema.refine((date) => {
    const inputDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return inputDate <= tomorrow
  }, 'Date cannot be more than 1 day in the future'),
  completed: z.boolean(),
  notes: z.string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable()
})

export const updateCheckInSchema = z.object({
  completed: z.boolean().optional(),
  notes: z.string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable()
})

// Query parameter schemas
export const boardListQuerySchema = z.object({
  include_archived: z.string()
    .optional()
    .transform(val => val === 'true')
    .default('false')
    .transform(val => val === true)
})

export const checkInListQuerySchema = z.object({
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional()
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, 'Start date must be before or equal to end date')

// Generic validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      throw new ValidationError(
        'Validation failed',
        formattedErrors
      )
    }
    throw error
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Sanitization helpers
export function sanitizeInput(input: string): string {
  return input.trim()
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove potential script tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

// URL parameter validation
export function validateUUID(id: string): string {
  const result = uuidSchema.safeParse(id)
  if (!result.success) {
    throw new ValidationError('Invalid ID format', [
      { field: 'id', message: 'Must be a valid UUID' }
    ])
  }
  return result.data
}

export function validatePagination(params: {
  page?: string
  limit?: string
}): { page: number; limit: number } {
  const pageSchema = z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Page must be greater than 0')
    .default('1')

  const limitSchema = z.string()
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .default('20')

  return {
    page: pageSchema.parse(params.page || '1'),
    limit: limitSchema.parse(params.limit || '20')
  }
}