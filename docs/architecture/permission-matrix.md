# Permission Matrix — RBAC

> Referensi: PRD §11.1 FR-FND-004 (RBAC), FR-FND-005 (SoD), §7 (personas).
> Model: `Resource + Action + Scope` (FR-FND-004). Exit Criteria §49 item 4.

---

## 1. Konvensi

Permission code: `{Resource}.{Action}`

Action standar (per jenis resource):
- **Master data:** `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `ACTIVATE`, `BLOCK`, `ARCHIVE`
- **Transaksi:** `VIEW`, `CREATE`, `EDIT`, `SUBMIT`, `APPROVE`, `RELEASE`, `CANCEL`, `CLOSE`
- **Financial:** `VIEW`, `CREATE`, `APPROVE`, `POST`, `REVERSE`

ScopeType: `GLOBAL` | `LEGAL_ENTITY` | `BUSINESS_UNIT` | `PROJECT`.

## 2. Permission Foundation (baseline)

| Code | Resource | Action | Keterangan |
|---|---|---|---|
| `LegalEntity.VIEW` | LegalEntity | VIEW | lihat entity |
| `LegalEntity.CREATE` | LegalEntity | CREATE | buat entity baru |
| `LegalEntity.EDIT` | LegalEntity | EDIT | ubah data entity |
| `LegalEntity.APPROVE` | LegalEntity | APPROVE | setujui perubahan entity |
| `LegalEntity.BLOCK` | LegalEntity | BLOCK | blokir entity |
| `Organization.VIEW` | Organization | VIEW | lihat struktur org |
| `Organization.CREATE` | Organization | CREATE | buat org |
| `Organization.EDIT` | Organization | EDIT | ubah org |
| `User.VIEW` | User | VIEW | lihat user |
| `User.CREATE` | User | CREATE | buat user |
| `User.EDIT` | User | EDIT | ubah user |
| `User.ASSIGN_ROLE` | User | ASSIGN_ROLE | beri role ke user |
| `Role.VIEW` | Role | VIEW | lihat role |
| `Role.CREATE` | Role | CREATE | buat role |
| `Role.EDIT` | Role | EDIT | ubah role + permission assignment |
| `Role.DELETE` | Role | DELETE | hapus role (hanya belum dipakai) |
| `Permission.VIEW` | Permission | VIEW | lihat katalog permission |
| `NumberSequence.VIEW` | NumberSequence | VIEW | lihat konfigurasi |
| `NumberSequence.EDIT` | NumberSequence | EDIT | ubah konfigurasi |
| `Audit.VIEW` | Audit | VIEW | lihat jejak audit |
| `FiscalPeriod.VIEW` | FiscalPeriod | VIEW | lihat periode fiskal |
| `FiscalPeriod.CLOSE` | FiscalPeriod | CLOSE | tutup periode (§27.4 high-risk) |

## 3. Permission per Domain Bisnis (kanvas — diisi bertahap per fase)

Kanvas — masing-masing domain mengikuti pola sama. Contoh:

| Resource | Actions |
|---|---|
| `Opportunity` | VIEW, CREATE, EDIT, SUBMIT, APPROVE |
| `Contract` | VIEW, CREATE, EDIT, SUBMIT, APPROVE, RELEASE |
| `Project` | VIEW, CREATE, EDIT, APPROVE |
| `WBS` | VIEW, CREATE, EDIT |
| `Budget` | VIEW, CREATE, EDIT, PUBLISH, APPROVE |
| `PurchaseRequisition` | VIEW, CREATE, EDIT, SUBMIT, APPROVE |
| `PurchaseOrder` | VIEW, CREATE, EDIT, SUBMIT, APPROVE, RELEASE |
| `GoodsReceipt` | VIEW, CREATE, POST |
| `VendorInvoice` | VIEW, CREATE, SUBMIT, APPROVE, POST |
| `Journal` | VIEW, CREATE, APPROVE, POST, REVERSE |
| `Payment` | VIEW, CREATE, APPROVE, RELEASE |

## 4. Role → Permission (baseline awal)

| Role | Permission (ringkas) |
|---|---|
| `SUPER_ADMIN` | semua permission (GLOBAL) |
| `LEGAL_ENTITY_ADMIN` | LegalEntity.*, Organization.* |
| `USER_ADMIN` | User.*, Role.* |
| `AUDITOR` | `*.VIEW` (GLOBAL, read-only) |
| `BUYER` | PurchaseRequisition.CREATE/EDIT/SUBMIT, PurchaseOrder.CREATE/EDIT, Vendor.* VIEW |
| `PROCUREMENT_MANAGER` | Buyer + PurchaseRequisition.APPROVE, PurchaseOrder.APPROVE, Vendor.* CREATE/EDIT |
| `FINANCE_CONTROLLER` | Journal.*, FiscalPeriod.CLOSE, Audit.VIEW |
| `PROJECT_MANAGER` | Project.*, WBS.*, Budget.* (scope PROJECT) |

Penetapan penuh per role mengikuti fase implementasi. Versi lengkap dipelihara di sini + di `packages/shared-types` (seed).

## 5. Aturan Penetapan

1. **Scope dibatasi:** permission dengan ScopeType `PROJECT` hanya berlaku untuk project yang di-assign (FR-FND-003, Scenario I §47).
2. **Minimal privilege:** berikan permission minimum yang dibutuhkan role.
3. **Permission ≠ DoA:** permission = apakah user **boleh** melakukan action; DoA = **siapa** yang harus approve transaksi dengan amount tertentu. Keduanya terpisah (§14).
4. **SoD:** assignment tidak boleh melanggar konflik SoD (lihat SoD-Catalogue).
5. **Read vs Write:** auditor/viewer hanya `.VIEW`; aksi kritis (APPROVE, POST, RELEASE) permission terpisah.

## 6. Enforcement

- Backend wajib enforce di tiap endpoint (NFR-SEC-001) — frontend hanya UX.
- `PermissionGuard` di web + `@Permissions()` decorator/guard di api.
- Denial dicatat (audit + metrik permission denial count, §45.2).

---

*Lihat juga: [[SoD-Catalogue]], [[DoA-Matrix]], [[Domain-Model-Foundation]]. Referensi lengkap: [[PRD]].*
