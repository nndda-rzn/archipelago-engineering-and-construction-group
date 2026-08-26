import { z } from 'zod';

// FR-CON-001: Work package
export const workPackageSchema = z.object({
  id: z.string(),
  wpNumber: z.string(),
  projectId: z.string(),
  wbsItemId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  scope: z.string().nullable(),
  plannedQty: z.number(),
  unit: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  wbs: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
  latestProgress: z.number().nullable().optional(),
});
export type WorkPackage = z.infer<typeof workPackageSchema>;

export const createWorkPackageSchema = z.object({
  projectId: z.string(),
  wbsItemId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  scope: z.string().max(500).optional(),
  plannedQty: z.number().min(0.01),
  unit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateWorkPackage = z.infer<typeof createWorkPackageSchema>;

export const workPackageListResponseSchema = z.object({
  items: z.array(workPackageSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type WorkPackageListResponse = z.infer<typeof workPackageListResponseSchema>;

// FR-CON-004: Progress per work package
export const workPackageProgressSchema = z.object({
  id: z.string(),
  workPackageId: z.string(),
  progressDate: z.string(),
  physicalProgress: z.number(),
  achievedQty: z.number(),
  note: z.string().nullable(),
  measuredBy: z.string(),
  createdAt: z.string(),
});
export type WorkPackageProgress = z.infer<typeof workPackageProgressSchema>;

export const createProgressSchema = z.object({
  physicalProgress: z.number().min(0).max(100),
  achievedQty: z.number().min(0),
  note: z.string().max(500).optional(),
  measuredBy: z.string().min(2).max(100),
  progressDate: z.string().optional(),
});
export type CreateProgress = z.infer<typeof createProgressSchema>;

// FR-CON-003: Daily report
export const dailyReportSchema = z.object({
  id: z.string(),
  drNumber: z.string(),
  projectId: z.string(),
  reportDate: z.string(),
  weather: z.string().nullable(),
  temperatureC: z.number().nullable(),
  summary: z.string(),
  issues: z.string().nullable(),
  hseNote: z.string().nullable(),
  qualityNote: z.string().nullable(),
  manpowerTotal: z.number(),
  equipmentList: z.string().nullable(),
  materialList: z.string().nullable(),
  status: z.string(),
  reportedBy: z.string(),
  createdAt: z.string(),
  manpowerLines: z.array(
    z.object({
      id: z.string(),
      trade: z.string(),
      manpowerCount: z.number(),
      hoursWorked: z.number(),
      note: z.string().nullable(),
    }),
  ),
});
export type DailyReport = z.infer<typeof dailyReportSchema>;

export const createDailyReportSchema = z.object({
  projectId: z.string(),
  reportDate: z.string().optional(),
  weather: z.string().optional(),
  temperatureC: z.number().optional(),
  summary: z.string().min(5).max(2000),
  issues: z.string().max(2000).optional(),
  hseNote: z.string().max(2000).optional(),
  qualityNote: z.string().max(2000).optional(),
  equipmentList: z.string().max(1000).optional(),
  materialList: z.string().max(1000).optional(),
  manpowerLines: z.array(
    z.object({
      trade: z.string().min(2).max(50),
      manpowerCount: z.number().min(1).max(500),
      hoursWorked: z.number().min(0).max(24),
      note: z.string().max(200).optional(),
    }),
  ).optional(),
});
export type CreateDailyReport = z.infer<typeof createDailyReportSchema>;

export const dailyReportListResponseSchema = z.object({
  items: z.array(dailyReportSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type DailyReportListResponse = z.infer<typeof dailyReportListResponseSchema>;

// FR-CON-005: Commissioning system (hierarkis)
export const commissioningSystemSchema: z.ZodType<{
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  level: string;
  status: string;
  remark: string | null;
  children?: CommissioningSystem[];
}> = z.object({
  id: z.string(),
  projectId: z.string(),
  parentId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  level: z.string(),
  status: z.string(),
  remark: z.string().nullable(),
  children: z.array(z.lazy(() => commissioningSystemSchema)).optional(),
});
export type CommissioningSystem = z.infer<typeof commissioningSystemSchema>;

export const createCommissioningSchema = z.object({
  projectId: z.string(),
  parentId: z.string().optional(),
  code: z.string().min(1).max(30),
  name: z.string().min(2).max(200),
  level: z.enum(['PLANT', 'SYSTEM', 'SUBSYSTEM', 'EQUIPMENT']),
  remark: z.string().max(500).optional(),
});
export type CreateCommissioning = z.infer<typeof createCommissioningSchema>;

// FR-CON-006: Handover package
export const handoverPackageSchema = z.object({
  id: z.string(),
  hoNumber: z.string(),
  projectId: z.string(),
  title: z.string(),
  handoverDate: z.string().nullable(),
  status: z.string(),
  checklist: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      documentName: z.string(),
      isMandatory: z.boolean(),
      status: z.string(),
      verifiedBy: z.string().nullable(),
      verifiedAt: z.string().nullable(),
    }),
  ),
});
export type HandoverPackage = z.infer<typeof handoverPackageSchema>;

export const createHandoverSchema = z.object({
  projectId: z.string(),
  title: z.string().min(3).max(200),
  handoverDate: z.string().optional(),
  checklist: z.string().max(1000).optional(),
  note: z.string().max(1000).optional(),
  items: z.array(
    z.object({
      documentName: z.string().min(2).max(200),
      isMandatory: z.boolean().optional(),
    }),
  ).optional(),
});
export type CreateHandover = z.infer<typeof createHandoverSchema>;

export const handoverListResponseSchema = z.object({
  items: z.array(handoverPackageSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type HandoverListResponse = z.infer<typeof handoverListResponseSchema>;
