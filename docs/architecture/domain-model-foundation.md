# Canonical Domain Model — Foundation

> Referensi: PRD §9.1 (scope), §11.1 (functional requirements), §12 (state standards), §15 (data requirements).
> Tujuan: definisi entitas, value object, agregat, invariant, dan state machine domain Foundation — acuan implementasi & ERD.
> Exit Criteria §49 item 1.

---

## 1. Batas Domain

**Foundation** adalah domain pendukung (supporting) — dipakai banyak domain lain (PRD §18.1). Bukan domain bisnis inti, tapi menyediakan infrastruktur identitas, akses, dan konfigurasi enterprise.

**Tanggung jawab:**
- Multi-legal entity (FR-FND-001)
- Struktur organisasi effective-dated (FR-FND-002, FR-FND-003)
- RBAC: User, Role, Permission, Scope (FR-FND-004)
- SoD (FR-FND-005), DoA (FR-FND-006)
- Workflow & approval (FR-FND-007)
- Audit (FR-FND-008)
- Number sequence (FR-FND-009)
- Currency & fiscal period (FR-FND-010, FR-FND-011)
- Document metadata (FR-FND-012)

**Tidak boleh:** menyimpan data bisnis domain lain (project, vendor, dsb). Referensi silang lewat identifier + interface.

## 2. Entitas Utama

### 2.1 LegalEntity

Representasi badan hukum (FR-FND-001).

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string (cuid) | PK |
| code | string (unique) | company code, mis. `AEC-CON` |
| legalName | string | nama resmi |
| taxIdentifier | string (unique) | NPWP/identitas pajak |
| country | string | ISO 3166 |
| functionalCurrency | string (default IDR) | mata uang internal (§11.1) |
| reportingCurrency | string (default IDR) | mata uang pelaporan |
| fiscalCalendar | string (default STANDARD) | referensi kalender fiskal |
| status | MasterDataStatus | ACTIVE/BLOCKED/INACTIVE/ARCHIVED |
| createdAt/updatedAt | datetime | audit dasar |

**Invariant:**
- `code` & `taxIdentifier` unik.
- Transaksi baru hanya boleh memakai entity `ACTIVE` (BR-004).
- Perubahan entity (terutama bank/tax) = high-risk change (BR-008 analog).

### 2.2 Organization

Struktur organisasi hierarkis, effective-dated (FR-FND-002).

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string | PK |
| legalEntityId | FK LegalEntity | pemilik hukum |
| name | string | |
| orgType | enum | GROUP/LEGAL_ENTITY/BUSINESS_UNIT/DIVISION/REGION/BRANCH/DEPARTMENT/SECTION (§8.1) |
| parentId | FK Organization? | hierarki |
| effectiveFrom | datetime | mulai berlaku |
| effectiveTo | datetime? | akhir berlaku (null = aktif) |
| status | MasterDataStatus | |

**Invariant:**
- Sistem harus bisa jawab struktur pada tanggal historis: `effectiveFrom ≤ tanggal ≤ effectiveTo`.
- Hierarki bebas siklus (self-reference harus non-cycle).
- `orgType` mengikuti hirarki §8.1 (Group di atas LegalEntity).

### 2.3 User

Pengguna sistem (kaitan ke employee HCM di fase berikut).

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string | PK |
| username | string (unique) | |
| email | string (unique) | |
| displayName | string | |
| legalEntityId | FK LegalEntity? | home entity (FR-FND-003) |
| organizationId | FK Organization? | home organization |
| status | MasterDataStatus | |
| lastLoginAt | datetime? | |

**Value terkait (fase lanjut):** project assignment, project role, allocation %, project access scope (FR-FND-003).

### 2.4 Role

Peran dengan akses ke resource/action/scope (FR-FND-004).

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string | PK |
| code | string (unique) | mis. `BUYER`, `PROCUREMENT_MANAGER` |
| name | string | |
| description | string? | |
| status | MasterDataStatus | |

### 2.5 Permission

Izin tunggal pada resource + action.

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string | PK |
| code | string (unique) | mis. `PurchaseOrder.APPROVE` |
| resource | string | mis. `PurchaseOrder` |
| action | string | mis. `APPROVE` |

### 2.6 RolePermission (assignment permission ke role)

| Atribut | Tipe | Catatan |
|---|---|---|
| roleId | FK Role | |
| permissionId | FK Permission | |
| scopeType | enum | GLOBAL / LEGAL_ENTITY / BUSINESS_UNIT / PROJECT |
| scopeValue | string (default "") | id entity/project bila scope terbatas |

**Invariant:** kombinasi (roleId, permissionId, scopeType, scopeValue) unik (PK komposit).

### 2.7 UserRole (assignment user ke role, effective-dated)

| Atribut | Tipe | Catatan |
|---|---|---|
| userId | FK User | |
| roleId | FK Role | |
| effectiveFrom | datetime | |
| effectiveTo | datetime? | |

**Invariant:** assignment time-bounded; sistem jawab akses historis (§15.2).

### 2.8 NumberSequence

Generator nomor dokumen configurable (FR-FND-009).

| Atribut | Tipe | Catatan |
|---|---|---|
| id | string | PK |
| code | string (unique) | mis. `PR`, `PO`, `PRJ` |
| prefix | string | mis. `PR-2027-EPC-` |
| nextNumber | int | increment |
| padding | int | panjang angka |
| status | MasterDataStatus | |

**Contoh hasil:** `PR-2027-EPC-000001`, `PO-2027-EPC-000001`, `PRJ-2027-014`.

## 3. Value Objects

| Value Object | Definisi | Pemakaian |
|---|---|---|
| `PermissionKey` | `resource.action` (mis. `PurchaseOrder.APPROVE`) | Permission.code |
| `Scope` | `{ type: ScopeType, value: string }` | RolePermission.scopeType/scopeValue |
| `DocumentNumber` | string hasil number sequence | dihasilkan NumberSequence |
| `CurrencyCode` | ISO 4217 | LegalEntity.*Currency |
| `EffectiveDateRange` | `{ from, to? }` validitas | Organization, UserRole |

## 4. Agregat & Boundary

| Agregat | Root | Boundary |
|---|---|---|
| LegalEntity | LegalEntity | mandiri |
| Organization | Organization | mandiri (self-hierarchy) |
| User | User | mandiri |
| Role (dengan RolePermission) | Role | RolePermission milik Role |
| Permission | Permission | mandiri (katalog) |
| UserRole | User | bagian dari User |

**Rule:**
- RolePermission hanya bisa diubah lewat agregat Role (tidak standalone).
- UserRole hanya bisa diubah lewat agregat User.

## 5. State Machines

### 5.1 Master Data (LegalEntity, Organization, User, Role, NumberSequence)

```text
DRAFT → PENDING_REVIEW → ACTIVE
ACTIVE → BLOCKED
BLOCKED → ACTIVE
ACTIVE → INACTIVE
INACTIVE → ACTIVE (reactivate, butuh governance) | ARCHIVED
ARCHIVED (terminal)
```

Enforcement: hanya `ACTIVE` boleh dipakai transaksi baru (BR-004).

### 5.2 Transaction Umum (approval-bound)

```text
DRAFT → SUBMITTED → UNDER_REVIEW
UNDER_REVIEW → RETURNED → DRAFT
UNDER_REVIEW → APPROVED
UNDER_REVIEW → REJECTED
APPROVED → RELEASED → COMPLETED → CLOSED
APPROVED → CANCELLED
```

### 5.3 Financial (hanya DRAFT/APPROVED/POSTED/REVERSED)

```text
DRAFT → APPROVED → POSTED
POSTED → REVERSED (koreksi via reversal, tidak edit)
```

## 6. Invariant Lintas Entitas

- BR-003 (maker-checker): requester ≠ final approver saat maker-checker required.
- BR-005 (project transaction): project dimension valid — dipakai domain lain, foundation menyediakan scope PROJECT.
- SoD (FR-FND-005): kombinasi akses konflik dilarang diberikan ke user yang sama (lihat SoD-Catalogue).
- DoA (FR-FND-006): approver ditentukan rule, bukan hardcoded (lihat DoA-Matrix).

## 7. Hubungan ke Domain Lain (interface)

Foundation menyediakan interface (bukan mutasi langsung):

| Interface | Konsumen | Fungsi |
|---|---|---|
| `IPermissionService` | semua modul | cek `hasPermission(userId, resource, action, scope)` |
| `IDelegationOfAuthorityService` | approval | resolve approver per rule DoA |
| `IAuditService` | semua modul | catat audit event (§28) |
| `INumberSequenceService` | modul dengan nomor dokumen | hasilkan nomor |
| `ICurrentUserContext` | semua | user aktif + scope |

Domain lain **tidak boleh** akses tabel foundation langsung (BR-014) — lewat interface ini.

---

*Lihat juga: [[Physical-ERD-Foundation]], [[Permission-Matrix]], [[SoD-Catalogue]], [[DoA-Matrix]], [[Workflow-Spec]]. Referensi lengkap: [[PRD]].*
