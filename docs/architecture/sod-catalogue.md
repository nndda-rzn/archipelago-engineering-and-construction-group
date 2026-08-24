# SoD Conflict Catalogue — Segregation of Duties

> Referensi: PRD §11.1 FR-FND-005 (SoD), §13 BR-003 (maker-checker), §14.3 (SoD controls).
> Exit Criteria §49 item 5.

---

## 1. Prinsip

**Segregation of Duties (SoD):** kombinasi akses yang memungkinkan fraud/misuse tidak boleh diberikan ke satu user yang sama. Sistem harus **mendeteksi** konflik ini sebelum provisioning (access request) dan saat access review berkala (§14.3, FR-GOV-004).

**Maker-Checker (BR-003):** requester tidak boleh menjadi final approver untuk transaksi yang membutuhkan maker-checker.

## 2. Konflik Tingkat 1 — Hard Conflict (dilarang ketat)

| # | Kombinasi Terlarang | Risiko |
|---|---|---|
| SOD-001 | `Vendor.CREATE` + `Vendor.APPROVE` | Membuat vendor lalu menyetujui sendiri (fiktif vendor) |
| SOD-002 | `Journal.CREATE` + `Journal.APPROVE` | Jurnal lalu menyetujui sendiri (manipulasi GL) |
| SOD-003 | `VendorInvoice.POST` + `Payment.RELEASE` | Posting tagihan lalu membayar sendiri (fraud payment) |
| SOD-004 | `PurchaseOrder.CREATE` + `PurchaseOrder.APPROVE` | PO lalu menyetujui sendiri (commitment tidak terkontrol) |
| SOD-005 | `PurchaseOrder.APPROVE` + `PurchaseOrder.RELEASE` | Menyetujui + merilis sendiri (double control hilang) |
| SOD-006 | `User.ASSIGN_ROLE` + `Role.EDIT` | Ubah role + beri role (privilege escalation) |
| SOD-007 | `LegalEntity.EDIT` + `LegalEntity.APPROVE` | Ubah entity lalu setujui sendiri |
| SOD-008 | `NumberSequence.EDIT` + transaksi yang pakai nomor tsb | Ubah sequence lalu buat dokumen (manipulasi nomor) |

## 3. Konflik Tingkat 2 — Conditional (butuh justifikasi + monitor)

| # | Kombinasi | Kondisi |
|---|---|---|
| SOD-101 | `PurchaseOrder.CREATE` + `PurchaseRequisition.APPROVE` | OK bila PR ≠ PO yang sama; monitor |
| SOD-102 | `Budget.CREATE` + `Budget.APPROVE` | Dilarang bila baseline publish — baseline wajib approver lain (FR-PRJ-005) |
| SOD-103 | `FiscalPeriod.CLOSE` + `Journal.POST` | Periode tutup lalu posting — hanya di batas periode; monitor cutoff |
| SOD-104 | `Audit.VIEW` + aksi write sensitif | Auditor dengan write access — review berkala |

## 4. Aturan Maker-Checker (BR-003)

Transaksi yang **wajib maker-checker** (requester ≠ final approver):
- Budget baseline publish (FR-PRJ-005)
- Purchase Order release (BR-007)
- Journal post (BR-001)
- Payment release (FR-TRY-002)
- Vendor bank account change (BR-008)
- Master data change high-risk (fiscal period, number sequence, contract)

Enforcement: saat approval, sistem tolak bila `requester.id == approver.id` untuk transaksi di atas.

## 5. Deteksi & Enforcement

| Tahap | Mekanisme |
|---|---|
| **Access request** | Sebelum role/permission diberikan: cek konflik terhadap permission user saat ini. Tolak + flag bila hard conflict. |
| **Runtime approval** | Maker-checker: validasi requester ≠ approver. |
| **Access review berkala** (FR-GOV-004) | Audit semua assignment; tandai konflik; corrective action. |
| **Audit** | Semua violation (ditolak / terdeteksi) dicatat sebagai audit event. |

## 6. Struktur Data SoD (untuk implementasi)

```text
sod_rule
├── id
├── code             (SOD-001)
├── permissionA_code (Vendor.CREATE)
├── permissionB_code (Vendor.APPROVE)
├── severity         (HARD | CONDITIONAL)
├── description
└── status           (ACTIVE)
```

Service `ISoDService.checkConflict(userPermissions)` → daftar violation.

---

*Lihat juga: [[Permission-Matrix]], [[DoA-Matrix]], [[Domain-Model-Foundation]]. Referensi lengkap: [[PRD]].*
