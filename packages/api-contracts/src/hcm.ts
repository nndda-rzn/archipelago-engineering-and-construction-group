import { z } from 'zod';

export const employeeSchema = z.object({
  id: z.string(),
  employeeNumber: z.string(),
  userId: z.string().nullable(),
  legalEntityId: z.string(),
  name: z.string(),
  position: z.string(),
  grade: z.string().nullable(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  costCenter: z.string().nullable(),
  managerId: z.string().nullable(),
  status: z.string(),
  joinDate: z.string().nullable(),
  leaveDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  legalEntity: z.object({ code: z.string(), legalName: z.string() }).optional(),
  manager: z.object({ name: z.string() }).nullable().optional(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const createEmployeeSchema = z.object({
  userId: z.string().optional(),
  legalEntityId: z.string(),
  name: z.string().min(2).max(200),
  position: z.string().min(2).max(100),
  grade: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  costCenter: z.string().max(100).optional(),
  managerId: z.string().optional(),
  joinDate: z.string().optional(),
});
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;

export const projectAssignmentSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  projectId: z.string(),
  role: z.string().nullable(),
  allocationPercent: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.string(),
  exceptionApproved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type ProjectAssignment = z.infer<typeof projectAssignmentSchema>;

export const createProjectAssignmentSchema = z.object({
  projectId: z.string(),
  role: z.string().max(100).optional(),
  allocationPercent: z.number().min(1).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  exceptionApproved: z.boolean().optional(),
});
export type CreateProjectAssignment = z.infer<typeof createProjectAssignmentSchema>;

export const timesheetSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  workDate: z.string(),
  hours: z.number(),
  activity: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  employee: z.object({ name: z.string() }).optional(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type Timesheet = z.infer<typeof timesheetSchema>;

export const createTimesheetSchema = z.object({
  employeeId: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().optional(),
  workDate: z.string().optional(),
  hours: z.number().min(0.5).max(24),
  activity: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
export type CreateTimesheet = z.infer<typeof createTimesheetSchema>;
