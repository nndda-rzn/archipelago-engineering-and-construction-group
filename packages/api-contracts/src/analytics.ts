import { z } from 'zod';

/** Satu titik seri bulanan untuk tren (aliran per bulan, bukan stok). */
export const trendPointSchema = z.object({
  month: z.string(),
  value: z.number(),
});
export type TrendPoint = z.infer<typeof trendPointSchema>;

export const executiveTrendSchema = z.object({
  cashIn: z.array(trendPointSchema),
  cashOut: z.array(trendPointSchema),
  newProjects: z.array(trendPointSchema),
  newBudget: z.array(trendPointSchema),
  newNcrs: z.array(trendPointSchema),
  newIncidents: z.array(trendPointSchema),
});
export type ExecutiveTrend = z.infer<typeof executiveTrendSchema>;

export const executiveDashboardSchema = z.object({
  projects: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    totalContractValue: z.number(),
    totalAdvance: z.number(),
  }),
  finance: z.object({
    totalBudget: z.number(),
    postedVendorInvoice: z.number(),
    postedClientInvoice: z.number(),
    cashIn: z.number(),
    cashOut: z.number(),
  }),
  operational: z.object({
    openClaims: z.number(),
    openNcrs: z.number(),
    openIncidents: z.number(),
    overduePm: z.number(),
    openPunchItems: z.number(),
  }),
  /** Seri 6 bulan per metrik — untuk sparkline. Aditif & opsional (klien lama tetap valid). */
  trend: executiveTrendSchema.optional(),
  delta: z.record(z.string(), z.object({
    current: z.number(),
    previous: z.number(),
    pctChange: z.number().nullable(),
    direction: z.enum(['up', 'down', 'flat']),
  })).optional(),
  generatedAt: z.string(),
});
export type ExecutiveDashboard = z.infer<typeof executiveDashboardSchema>;

export const anomalySchema = z.object({
  type: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  projectCode: z.string().optional(),
  message: z.string(),
});
export type Anomaly = z.infer<typeof anomalySchema>;

export const anomalyListSchema = z.object({
  anomalies: z.array(anomalySchema),
  total: z.number(),
  generatedAt: z.string(),
});
export type AnomalyList = z.infer<typeof anomalyListSchema>;

export const cashFlowSeriesSchema = z.object({
  month: z.string(),
  cashIn: z.number(),
  cashOut: z.number(),
  net: z.number(),
});
export type CashFlowSeries = z.infer<typeof cashFlowSeriesSchema>;

export const cashFlowSchema = z.object({
  series: z.array(cashFlowSeriesSchema),
  totalCashIn: z.number(),
  totalCashOut: z.number(),
  netCash: z.number(),
  generatedAt: z.string(),
});
export type CashFlow = z.infer<typeof cashFlowSchema>;

export const agingBucketSchema = z.object({
  bucket: z.string(),
  amount: z.number(),
  /** Baris invoice di balik angka bucket — agar laporan bisa ditindaklanjuti. */
  detail: z.array(
    z.object({
      invoiceNumber: z.string(),
      /** Client (AR) atau vendor (AP). */
      party: z.string(),
      projectCode: z.string().nullable(),
      /** Tanggal yang dipakai untuk menghitung umur. */
      date: z.string(),
      ageDays: z.number(),
      outstanding: z.number(),
    }),
  ),
});
export type AgingBucket = z.infer<typeof agingBucketSchema>;

export const agingSchema = z.object({
  ar: z.array(agingBucketSchema),
  ap: z.array(agingBucketSchema),
  /** Tanggal acuan perhitungan umur. */
  asOf: z.string(),
  /** Field yang dipakai sebagai basis umur (sama untuk AR & AP). */
  basisDate: z.string(),
  generatedAt: z.string(),
});
export type Aging = z.infer<typeof agingSchema>;

export const projectCostSummaryItemSchema = z.object({
  projectCode: z.string(),
  projectName: z.string(),
  contractValue: z.number(),
  budget: z.number(),
  cost: z.number(),
  revenue: z.number(),
  margin: z.number(),
  budgetUsagePct: z.number(),
});
export type ProjectCostSummaryItem = z.infer<typeof projectCostSummaryItemSchema>;

export const projectCostSummarySchema = z.object({
  items: z.array(projectCostSummaryItemSchema),
  generatedAt: z.string(),
});
export type ProjectCostSummary = z.infer<typeof projectCostSummarySchema>;

export const analyticsFilterParamsSchema = z.object({
  legalEntityId: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AnalyticsFilterParams = z.infer<typeof analyticsFilterParamsSchema>;

export const signalSchema = z.object({
  key: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  count: z.number(),
  oldestAgeDays: z.number(),
  label: z.string(),
  to: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

export const signalListSchema = z.object({
  signals: z.array(signalSchema),
  generatedAt: z.string(),
});
export type SignalList = z.infer<typeof signalListSchema>;

export const costCompositionSchema = z.object({
  items: z.array(z.object({ costType: z.string(), amount: z.number() })),
  total: z.number(),
  generatedAt: z.string(),
});
export type CostComposition = z.infer<typeof costCompositionSchema>;

/** Konsentrasi piutang per klien — menjawab "siapa yang menahan uang kita?". */
export const arConcentrationSchema = z.object({
  items: z.array(z.object({ client: z.string(), amount: z.number(), pct: z.number() })),
  total: z.number(),
  generatedAt: z.string(),
});
export type ArConcentration = z.infer<typeof arConcentrationSchema>;

/** Rencana vs realisasi kas bersih per periode. */
export const forecastVsActualSchema = z.object({
  periods: z.array(z.object({ period: z.string(), forecastNet: z.number(), actualNet: z.number() })),
  generatedAt: z.string(),
});
export type ForecastVsActual = z.infer<typeof forecastVsActualSchema>;

/* ============================================================================
   Control Tower (FR-DASH-003) — satu payload komposit untuk dashboard `/`.
   Menggabungkan KPI ber-target, exception queue ber-SLA, dan pulse 9 domain.
   Aditif: tanpa param → seluruh grup. Semua blok selalu ada (array kosong,
   bukan null) supaya klien tidak perlu menebak bentuk saat data kosong.
   ============================================================================ */

/** Arah makna target: MIN = makin kecil makin baik, MAX = makin besar makin baik. */
export const kpiDirectionSchema = z.enum(['MIN', 'MAX', 'EXACT']);
export type KpiDirection = z.infer<typeof kpiDirectionSchema>;

/** Satu KPI: nilai + target + pencapaian + arah. `attainmentPct` null bila tanpa target. */
export const controlTowerKpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  /** Satuan: "idr" | "days" | "percent" | "ratio" | "count". */
  unit: z.string(),
  target: z.number().nullable(),
  direction: kpiDirectionSchema,
  /** 0-… ; >100 berarti melampaui target. Null bila tidak ada target. */
  attainmentPct: z.number().nullable(),
  /** Apakah nilai saat ini memenuhi target (sesuai `direction`). Null bila tanpa target. */
  meetsTarget: z.boolean().nullable(),
});
export type ControlTowerKpi = z.infer<typeof controlTowerKpiSchema>;

/** Satu baris exception queue: apa, di mana, sudah berapa lama, batasnya berapa. */
export const controlTowerExceptionSchema = z.object({
  key: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  /** Jenis dokumen/sinyal, mis. "Approval SLA" | "NCR overdue". */
  type: z.string(),
  /** Nomor dokumen bila ada. */
  documentCode: z.string().nullable(),
  /** Domain pemilik, mis. "Procurement" | "Quality" | "HSE". */
  domain: z.string(),
  /** Umur sejak dibuat (hari). */
  ageDays: z.number(),
  /** Batas SLA (hari). Null bila tidak ada tenggat. */
  slaDays: z.number().nullable(),
  /** true bila `ageDays` melewati `slaDays`. */
  overdue: z.boolean(),
  /** Deep-link yang benar-benar menyaring halaman tujuan. */
  to: z.string(),
});
export type ControlTowerException = z.infer<typeof controlTowerExceptionSchema>;

/** Satu proyek di portfolio map/ledger (join portfolio × EVM). */
export const controlTowerProjectSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  client: z.string(),
  health: z.enum(['ON_TRACK', 'AT_RISK', 'CRITICAL', 'NO_BUDGET']),
  contractValue: z.number(),
  budget: z.number(),
  actual: z.number(),
  variance: z.number(),
  revenue: z.number(),
  utilization: z.number(),
  progressPct: z.number(),
  cpi: z.number().nullable(),
  spi: z.number().nullable(),
  hasEvm: z.boolean(),
  riskScore: z.number().nullable(),
});
export type ControlTowerProject = z.infer<typeof controlTowerProjectSchema>;

/** Pemblok operasional ringkas (procurement/HSE/quality/HCM). Semua angka, tanpa objek dalam. */
export const controlTowerOperationsSchema = z.object({
  procurement: z.object({
    openPoValue: z.number(),
    openPoCount: z.number(),
    pendingPrCount: z.number(),
    rfqDueCount: z.number(),
    avgVendorScore: z.number().nullable(),
    topVendorName: z.string().nullable(),
    topVendorScore: z.number().nullable(),
  }),
  safety: z.object({
    openIncidents: z.number(),
    highSeverityOpen: z.number(),
    openCorrectiveActions: z.number(),
    overdueCorrectiveActions: z.number(),
    trir: z.number(),
    daysSinceLastIncident: z.number().nullable(),
  }),
  quality: z.object({
    openNcrs: z.number(),
    criticalNcrs: z.number(),
    openPunchItems: z.number(),
  }),
  hcm: z.object({
    activeEmployees: z.number(),
    manpowerToday: z.number(),
    pendingTimesheets: z.number(),
    equipmentUtilizationPct: z.number().nullable(),
    openBreakdowns: z.number(),
  }),
  /** Ringkasan inventory: nilai stok, jumlah gudang, dan mutasi masuk/keluar. */
  inventory: z.object({
    stockValue: z.number(),
    warehouseCount: z.number(),
    negativeBalanceCount: z.number(),
    movementInValue: z.number(),
    movementOutValue: z.number(),
  }),
});
export type ControlTowerOperations = z.infer<typeof controlTowerOperationsSchema>;

export const controlTowerGovernanceSchema = z.object({
  openRisks: z.number(),
  highRisks: z.number(),
  overdueAuditFindings: z.number(),
  openLegalCases: z.number(),
  /** Matriks risiko 5×5: jumlah risk per (likelihood, impact). */
  riskMatrix: z.array(z.object({ likelihood: z.number(), impact: z.number(), count: z.number() })),
});
export type ControlTowerGovernance = z.infer<typeof controlTowerGovernanceSchema>;

export const controlTowerCommercialSchema = z.object({
  pipelineValue: z.number(),
  openOpportunities: z.number(),
  wonValue: z.number(),
  lostValue: z.number(),
  winRatePct: z.number().nullable(),
  tendersDue: z.number(),
  approvedVariationValue: z.number(),
  /** Funnel per stage, urut LEAD→WON. */
  funnel: z.array(z.object({ stage: z.string(), count: z.number(), value: z.number() })),
});
export type ControlTowerCommercial = z.infer<typeof controlTowerCommercialSchema>;

export const controlTowerTreasurySchema = z.object({
  cashOnHand: z.number(),
  fxExposureValue: z.number(),
  fxExposureByCurrency: z.array(z.object({ currency: z.string(), amount: z.number(), rate: z.number() })),
  bgExpiringCount: z.number(),
  bgExpiringValue: z.number(),
  bgUtilisationPct: z.number().nullable(),
  periodCloseStatus: z.string().nullable(),
  periodCloseProgressPct: z.number().nullable(),
});
export type ControlTowerTreasury = z.infer<typeof controlTowerTreasurySchema>;

export const controlTowerSchema = z.object({
  kpis: z.array(controlTowerKpiSchema),
  exceptions: z.object({
    bySeverity: z.object({ HIGH: z.number(), MEDIUM: z.number(), LOW: z.number() }),
    items: z.array(controlTowerExceptionSchema),
    total: z.number(),
  }),
  projects: z.array(controlTowerProjectSchema),
  projectTotals: z.object({
    count: z.number(),
    contractValue: z.number(),
    budget: z.number(),
    actual: z.number(),
    variance: z.number(),
  }),
  operations: controlTowerOperationsSchema,
  governance: controlTowerGovernanceSchema,
  commercial: controlTowerCommercialSchema,
  treasury: controlTowerTreasurySchema,
  generatedAt: z.string(),
});
export type ControlTower = z.infer<typeof controlTowerSchema>;
