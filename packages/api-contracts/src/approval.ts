import { z } from 'zod';

export const approvalTaskSchema = z.object({
  id: z.string(),
  transactionType: z.string(),
  transactionId: z.string(),
  transactionCode: z.string().nullable(),
  stepOrder: z.number(),
  stepName: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  requesterId: z.string(),
  approverId: z.string().nullable(),
  approverRoleCode: z.string(),
  comment: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  canApprove: z.boolean().optional(),
});
export type ApprovalTask = z.infer<typeof approvalTaskSchema>;

export const submitForApprovalSchema = z.object({
  transactionType: z.enum(['PurchaseRequisition', 'PurchaseOrder']),
  transactionId: z.string(),
  approverRoleCode: z.string().min(2).max(50),
  transactionCode: z.string().optional(),
});
export type SubmitForApproval = z.infer<typeof submitForApprovalSchema>;

/**
 * Keputusan tunggal. **Invarian:** penolakan WAJIB disertai alasan — tanpa itu
 * pemohon tidak tahu apa yang harus diperbaiki dan jejak audit tidak berguna.
 * Ditegakkan di sini (kontrak) *dan* di DTO/service API.
 */
export const approveTaskSchema = z
  .object({
    taskId: z.string(),
    decision: z.enum(['APPROVE', 'REJECT']),
    comment: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECT' && !value.comment?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comment'],
        message: 'A reason is required to reject',
      });
    }
  });
export type ApproveTask = z.infer<typeof approveTaskSchema>;

/** Status tab pada inbox approval. `ALL` = tanpa filter status. */
export const approvalStatusFilterSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']);
export type ApprovalStatusFilter = z.infer<typeof approvalStatusFilterSchema>;

/** Jumlah task per status — untuk label tab. Dihitung di server agar konsisten. */
export const approvalCountsSchema = z.object({
  PENDING: z.number(),
  APPROVED: z.number(),
  REJECTED: z.number(),
  ALL: z.number(),
});
export type ApprovalCounts = z.infer<typeof approvalCountsSchema>;

/** Baris antrean: task + konteks ringkas agar approver bisa menilai tanpa membuka. */
export const approvalQueueItemSchema = approvalTaskSchema.extend({
  projectCode: z.string().nullable(),
  projectName: z.string().nullable(),
  amount: z.number().nullable(),
  requesterName: z.string().nullable(),
});
export type ApprovalQueueItem = z.infer<typeof approvalQueueItemSchema>;

export const approvalQueueSchema = z.object({
  items: z.array(approvalQueueItemSchema),
  total: z.number(),
  counts: approvalCountsSchema,
});
export type ApprovalQueue = z.infer<typeof approvalQueueSchema>;

/** Satu baris item dokumen — dipakai untuk tabel item + bar proporsi biaya. */
export const approvalDocumentItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number().nullable(),
  /** Kode WBS item (bila ada) — atribusi nyata dari dokumen, bukan tebakan. */
  wbsCode: z.string().nullable(),
});
export type ApprovalDocumentItem = z.infer<typeof approvalDocumentItemSchema>;

/** Ringkasan dokumen yang diajukan — bukti sebelum memutuskan. */
export const approvalDocumentSchema = z.object({
  type: z.string(),
  code: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  projectCode: z.string().nullable(),
  projectName: z.string().nullable(),
  vendor: z.string().nullable(),
  requesterName: z.string().nullable(),
  items: z.array(approvalDocumentItemSchema),
});
export type ApprovalDocument = z.infer<typeof approvalDocumentSchema>;

/** Jejak keputusan dari audit log (siapa, kapan, apa, alasan). */
export const approvalHistoryEntrySchema = z.object({
  action: z.string(),
  actorId: z.string(),
  actorName: z.string().nullable(),
  comment: z.string().nullable(),
  at: z.string(),
});
export type ApprovalHistoryEntry = z.infer<typeof approvalHistoryEntrySchema>;

export const approvalDetailSchema = z.object({
  task: approvalTaskSchema,
  document: approvalDocumentSchema,
  history: z.array(approvalHistoryEntrySchema),
  /** Konteks budget proyek (FR-PRO-002). `null` bila proyek tak punya budget terbit. */
  budget: z
    .object({
      budget: z.number(),
      commitment: z.number(),
      existingPr: z.number(),
      remaining: z.number(),
      within: z.boolean(),
    })
    .nullable(),
  /** Rantai approval dari definisi aktif + posisi task ini. `null` bila tanpa workflow. */
  chain: z
    .array(
      z.object({
        stepOrder: z.number(),
        name: z.string(),
        approverRoleCode: z.string(),
        /** Aturan routing dalam teks, mis. "totalAmount > 5.000.000". */
        condition: z.string().nullable(),
        status: z.enum(['done', 'current', 'upcoming']),
      }),
    )
    .nullable(),
  project: z
    .object({
      code: z.string(),
      name: z.string(),
      client: z.string(),
      status: z.string(),
      contractValue: z.number().nullable(),
      startDate: z.string().nullable(),
      completionDate: z.string().nullable(),
      location: z.string().nullable(),
      manager: z.string().nullable(),
      baselineByCostType: z.array(z.object({ costType: z.string(), amount: z.number() })),
    })
    .nullable(),
  vendor: z
    .object({
      name: z.string(),
      category: z.string().nullable(),
      taxId: z.string().nullable(),
      contactPerson: z.string().nullable(),
      avgRating: z.number().nullable(),
      ratingCount: z.number(),
    })
    .nullable(),
  related: z.array(z.object({ type: z.string(), code: z.string(), status: z.string() })),
});
export type ApprovalDetail = z.infer<typeof approvalDetailSchema>;

/**
 * Keputusan massal. Server **memvalidasi ulang tiap task** (status, maker-checker,
 * role) — daftar dari klien tidak dipercaya. Hasil dikembalikan per item.
 */
export const bulkDecideSchema = z
  .object({
    taskIds: z.array(z.string()).min(1).max(100),
    decision: z.enum(['APPROVE', 'REJECT']),
    comment: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECT' && !value.comment?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['comment'], message: 'A reason is required to reject' });
    }
  });
export type BulkDecide = z.infer<typeof bulkDecideSchema>;

export const bulkDecideResultSchema = z.object({
  taskId: z.string(),
  ok: z.boolean(),
  code: z.string().nullable(),
  message: z.string().nullable(),
});
export type BulkDecideResult = z.infer<typeof bulkDecideResultSchema>;

export const bulkDecideResponseSchema = z.object({
  results: z.array(bulkDecideResultSchema),
  succeeded: z.number(),
  failed: z.number(),
});
export type BulkDecideResponse = z.infer<typeof bulkDecideResponseSchema>;

export const workflowStepSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  stepOrder: z.number(),
  name: z.string(),
  approverRoleCode: z.string(),
  conditionField: z.string().nullable(),
  conditionOp: z.string().nullable(),
  conditionValue: z.number().nullable(),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const workflowDefinitionSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.number(),
  status: z.string(),
  transactionType: z.string(),
  createdBy: z.string(),
  /** Nama tampil pembuat — `null` bila user sudah tidak ada (baris audit tetap). */
  createdByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(workflowStepSchema),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

/**
 * Field dokumen yang boleh dipakai sebagai syarat langkah. **Satu sumber
 * kebenaran** untuk form (frontend) dan validasi (backend) — mencegah field
 * bebas yang `getDocValue` diam-diam kembalikan `null` sehingga syaratnya tidak
 * pernah berlaku (bug senyap).
 */
export const CONDITION_FIELDS: Record<string, readonly string[]> = {
  PurchaseRequisition: ['estimatedTotal'],
  PurchaseOrder: ['totalAmount'],
};
export type ConditionTransactionType = keyof typeof CONDITION_FIELDS;

/** Label manusiawi untuk field kondisi (UI menampilkan "Amount", bukan "totalAmount"). */
export const CONDITION_FIELD_LABELS: Record<string, string> = {
  estimatedTotal: 'Estimated total',
  totalAmount: 'Order total',
};

export const updateWorkflowDefinitionSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});
export type UpdateWorkflowDefinition = z.infer<typeof updateWorkflowDefinitionSchema>;

export const updateWorkflowStepSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    approverRoleCode: z.string().min(2).max(50).optional(),
    /** `null` membersihkan syarat langkah. */
    conditionField: z.string().max(50).nullable().optional(),
    conditionOp: z.enum(['>', '<', '>=', '<=', '==']).nullable().optional(),
    conditionValue: z.number().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    // Syarat harus lengkap atau kosong — sebagian terisi menghasilkan langkah
    // yang tampak bersyarat tetapi selalu berlaku.
    const parts = [value.conditionField, value.conditionOp, value.conditionValue];
    const filled = parts.filter((p) => p !== undefined && p !== null).length;
    if (filled !== 0 && filled !== 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conditionField'], message: 'Condition needs a field, an operator and a value' });
    }
  });
export type UpdateWorkflowStep = z.infer<typeof updateWorkflowStepSchema>;

/** Urutan baru langkah — id lengkap, terurut. Divalidasi ulang di server. */
export const reorderWorkflowStepsSchema = z.object({
  stepIds: z.array(z.string()).min(1),
});
export type ReorderWorkflowSteps = z.infer<typeof reorderWorkflowStepsSchema>;

/** Satu baris riwayat versi — nomor, status, waktu, pembuat. */
export const workflowVersionSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  version: z.number(),
  status: z.string(),
  name: z.string(),
  stepCount: z.number(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Versi yang sedang dipakai runtime untuk jenis transaksi ini. */
  isActive: z.boolean(),
});
export type WorkflowVersionSummary = z.infer<typeof workflowVersionSummarySchema>;

/** Perbandingan dua versi: langkah yang ditambah / dihapus / diubah. */
export const workflowVersionDiffSchema = z.object({
  from: workflowVersionSummarySchema,
  to: workflowVersionSummarySchema,
  added: z.array(z.object({ stepOrder: z.number(), name: z.string(), approverRoleCode: z.string() })),
  removed: z.array(z.object({ stepOrder: z.number(), name: z.string(), approverRoleCode: z.string() })),
  changed: z.array(
    z.object({
      stepOrder: z.number(),
      fields: z.array(z.object({ field: z.string(), from: z.string().nullable(), to: z.string().nullable() })),
    }),
  ),
});
export type WorkflowVersionDiff = z.infer<typeof workflowVersionDiffSchema>;

/**
 * Insight operasional untuk sebuah definisi. Dihitung dari `ApprovalTask` per
 * **jenis transaksi** — bukan per versi — karena task tidak menyimpan versi
 * definisi yang dipakai. `note` menyatakan batas ini secara eksplisit.
 */
export const workflowInsightsSchema = z.object({
  transactionType: z.string(),
  generatedAt: z.string(),
  /** Sebaran task menurut langkah + hasilnya. */
  byStep: z.array(
    z.object({
      stepOrder: z.number(),
      stepName: z.string(),
      total: z.number(),
      approved: z.number(),
      rejected: z.number(),
      pending: z.number(),
      cancelled: z.number(),
    }),
  ),
  /** Volume per bulan (UTC). Kosong bila tidak ada task. */
  monthly: z.array(z.object({ month: z.string(), created: z.number(), decided: z.number() })),
  /** Sebaran nominal dokumen + bucket tetap agar bisa dibandingkan antar waktu. */
  amounts: z.object({
    count: z.number(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    /** `from`/`to` dikirim eksplisit agar klien tidak menebak rentang dari label. */
    buckets: z.array(z.object({ label: z.string(), count: z.number(), from: z.number(), to: z.number().nullable() })),
  }),
  /** Berapa dokumen yang benar-benar memenuhi syarat tiap langkah. */
  ruleHits: z.array(
    z.object({
      stepOrder: z.number(),
      name: z.string(),
      condition: z.string().nullable(),
      matching: z.number(),
    }),
  ),
  /** Jumlah pemegang role per langkah definisi AKTIF. 0 berarti rantai macet. */
  coverage: z.array(
    z.object({
      stepOrder: z.number(),
      roleCode: z.string(),
      holders: z.number(),
      /** Nama pemegang. Menjawab "siapa", bukan hanya "berapa". */
      holderNames: z.array(z.string()),
    }),
  ),
  /** Ambang nyata tiap langkah, untuk digambar sebagai garis pada sebaran nilai. */
  thresholds: z.array(
    z.object({
      stepOrder: z.number(),
      stepName: z.string(),
      field: z.string(),
      op: z.string(),
      value: z.number(),
    }),
  ),
  note: z.string(),
});
export type WorkflowInsights = z.infer<typeof workflowInsightsSchema>;

export const createWorkflowDefinitionSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  transactionType: z.enum(['PurchaseRequisition', 'PurchaseOrder']),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});
export type CreateWorkflowDefinition = z.infer<typeof createWorkflowDefinitionSchema>;

export const addWorkflowStepSchema = z.object({
  stepOrder: z.number().int().min(1),
  name: z.string().min(1).max(100),
  approverRoleCode: z.string().min(2).max(50),
  conditionField: z.string().optional(),
  conditionOp: z.enum(['>', '<', '>=', '<=', '==']).optional(),
  conditionValue: z.number().optional(),
});
export type AddWorkflowStep = z.infer<typeof addWorkflowStepSchema>;

export const publishWorkflowSchema = z.object({
  newVersionName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});
export type PublishWorkflow = z.infer<typeof publishWorkflowSchema>;

export const pendingApprovalCountSchema = z.object({ count: z.number() });
export type PendingApprovalCount = z.infer<typeof pendingApprovalCountSchema>;