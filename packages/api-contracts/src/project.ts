import { z } from 'zod';
import { paginatedResponseSchema } from './core';

export const projectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  client: z.string(),
  legalEntityId: z.string(),
  businessUnit: z.string().nullable(),
  location: z.string().nullable(),
  currency: z.string(),
  contractValue: z.number().nullable(),
  advanceAmount: z.number().nullable().optional(),
  advanceRecoveryRate: z.number().nullable().optional(),
  startDate: z.string().nullable(),
  completionDate: z.string().nullable(),
  director: z.string().nullable(),
  manager: z.string().nullable(),
  type: z.string(),
  priority: z.string(),
  directorId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectListResponseSchema = paginatedResponseSchema(projectSchema);
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

/**
 * Baris register proyek — satu bentuk untuk daftar/kartu/timeline & halaman detail.
 * Menggabungkan metadata proyek + metrik biaya + health dalam SATU payload agar
 * tiga view dan halaman detail tidak perlu join di klien (dan tidak berbeda kunci).
 *
 * Catatan pelabelan: `utilization` = **serapan biaya** (actual/budget × 100),
 * bukan progress fisik. UI harus melabelinya "Budget used", bukan "Utilization".
 */
export const personRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string().nullable(),
});

export const teamMemberRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string().nullable(),
  isKeyMember: z.boolean(),
});

export const projectRegisterItemSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  client: z.string(),
  manager: z.string().nullable(),
  managerRef: personRefSchema.nullable(),
  directorRef: personRefSchema.nullable(),
  status: z.string(),
  type: z.string(),
  priority: z.string(),
  contractValue: z.number(),
  startDate: z.string().nullable(),
  completionDate: z.string().nullable(),
  budget: z.number(),
  actual: z.number(),
  variance: z.number(),
  /** Serapan biaya (%) — `null` bila belum ada budget. */
  utilization: z.number().nullable(),
  health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
  teamCount: z.number(),
  team: z.array(teamMemberRefSchema),
});
export type ProjectRegisterItem = z.infer<typeof projectRegisterItemSchema>;

export const projectStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  onHold: z.number(),
  completed: z.number(),
  critical: z.number(),
  withoutTeam: z.number(),
  totalContract: z.number(),
});
export type ProjectStats = z.infer<typeof projectStatsSchema>;

export const projectTeamMemberSchema = z.object({
  assignmentId: z.string(),
  employeeId: z.string(),
  name: z.string(),
  position: z.string().nullable(),
  department: z.string().nullable(),
  grade: z.string().nullable(),
  employeeNumber: z.string(),
  role: z.string().nullable(),
  allocationPercent: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isKeyMember: z.boolean(),
  status: z.string(),
});
export type ProjectTeamMember = z.infer<typeof projectTeamMemberSchema>;

export const projectTeamSchema = z.object({
  items: z.array(projectTeamMemberSchema),
  total: z.number(),
  totalAllocation: z.number(),
});
export type ProjectTeam = z.infer<typeof projectTeamSchema>;

export const projectActivitySchema = z.object({
  id: z.string(),
  action: z.string(),
  summary: z.string(),
  actorId: z.string().nullable(),
  at: z.string(),
});
export type ProjectActivity = z.infer<typeof projectActivitySchema>;

export const updateProjectMetaSchema = z.object({
  type: z.enum(['EPC', 'MARINE', 'POWER', 'PROCESS', 'INFRASTRUCTURE', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  managerId: z.string().optional(),
  directorId: z.string().optional(),
});
export type UpdateProjectMeta = z.infer<typeof updateProjectMetaSchema>;

export const addProjectMemberSchema = z.object({
  employeeId: z.string(),
  role: z.string().max(100).optional(),
  allocationPercent: z.number().min(1).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isKeyMember: z.boolean().optional(),
});
export type AddProjectMember = z.infer<typeof addProjectMemberSchema>;

export const projectRegisterSchema = z.object({
  items: z.array(projectRegisterItemSchema),
  totals: z.object({
    projectCount: z.number(),
    totalContract: z.number(),
    totalBudget: z.number(),
    totalActual: z.number(),
    totalVariance: z.number(),
  }),
  healthCounts: z.object({
    NO_BUDGET: z.number(),
    ON_TRACK: z.number(),
    AT_RISK: z.number(),
    CRITICAL: z.number(),
  }),
  generatedAt: z.string(),
});
export type ProjectRegister = z.infer<typeof projectRegisterSchema>;

/** Kolom yang boleh dipakai untuk sortir register — whitelist, bukan input bebas. */
export const PROJECT_SORT_FIELDS = ['code', 'name', 'client', 'contractValue', 'startDate', 'status', 'createdAt'] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

/**
 * Status proyek yang sah (mengikuti komentar `Project.status` di schema Prisma).
 * Dipakai untuk memvalidasi input, bukan sekadar dokumentasi.
 */
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Field yang boleh diubah lewat `PATCH /projects/:id`. `code` dan `legalEntityId`
 * sengaja TIDAK ada di sini: kode adalah identitas proyek, entity menentukan
 * pembukuan — mengubahnya akan memutus jejak audit.
 */
export const updateProjectSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  client: z.string().min(2).max(200).optional(),
  businessUnit: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  contractValue: z.number().optional(),
  advanceAmount: z.number().optional(),
  advanceRecoveryRate: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  director: z.string().max(200).optional(),
  manager: z.string().max(200).optional(),
  type: z.enum(['EPC', 'MARINE', 'POWER', 'PROCESS', 'INFRASTRUCTURE', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export const createProjectSchema = z.object({
  code: z.string().min(3).max(30),
  name: z.string().min(3).max(200),
  client: z.string().min(2).max(200),
  legalEntityId: z.string(),
  businessUnit: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().length(3).optional(),
  contractValue: z.number().optional(),
  advanceAmount: z.number().optional(),
  advanceRecoveryRate: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),
  director: z.string().optional(),
  manager: z.string().optional(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

export const projectHealthSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  client: z.string(),
  legalEntityCode: z.string(),
  contractValue: z.number(),
  totalBudget: z.number(),
  totalActual: z.number(),
  revenue: z.number(),
  variance: z.number(),
  utilization: z.number().nullable(),
  health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
  generatedAt: z.string(),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      actual: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
    }),
  ),
});
export type ProjectHealth = z.infer<typeof projectHealthSchema>;

export const portfolioSchema = z.object({
  generatedAt: z.string(),
  totals: z.object({
    projectCount: z.number(),
    totalContract: z.number(),
    totalBudget: z.number(),
    totalActual: z.number(),
    totalRevenue: z.number(),
    totalVariance: z.number(),
  }),
  healthCounts: z.object({
    NO_BUDGET: z.number(),
    ON_TRACK: z.number(),
    AT_RISK: z.number(),
    CRITICAL: z.number(),
  }),
  items: z.array(
    z.object({
      projectId: z.string(),
      projectCode: z.string(),
      projectName: z.string(),
      client: z.string(),
      status: z.string(),
      contractValue: z.number(),
      budget: z.number(),
      actual: z.number(),
      revenue: z.number(),
      variance: z.number(),
      utilization: z.number().nullable(),
      health: z.enum(['NO_BUDGET', 'ON_TRACK', 'AT_RISK', 'CRITICAL']),
    }),
  ),
});
export type Portfolio = z.infer<typeof portfolioSchema>;

export const portfolioFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
});
export type PortfolioFilterParams = z.infer<typeof portfolioFilterParamsSchema>;

export const portfolioEvmItemSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  bac: z.number(),
  ev: z.number(),
  pv: z.number(),
  ac: z.number(),
  cpi: z.number().nullable(),
  spi: z.number().nullable(),
  eac: z.number(),
  vac: z.number(),
  tcpi: z.number().nullable(),
  progressPercent: z.number(),
  hasEvm: z.boolean(),
});
export type PortfolioEvmItem = z.infer<typeof portfolioEvmItemSchema>;

export const portfolioEvmSchema = z.object({
  items: z.array(portfolioEvmItemSchema),
  totals: z.object({
    bac: z.number(),
    ev: z.number(),
    pv: z.number(),
    ac: z.number(),
    cpi: z.number().nullable(),
    spi: z.number().nullable(),
    eac: z.number(),
    vac: z.number(),
  }),
  generatedAt: z.string(),
});
export type PortfolioEvm = z.infer<typeof portfolioEvmSchema>;

export const wbsItemSchema: z.ZodType<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  children: WbsItem[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    sortOrder: z.number(),
    children: wbsItemSchema.array(),
  }),
);
export type WbsItem = z.infer<typeof wbsItemSchema>;

export const createWbsItemSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});
export type CreateWbsItem = z.infer<typeof createWbsItemSchema>;

export const budgetSummarySchema = z.object({
  projectId: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  wbs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      budget: z.number(),
      itemCount: z.number(),
    }),
  ),
  totalBudget: z.number(),
});
export type BudgetSummary = z.infer<typeof budgetSummarySchema>;

export const upsertBudgetSchema = z.object({
  wbsItemId: z.string(),
  costType: z.string().optional(),
  amount: z.number().min(0),
});
export type UpsertBudget = z.infer<typeof upsertBudgetSchema>;

export const costCodeSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string().nullable(),
  code: z.string(),
  name: z.string(),
  costType: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  wbsItem: z.object({ code: z.string(), name: z.string() }).nullable(),
});
export type CostCode = z.infer<typeof costCodeSchema>;

export const costCodeListResponseSchema = paginatedResponseSchema(costCodeSchema);
export type CostCodeListResponse = z.infer<typeof costCodeListResponseSchema>;

export const createCostCodeSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  wbsItemId: z.string().optional(),
  costType: z.enum(['DIRECT', 'INDIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'OVERHEAD']).optional(),
});
export type CreateCostCode = z.infer<typeof createCostCodeSchema>;

export const controlAccountSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wbsItemId: z.string(),
  code: z.string(),
  name: z.string(),
  responsibleManager: z.string(),
  budgetAmount: z.number(),
  plannedValue: z.number(),
  scheduleStart: z.string().nullable(),
  scheduleEnd: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  wbsItem: z.object({ code: z.string(), name: z.string() }),
});
export type ControlAccount = z.infer<typeof controlAccountSchema>;

export const controlAccountListResponseSchema = paginatedResponseSchema(controlAccountSchema);
export type ControlAccountListResponse = z.infer<typeof controlAccountListResponseSchema>;

export const createControlAccountSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(200),
  wbsItemId: z.string(),
  responsibleManager: z.string().min(1).max(200),
  budgetAmount: z.number().optional(),
  plannedValue: z.number().optional(),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
});
export type CreateControlAccount = z.infer<typeof createControlAccountSchema>;

export const commitmentSchema = z.object({
  projectId: z.string(),
  poCommitment: z.number(),
  subcontractCommitment: z.number(),
  totalCommitment: z.number(),
  totalBudget: z.number(),
  remainingBudget: z.number(),
  generatedAt: z.string(),
});
export type Commitment = z.infer<typeof commitmentSchema>;

export const forecastSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  version: z.number(),
  period: z.string().nullable(),
  estimateAtCompletion: z.number(),
  estimateToComplete: z.number(),
  varianceAtCompletion: z.number(),
  status: z.string(),
  note: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Forecast = z.infer<typeof forecastSchema>;

export const createForecastSchema = z.object({
  period: z.string().min(1),
  estimateAtCompletion: z.number().min(0),
  estimateToComplete: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});
export type CreateForecast = z.infer<typeof createForecastSchema>;

export const evmSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  metrics: z.object({
    pv: z.number(),
    ev: z.number(),
    ac: z.number(),
    bac: z.number(),
    progressPercent: z.number(),
    cpi: z.number().nullable(),
    spi: z.number().nullable(),
    cv: z.number(),
    sv: z.number(),
  }),
  interpretation: z.object({
    cpi: z.string(),
    spi: z.string(),
  }),
  generatedAt: z.string(),
});
export type Evm = z.infer<typeof evmSchema>;

// ─── Command center (fase, jadwal, aliran kas, stakeholder) ──────────────────

export const PROJECT_PHASES = ['INITIATION', 'FEED', 'ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING', 'CLOSEOUT'] as const;
export const MILESTONE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'MISSED'] as const;
export const GATE_DECISIONS = ['GO', 'HOLD', 'NO_GO'] as const;

export const glanceSignalSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  tone: z.enum(['ok', 'warn', 'bad', 'neutral']),
});
export type GlanceSignal = z.infer<typeof glanceSignalSchema>;

export const projectSummarySchema = z.object({
  project: z.object({
    id: z.string(), code: z.string(), name: z.string(), client: z.string(),
    status: z.string(), phase: z.string(), healthStatus: z.string(),
    type: z.string(), priority: z.string(), currency: z.string(),
    location: z.string().nullable(), legalEntityCode: z.string(),
    manager: z.object({ id: z.string(), name: z.string(), position: z.string().nullable() }).nullable(),
    director: z.object({ id: z.string(), name: z.string(), position: z.string().nullable() }).nullable(),
    startDate: z.string().nullable(), completionDate: z.string().nullable(),
  }),
  schedule: z.object({
    progressPlanned: z.number(), progressActual: z.number(), variance: z.number(),
    milestoneTotal: z.number(), milestoneAchieved: z.number(), milestoneMissed: z.number(), gateHold: z.number(),
  }),
  cost: z.object({
    contractValue: z.number(), budget: z.number(), committed: z.number(), actual: z.number(),
    certified: z.number(), billed: z.number(), collected: z.number(), cpi: z.number().nullable(),
  }),
  signals: z.array(glanceSignalSchema),
  domains: z.object({
    commercial: z.object({ contract: z.number(), progressClaim: z.number(), clientInvoice: z.number(), collection: z.number(), variation: z.number() }),
    procurement: z.object({ pr: z.number(), po: z.number(), vendorInvoice: z.number(), subcontract: z.number() }),
    execution: z.object({ workPackage: z.number(), dailyReport: z.number() }),
    quality: z.object({ ncrOpen: z.number(), punchOpen: z.number() }),
    hse: z.object({ incidentOpen: z.number() }),
    governance: z.object({ riskOpen: z.number(), gateHold: z.number() }),
    engineering: z.object({ drawing: z.number(), deliverable: z.number() }),
  }),
  generatedAt: z.string(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectMilestoneSchema = z.object({
  id: z.string(), name: z.string(), plannedDate: z.string(), actualDate: z.string().nullable(),
  status: z.string(), weight: z.number(), isCritical: z.boolean(), notes: z.string().nullable(),
});
export type ProjectMilestone = z.infer<typeof projectMilestoneSchema>;

export const projectScheduleSchema = z.object({
  progressPlanned: z.number(),
  progressActual: z.number(),
  plannedCurve: z.array(z.object({ period: z.string(), planned: z.number(), plannedCumulative: z.number(), plannedPct: z.number() })),
  milestones: z.array(projectMilestoneSchema),
  phases: z.array(z.object({ phase: z.string(), enteredAt: z.string(), exitedAt: z.string().nullable(), note: z.string().nullable() })),
  gates: z.array(z.object({ id: z.string(), gate: z.string(), phase: z.string(), decision: z.string(), decidedAt: z.string().nullable(), notes: z.string().nullable() })),
});
export type ProjectSchedule = z.infer<typeof projectScheduleSchema>;

export const projectCashFlowSchema = z.object({
  projectId: z.string(),
  chain: z.array(z.object({ key: z.string(), label: z.string(), value: z.number() })),
  generatedAt: z.string(),
});
export type ProjectCashFlow = z.infer<typeof projectCashFlowSchema>;

export const domainItemSchema = z.object({
  id: z.string(),
  ref: z.string(),
  label: z.string(),
  status: z.string(),
  meta: z.string().optional(),
  severity: z.string().optional(),
  score: z.number().optional(),
  likelihood: z.number().optional(),
  impact: z.number().optional(),
  value: z.number().optional(),
  flag: z.boolean().optional(),
});
export type DomainItem = z.infer<typeof domainItemSchema>;

export const projectDomainsSchema = z.object({
  execution: z.object({ workPackages: z.array(domainItemSchema), dailyReports: z.array(domainItemSchema) }),
  quality: z.object({ ncrs: z.array(domainItemSchema), punchItems: z.array(domainItemSchema) }),
  hse: z.object({ incidents: z.array(domainItemSchema), observations: z.array(domainItemSchema), permits: z.array(domainItemSchema) }),
  documents: z.object({ drawings: z.array(domainItemSchema), deliverables: z.array(domainItemSchema) }),
  governance: z.object({ risks: z.array(domainItemSchema), legalCases: z.array(domainItemSchema), contracts: z.array(domainItemSchema) }),
});
export type ProjectDomains = z.infer<typeof projectDomainsSchema>;

export const projectStakeholderSchema = z.object({
  id: z.string(), name: z.string(), role: z.string(), raci: z.string(),
  employeeId: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable(), isPrimary: z.boolean(),
});
export type ProjectStakeholder = z.infer<typeof projectStakeholderSchema>;

export const createMilestoneSchema = z.object({
  name: z.string().min(2).max(200),
  plannedDate: z.string(),
  actualDate: z.string().optional(),
  status: z.enum(MILESTONE_STATUSES).optional(),
  weight: z.number().min(0).max(100).optional(),
  isCritical: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateMilestone = z.infer<typeof createMilestoneSchema>;

export const advancePhaseSchema = z.object({
  phase: z.enum(PROJECT_PHASES),
  decision: z.enum(GATE_DECISIONS).optional(),
  gate: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});
export type AdvancePhase = z.infer<typeof advancePhaseSchema>;