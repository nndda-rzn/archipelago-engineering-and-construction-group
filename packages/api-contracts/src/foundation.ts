import { z } from 'zod';
import { paginatedResponseSchema } from './core';

/** Siklus hidup master data (FR-FND-001) — cermin `MasterDataStatus`. */
export const legalEntityStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'BLOCKED',
  'INACTIVE',
  'ARCHIVED',
]);
export type LegalEntityStatus = z.infer<typeof legalEntityStatusSchema>;

/** Ringkasan penggunaan lintas domain sebuah legal entity. */
export const legalEntityUsageSchema = z.object({
  projects: z.number(),
  users: z.number(),
  organizations: z.number(),
  chartOfAccounts: z.number(),
  bankAccounts: z.number(),
  periodCloses: z.number(),
  employees: z.number(),
  equipment: z.number(),
  generatedAt: z.string(),
});
export type LegalEntityUsage = z.infer<typeof legalEntityUsageSchema>;

export const legalEntitySchema = z.object({
  id: z.string(),
  code: z.string(),
  legalName: z.string(),
  taxIdentifier: z.string(),
  country: z.string(),
  functionalCurrency: z.string(),
  reportingCurrency: z.string(),
  functionalCurrencyId: z.string().nullable(),
  reportingCurrencyId: z.string().nullable(),
  fiscalCalendar: z.string(),
  status: legalEntityStatusSchema,
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

export const updateLegalEntitySchema = createLegalEntitySchema.partial();
export type UpdateLegalEntity = z.infer<typeof updateLegalEntitySchema>;

export const legalEntityListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['code', 'legalName', 'status', 'country', 'functionalCurrency']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(100).optional(),
  status: legalEntityStatusSchema.optional(),
});
export type LegalEntityListParams = z.infer<typeof legalEntityListParamsSchema>;

export const legalEntityListResponseSchema = paginatedResponseSchema(
  legalEntitySchema.extend({ metrics: legalEntityUsageSchema.optional() }),
);
export type LegalEntityListResponse = z.infer<typeof legalEntityListResponseSchema>;

export const userStatusSchema = z.enum(['INVITED', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'SUSPENDED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const roleAssignmentSchema = z.object({
  code: z.string(),
  name: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
});
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>;

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  status: z.string(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  jobTitle: z.string().nullable(),
  department: z.string().nullable(),
  phone: z.string().nullable(),
  managerId: z.string().nullable(),
  legalEntityId: z.string().nullable(),
  organizationId: z.string().nullable(),
  blockedAt: z.string().nullable(),
  blockedReason: z.string().nullable(),
  legalEntityCode: z.string().nullable(),
  legalEntityName: z.string().nullable(),
  organizationName: z.string().nullable(),
  roles: z.array(z.string()),
  roleDetails: z.array(roleAssignmentSchema),
  activeSessions: z.number(),
});
export type User = z.infer<typeof userSchema>;

export const userStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  blocked: z.number(),
  noRole: z.number(),
  activeSessions: z.number(),
  byRole: z.array(z.object({ code: z.string(), name: z.string(), count: z.number() })),
});
export type UserStats = z.infer<typeof userStatsSchema>;

export const userSessionSchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  status: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
});
export type UserSession = z.infer<typeof userSessionSchema>;

export const loginEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  email: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  reason: z.string().nullable(),
  at: z.string(),
});
export type LoginEvent = z.infer<typeof loginEventSchema>;

export const userActivitySchema = z.object({
  id: z.string(),
  action: z.string(),
  summary: z.string(),
  actorId: z.string().nullable(),
  at: z.string(),
});
export type UserActivity = z.infer<typeof userActivitySchema>;

export const userDetailSchema = z.object({
  user: userSchema.extend({
    employee: z.object({ employeeNumber: z.string(), position: z.string(), department: z.string().nullable(), grade: z.string().nullable() }).nullable().optional(),
  }),
  roles: z.array(z.object({ code: z.string(), name: z.string(), status: z.string(), effectiveFrom: z.string(), effectiveTo: z.string().nullable() })),
  permissions: z.array(z.object({ code: z.string(), resource: z.string(), action: z.string() })),
  sessions: z.array(userSessionSchema),
  recentLogins: z.array(loginEventSchema),
  activity: z.array(userActivitySchema),
});
export type UserDetail = z.infer<typeof userDetailSchema>;

export const userSettingsSchema = z.object({
  userId: z.string(),
  theme: z.string(),
  density: z.string(),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
  legalEntityId: z.string().optional(),
  organizationId: z.string().optional(),
  roleCode: z.string().optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  managerId: z.string().optional(),
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.omit({ username: true, password: true }).partial();
export type UpdateUser = z.infer<typeof updateUserSchema>;

export const userListResponseSchema = paginatedResponseSchema(userSchema);
export type UserListResponse = z.infer<typeof userListResponseSchema>;

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

export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  reason: z.string().nullable(),
  source: z.string(),
  correlationId: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export const auditLogListResponseSchema = paginatedResponseSchema(auditLogSchema);
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;