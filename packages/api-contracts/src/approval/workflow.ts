import { z } from 'zod';

export const workflowStepSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  stepOrder: z.number(),
  name: z.string(),
  approverRoleCode: z.string(),
  /** Kolom tunggal lama — tetap dikirim untuk kompatibilitas; cerminan aturan pertama. */
  conditionField: z.string().nullable(),
  conditionOp: z.string().nullable(),
  conditionValue: z.number().nullable(),
  /** Aturan majemuk (AND/OR). `null` berarti langkah selalu berlaku. */
  conditionGroup: z.lazy(() => conditionGroupSchema.nullable()),
});
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

/**
 * Satu aturan syarat: field, operator, nilai. Field harus berasal dari
 * `CONDITION_FIELDS` jenis transaksinya (satu sumber kebenaran), sehingga aturan
 * yang tidak pernah cocok tidak bisa dibuat.
 */
export const workflowConditionSchema = z.object({
  field: z.string(),
  op: z.enum(['>', '<', '>=', '<=', '==']),
  value: z.number(),
});
export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

/**
 * Sekumpulan aturan dengan penghubung. `AND` = semua harus benar, `OR` = salah
 * satu cukup. Inilah yang membuat rentang bisa diekspresikan
 * (`> 5jt AND <= 50jt`) — hal yang mustahil dengan satu aturan tunggal.
 */
export const conditionGroupSchema = z.object({
  combinator: z.enum(['AND', 'OR']),
  conditions: z.array(workflowConditionSchema).min(1),
});
export type ConditionGroup = z.infer<typeof conditionGroupSchema>;

/**
 * Bentuk minimal yang dibutuhkan evaluator — dipakai bersama API dan web agar
 * aturan yang sama dievaluasi di kedua sisi (bukan dua implementasi yang bisa
 * berbeda diam-diam).
 */
export interface ConditionLike {
  conditionField: string | null;
  conditionOp: string | null;
  conditionValue: number | null;
}
export interface ConditionGroupLike {
  combinator: 'AND' | 'OR';
  conditions: Array<{ field: string; op: string; value: number }>;
}

/** Satu aturan terhadap sebuah nilai dokumen. `null` pada nilai → tidak cocok. */
export function evaluateCondition(condition: { op: string; value: number }, docValue: number | null): boolean {
  if (docValue == null) return false;
  switch (condition.op) {
    case '>': return docValue > condition.value;
    case '<': return docValue < condition.value;
    case '>=': return docValue >= condition.value;
    case '<=': return docValue <= condition.value;
    case '==': return docValue === condition.value;
    default: return false;
  }
}

/**
 * Sekumpulan aturan dengan penghubung AND/OR.
 *
 * Daftar kosong sengaja mengembalikan `true`: grup tanpa aturan berarti langkah
 * tidak dibatasi, bukan langkah yang tidak pernah berlaku. Ini menjaga perilaku
 * "kosong = selalu berlaku" yang sudah dipakai kolom tunggal.
 */
export function evaluateConditionGroup(group: ConditionGroupLike, docValue: number | null): boolean {
  if (group.conditions.length === 0) return true;
  return group.combinator === 'OR'
    ? group.conditions.some((c) => evaluateCondition(c, docValue))
    : group.conditions.every((c) => evaluateCondition(c, docValue));
}

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
    /**
     * Syarat majemuk. Bila diisi, ia menggantikan kolom tunggal di atas; kolom
     * tunggal tetap ditulis sebagai cerminan aturan pertama agar pembaca lama
     * (dan data lama) tetap memahami langkah ini.
     */
    conditionGroup: conditionGroupSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    // Bila grup majemuk dipakai, kolom tunggal tidak perlu lengkap — server yang
    // akan menurunkannya dari aturan pertama.
    if (value.conditionGroup !== undefined && value.conditionGroup !== null) return;

    // Syarat tunggal harus lengkap atau kosong — sebagian terisi menghasilkan
    // langkah yang tampak bersyarat tetapi selalu berlaku.
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
  /**
   * **Cakupan data.** Ini menjawab masalah "konteks tercampur": sebagian angka
   * dihitung per DEFINISI (mis. coverage), sebagian per JENIS TRANSAKSI (mis.
   * `byStep`, `amounts`). Tanpa label, pengguna menyandingkan dua skala berbeda
   * dan menyangka keduanya tentang hal yang sama.
   *
   * - `requested` = definisi yang diminta insight-nya.
   * - `scope` = apakah angka task (`byStep`/`amounts`/`monthly`/`documents`)
   *   difilter ke versi ini (`'version'`) atau mencakup semua versi (`'type'`).
   * - `versionBreakdown` = sebaran task antar versi; memperlihatkan campurannya
   *   alih-alih menyembunyikannya. `version: null` = task tanpa versi diketahui.
   */
  scope: z.object({
    requested: z.object({
      definitionId: z.string(),
      code: z.string(),
      version: z.number(),
    }),
    /** `type` = semua versi (perilaku lama). */
    applied: z.enum(['version', 'type']),
    taskCount: z.number(),
    versionBreakdown: z.array(
      z.object({
        definitionId: z.string().nullable(),
        version: z.number().nullable(),
        code: z.string().nullable(),
        tasks: z.number(),
      }),
    ),
  }),
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
  /**
   * Hasil akhir **per dokumen**, dihitung dari seluruh langkahnya.
   *
   * Ini bentuk yang benar untuk "berapa yang disetujui": satu dokumen
   * menghasilkan beberapa baris task, jadi menjumlahkan `approved` lintas langkah
   * menghitung dokumen yang sama dua kali. `approvalRate` di sini = dokumen
   * selesai / dokumen masuk.
   */
  documents: z.object({
    entered: z.number(),
    approved: z.number(),
    rejected: z.number(),
    pending: z.number(),
    cancelled: z.number(),
    approvalRate: z.number(),
  }),
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

/**
 * Template rantai siap pakai — cetakan, bukan baris database. `id` stabil agar
 * klien dapat merujuknya; `steps` memakai bentuk yang sama dengan langkah nyata
 * supaya bisa langsung dipakai membentuk definisi baru.
 */
export const workflowTemplateStepSchema = z.object({
  name: z.string(),
  approverRoleCode: z.string(),
  conditionField: z.string().nullable(),
  conditionOp: z.string().nullable(),
  conditionValue: z.number().nullable(),
});
export type WorkflowTemplateStep = z.infer<typeof workflowTemplateStepSchema>;

export const workflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  transactionType: z.string(),
  steps: z.array(workflowTemplateStepSchema),
});
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;

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
  conditionGroup: conditionGroupSchema.nullable().optional(),
});
export type AddWorkflowStep = z.infer<typeof addWorkflowStepSchema>;

export const publishWorkflowSchema = z.object({
  newVersionName: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});
export type PublishWorkflow = z.infer<typeof publishWorkflowSchema>;

/** Duplikasi definisi menjadi versi DRAFT baru dengan kode baru. */
export const duplicateWorkflowSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100).optional(),
});
export type DuplicateWorkflow = z.infer<typeof duplicateWorkflowSchema>;
