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

export const equipmentSchema = z.object({
  id: z.string(),
  equipmentNumber: z.string(),
  name: z.string(),
  category: z.string(),
  serialNumber: z.string().nullable(),
  owner: z.string(),
  acquisitionDate: z.string().nullable(),
  currentMeter: z.number(),
  status: z.string(),
  legalEntityId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Equipment = z.infer<typeof equipmentSchema>;

export const createEquipmentSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().optional(),
  serialNumber: z.string().max(100).optional(),
  owner: z.string().optional(),
  acquisitionDate: z.string().optional(),
  currentMeter: z.number().min(0).optional(),
  legalEntityId: z.string().optional(),
});
export type CreateEquipment = z.infer<typeof createEquipmentSchema>;

export const equipmentAssignmentSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  projectId: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type EquipmentAssignment = z.infer<typeof equipmentAssignmentSchema>;

export const createEquipmentAssignmentSchema = z.object({
  projectId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateEquipmentAssignment = z.infer<typeof createEquipmentAssignmentSchema>;

export const equipmentUtilizationSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  projectId: z.string().nullable(),
  utilizationDate: z.string(),
  availableHours: z.number(),
  operatingHours: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EquipmentUtilization = z.infer<typeof equipmentUtilizationSchema>;

export const equipmentPmSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  triggerType: z.string(),
  dueDate: z.string().nullable(),
  dueMeter: z.number().nullable(),
  scheduledDate: z.string(),
  status: z.string(),
  completedAt: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EquipmentPm = z.infer<typeof equipmentPmSchema>;

export const equipmentBreakdownSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  breakdownDate: z.string(),
  downtimeHours: z.number(),
  costImpact: z.number(),
  description: z.string().nullable(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EquipmentBreakdown = z.infer<typeof equipmentBreakdownSchema>;

export const equipmentUsageSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  projectId: z.string(),
  usageDate: z.string(),
  hours: z.number(),
  costAmount: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z.object({ code: z.string(), name: z.string() }).optional(),
});
export type EquipmentUsage = z.infer<typeof equipmentUsageSchema>;

export const createEquipmentUsageSchema = z.object({
  projectId: z.string(),
  usageDate: z.string().optional(),
  hours: z.number().min(0.1),
  costAmount: z.number().min(0),
  description: z.string().max(500).optional(),
});
export type CreateEquipmentUsage = z.infer<typeof createEquipmentUsageSchema>;
