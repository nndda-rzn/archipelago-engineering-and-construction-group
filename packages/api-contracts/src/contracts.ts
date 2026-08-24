import { z } from 'zod';
import type { Id } from '@aec/shared-types';

/**
 * Kontrak API standar — PRD §23.
 * Satu sumber type FE+BE (dipakai apps/web + apps/api + apps/worker).
 */

/** Standardized error envelope — PRD §23.4 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    correlationId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Standardized pagination — PRD §23.4 */
export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  });
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Query param opsional untuk entity dengan id. */
export const byIdParamsSchema = z.object({
  id: z.string(),
});
export type ByIdParams = z.infer<typeof byIdParamsSchema>;

/** Placeholder health — digunakan apps/web & apps/api. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Auth — local JWT (PRD §26 disesuaikan: Keycloak menyusul). */
export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    displayName: z.string(),
    roles: z.array(z.string()),
  }),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export type { Id };
