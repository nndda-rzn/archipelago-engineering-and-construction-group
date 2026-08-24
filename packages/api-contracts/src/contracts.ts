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

/** Legal entity — FR-FND-001. */
export const legalEntitySchema = z.object({
  id: z.string(),
  code: z.string(),
  legalName: z.string(),
  taxIdentifier: z.string(),
  country: z.string(),
  functionalCurrency: z.string(),
  reportingCurrency: z.string(),
  fiscalCalendar: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LegalEntity = z.infer<typeof legalEntitySchema>;

export const createLegalEntitySchema = z.object({
  code: z.string().min(2).max(20),
  legalName: z.string().min(2).max(200),
  taxIdentifier: z.string().min(2).max(50),
  country: z.string().length(2),
  functionalCurrency: z.string().length(3).default('IDR'),
  reportingCurrency: z.string().length(3).default('IDR'),
});
export type CreateLegalEntity = z.infer<typeof createLegalEntitySchema>;

/** List legal entity (server pagination/sort — PRD §22, §23.4). */
export const legalEntityListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['code', 'legalName', 'status', 'country', 'functionalCurrency']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(100).optional(),
});
export type LegalEntityListParams = z.infer<typeof legalEntityListParamsSchema>;

export const legalEntityListResponseSchema = paginatedResponseSchema(legalEntitySchema);
export type LegalEntityListResponse = z.infer<typeof legalEntityListResponseSchema>;

/** User — FR-FND-003/004. */
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  status: z.string(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  roles: z.array(z.string()),
});
export type User = z.infer<typeof userSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
  legalEntityId: z.string().optional(),
  roleCode: z.string().optional(),
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const userListResponseSchema = paginatedResponseSchema(userSchema);
export type UserListResponse = z.infer<typeof userListResponseSchema>;

/** Role — FR-FND-004. */
export const roleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
});
export type Role = z.infer<typeof roleSchema>;

export const roleWithPermissionsSchema = roleSchema.extend({
  _count: z.object({ userRoles: z.number() }),
  permissions: z.array(
    z.object({
      permission: z.object({ code: z.string(), resource: z.string(), action: z.string() }),
    }),
  ),
});
export type RoleWithPermissions = z.infer<typeof roleWithPermissionsSchema>;

export const createRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});
export type CreateRole = z.infer<typeof createRoleSchema>;

export const assignPermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});
export type AssignPermissions = z.infer<typeof assignPermissionsSchema>;

export type { Id };
