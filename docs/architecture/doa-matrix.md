# DoA Matrix — Delegation of Authority

> Referensi: PRD §11.1 FR-FND-006 (DoA resolution), §14.1 (DoA dimensions), §27.4 (privileged actions).
> Exit Criteria §49 item 4.

---

## 1. Prinsip

**Delegation of Authority (DoA):** siapa yang berwenang menyetujui transaksi, ditentukan oleh rule (bukan hardcoded per transaksi). Approver di-resolve berdasarkan **dimensi rule** (§14.1), dan harus **configurable** (§6.4).

**Catatan:** DoA ≠ Permission. Permission = boleh melakukan action. DoA = siapa harus approve untuk transaksi dengan konteks tertentu (amount, entity, risk, dsb). Approval penuh = permission sesuai + memenuhi DoA + tidak melanggar SoD/maker-checker.

## 2. Dimensi Rule (§14.1)

| Dimensi | Contoh |
|---|---|
| transaction_type | PR, PO, Journal, Payment, Budget baseline, Contract |
| legal_entity | PT AEC Construction, PT AEC EPC, dll |
| business_unit | Engineering, Procurement, dll |
| project | PRJ-EPC-2027-014, dll |
| amount | batas nominal |
| currency | IDR, USD, dll |
| risk | LOW / MEDIUM / HIGH |
| contract_category | Lump Sum / Re-measurement / EPC |

## 3. Level Approver (hierarki)

| Level | Peran tipikal | Batas wewenang (contoh awal — configurable) |
|---|---|---|
| L1 | Supervisor / Lead | ≤ Rp 100 juta |
| L2 | Manager | ≤ Rp 1 miliar |
| L3 | Senior Manager / Head | ≤ Rp 10 miliar |
| L4 | Director / BU Director | ≤ Rp 50 miliar |
| L5 | CFO | ≤ Rp 200 miliar |
| L6 | CEO / Board | > Rp 200 miliar + high-risk |

Threshold di atas **contoh awal** — nilai pasti adalah data konfigurasi (editable tanpa code change). Lihat bagian 6 untuk model data.

## 4. Matriks DoA (contoh awal — configurable)

| Transaksi | Dimensi kunci | Rule contoh |
|---|---|---|
| Purchase Requisition (PR) | amount, project | amount ≤ L1 → L1; L1–L2 → L2; L2–L3 → L3; dst |
| Purchase Order (PO) | amount, entity, project | serupa PR; > L4 → L4 + CFO (parallel) |
| Budget baseline publish | project | Project Controller → Project Director (wajib beda — FR-PRJ-005, maker-checker) |
| Journal post | amount, entity | ≤ L2 → L2; L2–L4 → L4; > L4 → CFO |
| Payment release | amount, currency | Treasury: ≤ L2 → L2; > L2 → L4; > L5 → CEO |
| Vendor bank account change | entity | selalu L4 + Finance Controller (high-risk — BR-008) |
| Fiscal period close | entity | Finance Controller (privilege action — §27.4) |
| Contract deviation | risk, amount | risk HIGH → Legal + Commercial Director |
| Master data high-risk | — | User Admin + approver sesuai sensitivity |

## 5. Resolusi Rule (algoritma)

```text
resolveApprover(transaction) :
  rules = activeDoaRules
    .filter(matches(transaction.type))
    .filter(matchesScope(transaction.legalEntity, transaction.businessUnit, transaction.project))
    .filter(amountWithinRange(transaction.amount, transaction.currency))
    .filter(riskMatches(transaction.risk))
  rule = pickMostSpecific(rules)   // rule ter-spesifik (prioritas)
  return rule.approverLevel (sequential/parallel per rule)
```

**Prioritas kekhususan:** rule dengan dimensi paling lengkap menang (mis. rule per-project lebih spesifik dari rule global).

## 6. Model Data (untuk implementasi)

```text
doa_rule
├── id
├── transaction_type        (mis. "PurchaseOrder")
├── legal_entity_id         (null = semua)
├── business_unit_id        (null = semua)
├── project_id              (null = semua)
├── currency_code           (null = semua)
├── amount_from, amount_to  (batas nominal)
├── risk_level              (null = semua)
├── contract_category       (null = semua)
├── approver_level          (L1..L6)
├── approval_mode           (SEQUENTIAL | PARALLEL)
├── priority                (int — tie-breaker kekhususan)
├── effective_from, effective_to
└── status                  (ACTIVE)
```

## 7. Aturan

1. **Configurable:** perubahan threshold/approver tidak butuh code change — via data `doa_rule`.
2. **Effective-dated:** perubahan authority punya masa berlaku (§15.2).
3. **Bukan permission:** user harus punya permission aksi terkait DAN masuk level approver DoA.
4. **Maker-checker:** final approver ≠ requester (BR-003).
5. **Privileged actions:** fiscal period close, vendor bank change, payment release = selalu high-risk + multi-approval (§27.4).
6. **Escalation:** bila SLA approval terlewati, workflow eskalasi (lihat Workflow-Spec).

---

*Lihat juga: [[Permission-Matrix]], [[SoD-Catalogue]], [[Workflow-Spec]]. Referensi lengkap: [[PRD]].*
