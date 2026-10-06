import type { WorkflowTemplate } from '@aec/api-contracts';

/**
 * Pustaka template rantai approval.
 *
 * Ini **cetakan**, bukan baris database: tidak ada id entitas, tidak ada versi.
 * Menyimpannya sebagai data statis (bukan tabel) disengaja — template adalah
 * pengetahuan domain tentang alur yang lazim, bukan data yang dimiliki pengguna.
 * Bila kelak perlu dapat diubah pengguna, ia bisa dipindah ke tabel tanpa
 * mengubah bentuk kontraknya.
 *
 * Setiap template memakai role yang benar-benar ada di sistem (PROCUREMENT_MANAGER,
 * SUPER_ADMIN, FINANCE_MANAGER) dan ambang yang masuk akal untuk konstruksi.
 */
export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: 'simple-two-tier',
    name: 'Two-tier approval',
    description: 'Manager approves everything; the board steps in above 5 million.',
    transactionType: 'PurchaseRequisition',
    steps: [
      { name: 'Manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 5_000_000 },
    ],
  },
  {
    id: 'three-tier-spend',
    name: 'Three-tier by value',
    description: 'Manager, then finance above 10 million, then the board above 100 million.',
    transactionType: 'PurchaseRequisition',
    steps: [
      { name: 'Manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { name: 'Finance review', approverRoleCode: 'FINANCE_MANAGER', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 10_000_000 },
      { name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'estimatedTotal', conditionOp: '>', conditionValue: 100_000_000 },
    ],
  },
  {
    id: 'po-single',
    name: 'Single approver',
    description: 'One manager approves every purchase order. Good for low-value, high-volume buying.',
    transactionType: 'PurchaseOrder',
    steps: [
      { name: 'Manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
    ],
  },
  {
    id: 'po-high-value',
    name: 'High-value order control',
    description: 'Manager always; finance and the board above 50 million for large orders.',
    transactionType: 'PurchaseOrder',
    steps: [
      { name: 'Manager approval', approverRoleCode: 'PROCUREMENT_MANAGER', conditionField: null, conditionOp: null, conditionValue: null },
      { name: 'Finance review', approverRoleCode: 'FINANCE_MANAGER', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 50_000_000 },
      { name: 'Board approval', approverRoleCode: 'SUPER_ADMIN', conditionField: 'totalAmount', conditionOp: '>', conditionValue: 250_000_000 },
    ],
  },
];

/** Template untuk satu jenis transaksi; kosong berarti tidak ada yang cocok. */
export function templatesFor(transactionType?: string): readonly WorkflowTemplate[] {
  if (!transactionType) return WORKFLOW_TEMPLATES;
  return WORKFLOW_TEMPLATES.filter((t) => t.transactionType === transactionType);
}
