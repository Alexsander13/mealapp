import { z } from 'zod'

export const profileInitSchema = z.object({ name: z.string().min(1) })
export const profileLoadSchema = z.object({ name: z.string().min(1), publicId: z.string().min(1) })
export const plansCreateSchema = z.object({ publicId: z.string().min(1), peopleCount: z.number().min(1).max(20), name: z.string().optional() })
export const plansRenameSchema = z.object({ name: z.string().min(1) })
export const plansReplaceSchema = z.object({ dayIndex: z.number().min(0).max(6), slot: z.enum(['breakfast','lunch','dinner','snack']), newRecipeId: z.string().min(1) })
