# Physical ERD — Foundation

> Referensi: PRD §16 (database requirements), §11.1, §15.
> Implementasi: PostgreSQL (schema per domain — §16.2). Prisma source: `apps/api/prisma/schema.prisma`.
> Exit Criteria §49 item 2.

---

## 1. Diagram

```text
LegalEntity ───────────────────────────┐
   │ (1)                                 │ (1)
   │ n                                   │ n
Organization ── self-hierarchy          │
   │ (1)                                 │
   │ n                                   │
   │                                     │
User ───────────────────────────────────┤
   │ (1)                                 │
   │ n                                   │
UserRole ── effective-dated             │
   │ n                                   │ (1)
   │ (1)                                 │
Role ───────────────────────────────────┤
   │ (1)                                 │
   │ n                                   │
RolePermission ── scope                 │
   │ n                                   │ (1)
   │ (1)                                 │
Permission ─────────────────────────────┘

NumberSequence (independen)
```

## 2. Tabel

### foundation.legal_entities
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK (cuid) |
| code | text | NOT NULL, UNIQUE |
| legal_name | text | NOT NULL |
| tax_identifier | text | NOT NULL, UNIQUE |
| country | text | NOT NULL |
| functional_currency | text | DEFAULT 'IDR' |
| reporting_currency | text | DEFAULT 'IDR' |
| fiscal_calendar | text | DEFAULT 'STANDARD' |
| status | text | DEFAULT 'ACTIVE' |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | |

Index: `code` (unique), `tax_identifier` (unique), `status`.

### foundation.organizations
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK |
| legal_entity_id | text | FK → legal_entities, NOT NULL |
| name | text | NOT NULL |
| org_type | text | NOT NULL |
| parent_id | text | FK → organizations, NULL |
| effective_from | timestamptz | NOT NULL |
| effective_to | timestamptz | NULL |
| status | text | DEFAULT 'ACTIVE' |
| created_at, updated_at | timestamptz | |

Index: `legal_entity_id`, `parent_id`, `effective_from`, `effective_to`. Partial: aktif (`status='ACTIVE'`).

### foundation.users
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK |
| username | text | NOT NULL, UNIQUE |
| email | text | NOT NULL, UNIQUE |
| display_name | text | NOT NULL |
| legal_entity_id | text | FK → legal_entities, NULL |
| organization_id | text | FK → organizations, NULL |
| status | text | DEFAULT 'ACTIVE' |
| last_login_at | timestamptz | NULL |
| created_at, updated_at | timestamptz | |

Index: `username` (unique), `email` (unique), `legal_entity_id`, `organization_id`.

### foundation.roles
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK |
| code | text | NOT NULL, UNIQUE |
| name | text | NOT NULL |
| description | text | NULL |
| status | text | DEFAULT 'ACTIVE' |
| created_at, updated_at | timestamptz | |

Index: `code` (unique).

### foundation.permissions
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK |
| code | text | NOT NULL, UNIQUE |
| resource | text | NOT NULL |
| action | text | NOT NULL |
| description | text | NULL |

Index: `code` (unique). Partial unique: (resource, action).

### foundation.role_permissions
| Kolom | Tipe | Constraint |
|---|---|---|
| role_id | text | FK → roles, ON DELETE CASCADE |
| permission_id | text | FK → permissions, ON DELETE CASCADE |
| scope_type | text | DEFAULT 'GLOBAL' |
| scope_value | text | DEFAULT '' |
| **PK** | (role_id, permission_id, scope_type, scope_value) | |

Index: `permission_id`.

### foundation.user_roles
| Kolom | Tipe | Constraint |
|---|---|---|
| user_id | text | FK → users, ON DELETE CASCADE |
| role_id | text | FK → roles, ON DELETE CASCADE |
| effective_from | timestamptz | NOT NULL DEFAULT now() |
| effective_to | timestamptz | NULL |
| **PK** | (user_id, role_id, effective_from) | |

Index: `role_id`.

### foundation.number_sequences
| Kolom | Tipe | Constraint |
|---|---|---|
| id | text | PK |
| code | text | NOT NULL, UNIQUE |
| prefix | text | NOT NULL |
| next_number | int | DEFAULT 1 |
| padding | int | DEFAULT 6 |
| status | text | DEFAULT 'ACTIVE' |
| created_at, updated_at | timestamptz | |

Index: `code` (unique).

## 3. Aturan Constraint & Perilaku

- **Soft delete:** data master tidak di-hard delete — pakai `status` (BR-015, §15.3). `ON DELETE CASCADE` hanya untuk assignment (RolePermission, UserRole), bukan master.
- **Effective-dated:** Organization & UserRole tidak dihapus — ditutup via `effective_to`. Query historis: `effective_from <= :tanggal AND (effective_to IS NULL OR effective_to > :tanggal)`.
- **Immutability:** audit tidak disimpan di sini (audit event terpisah di tabel audit domain foundation, fase berikut).
- **Schema placement:** semua tabel di schema `foundation` PostgreSQL (saat ini Prisma default `public` — target migration ke multi-schema: ADR-002).
- **PK komposit:** RolePermission & UserRole memakai composite primary key (bukan surrogate id) untuk menjaga keunikan assignment.

## 4. Migrasi Berikutnya (antrian)

1. Multi-schema PostgreSQL: pindahkan ke `foundation.*` (saat ini `public` — ADR-002).
2. Postgres enum untuk status/org_type/scope_type (saat ini string — evaluasi saat multi-schema).
3. Index tambahan sesuai query pattern nyata.
4. Tabel audit (§28) — fase foundation lanjut.
5. Project assignment (FR-FND-003) — saat domain Project aktif.

---

*Lihat juga: [[Domain-Model-Foundation]], [[Database-Strategy]], [[Module-Map]]. Referensi lengkap: [[PRD]].*
