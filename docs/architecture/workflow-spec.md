# Workflow Specification — Dasar

> Referensi: PRD §11.1 FR-FND-007 (workflow engine), §14.2 (approval features), §12 (state standards).
> Exit Criteria §49 item 6.

---

## 1. Prinsip

Workflow **configurable** (§6.4) — tidak hardcoded per modul. Engine umum dipakai semua domain untuk approval & state transition. Setiap transaksi berisiko tinggi mengikuti workflow yang didefinisikan data (bukan kode).

## 2. Model Workflow

```text
WorkflowDefinition
├── code                  (mis. "po-approval", "budget-baseline")
├── version               (int — versioning, FR-FND-007)
├── transaction_type      (PurchaseOrder, Budget, Journal, ...)
├── description
├── status                (DRAFT | ACTIVE | SUPERSEDED | ARCHIVED)
└── steps[]               (ordered)

WorkflowStep
├── step_order            (int)
├── name                  (mis. "manager-approval")
├── step_type             (APPROVAL | NOTIFICATION | AUTOMATED)
├── approver_resolver     (DOA | ROLE | SPECIFIC_USER | REQUESTER_MANAGER)
├── mode                  (SEQUENTIAL | PARALLEL)
├── condition             (optional — conditional routing)
├── sla_hours             (optional — SLA, FR-FND-007)
├── escalation_target     (optional — eskalasi bila SLA lewat)
└── required              (bool — wajib / opsional)

WorkflowInstance (per transaksi)
├── id
├── workflow_definition_id + version
├── transaction_ref       (tipe + id transaksi)
├── status                (PENDING | IN_PROGRESS | APPROVED | REJECTED | CANCELLED | EXPIRED)
├── current_step_order
├── started_by            (requester)
└── steps_state[]         (per-step status, actor, timestamp, comment)
```

## 3. Kemampuan (FR-FND-007 + §14.2)

| Fitur | Implementasi |
|---|---|
| Sequential approval | step_order berurutan; step berikut menunggu |
| Parallel approval | mode PARALLEL — semua approver di step harus setuju |
| Conditional routing | condition dievaluasi (mis. amount > X → step tambahan) |
| Delegation | approver bisa delegasikan ke user lain (delegation record) |
| Escalation | SLA lewat → eskalasi ke escalation_target |
| Reassignment | admin bisa reassign approval |
| Expiry | approval hangus setelah batas (opsional) |
| Reminder | notifikasi SLA mendekati |
| Comment | komentar approval |
| Attachment | lampiran pendukung |
| Approval history | immutable riwayat (audit §28) |
| Versioning | workflow definition versioned; instance pakai versi saat submit |

## 4. State Transaksi vs Workflow (§12.1)

```text
DRAFT
  → SUBMITTED            (buat WorkflowInstance, step 1 aktif)
  → UNDER_REVIEW         (saat step approval berjalan)
  → RETURNED             (step menolak, kembali ke requester untuk revisi)
  → APPROVED             (semua step wajib setuju)
  → REJECTED             (step menolak secara final)
APPROVED → RELEASED → COMPLETED → CLOSED
```

Mapping: state transaksi dikontrol domain; workflow instance mengatur transisi SUBMITTED→UNDER_REVIEW→APPROVED/REJECTED.

## 5. Integrasi dengan DoA & SoD

- `approver_resolver = DOA` → resolve approver via DoA-Matrix (rule-based).
- `approver_resolver = ROLE` → user dengan role tertentu.
- `approver_resolver = REQUESTER_MANAGER` → manager dari requester (organization hierarchy).
- Sebelum approval di-execute: validasi **maker-checker** (approver ≠ requester — BR-003) dan **SoD** (approver tidak memiliki konflik).

## 6. Contoh Workflow Definition (PO Approval)

```text
code: po-approval
transaction_type: PurchaseOrder
version: 1
steps:
  1. manager-approval
     approver_resolver: DOA
     mode: SEQUENTIAL
     sla_hours: 24
     escalation_target: director
  2. finance-review (conditional: amount > Rp 1 M)
     approver_resolver: ROLE (FINANCE_CONTROLLER)
     mode: PARALLEL
     sla_hours: 48
  3. final-approval
     approver_resolver: DOA
     sla_hours: 24
```

## 7. Lifecycle Workflow Definition

```text
DRAFT → ACTIVE → SUPERSEDED (saat versi baru aktif) → ARCHIVED
```

- Publish definition butuh approval (workflow configuration publication = privilege action §27.4).
- Instance yang sudah berjalan tetap memakai versi definition saat submit (immutability versi).

## 8. Observabilitas

- Metrik: approval lead time (§45.1), approval SLA breach, failed workflow count (§45.2).
- Audit: setiap step approval dicatat (actor, timestamp, decision, comment).
- Instance traceable ke transaction + approval history (§6.2 drill-down).

---

*Lihat juga: [[DoA-Matrix]], [[SoD-Catalogue]], [[Permission-Matrix]], [[Domain-Model-Foundation]]. Referensi lengkap: [[PRD]].*
