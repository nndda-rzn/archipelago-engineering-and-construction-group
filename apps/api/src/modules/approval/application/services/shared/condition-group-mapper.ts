import { Prisma } from '@prisma/client';
import type { ConditionGroup } from '@aec/api-contracts';

/** Ambang yang dipakai langkah (Decimal di DB) → number untuk kontrak. */
export function toNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Bentuk grup syarat yang disimpan (JSON) → bentuk kontrak. Prisma mengembalikan
 * `JsonValue`, jadi bentuknya diverifikasi di sini, bukan di-cast buta: data yang
 * cacat di DB tidak boleh menjadi `undefined` yang menjalar ke UI.
 */
export function toConditionGroup(value: Prisma.JsonValue | null): ConditionGroup | null {
  return toConditionGroupLoose(value);
}

/** Varian longgar: menerima `unknown` (mis. nilai JSON tak bertipe dari insights). */
export function toConditionGroupLoose(value: unknown): ConditionGroup | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as { combinator?: unknown; conditions?: unknown };
  const combinator = raw.combinator === 'OR' ? 'OR' : raw.combinator === 'AND' ? 'AND' : null;
  if (!combinator || !Array.isArray(raw.conditions)) return null;
  const OPS = ['>', '<', '>=', '<=', '=='] as const;
  const conditions = raw.conditions
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({ field: String(c.field), op: String(c.op), value: Number(c.value) }))
    .filter((c) => Number.isFinite(c.value))
    .map((c) => ({ field: c.field, op: (OPS as readonly string[]).includes(c.op) ? (c.op as ConditionGroup['conditions'][number]['op']) : ('>' as const), value: c.value }));
  if (conditions.length === 0) return null;
  return { combinator, conditions };
}

/**
 * Grup → nilai JSON Prisma. Dikonversi ke bentuk polos (bukan objek kelas DTO)
 * agar lolos tipe `InputJsonValue` Prisma tanpa cast yang menyembunyikan bentuk.
 */
export function toJsonInput(group: ConditionGroup | null | undefined): Prisma.InputJsonValue | undefined {
  if (group == null) return undefined;
  return { combinator: group.combinator, conditions: group.conditions.map((c) => ({ field: c.field, op: c.op, value: c.value })) };
}

/**
 * Kolom tunggal yang dicerminkan dari aturan pertama sebuah grup.
 *
 * Grup adalah sumber kebenaran, tetapi kolom tunggal tetap diisi supaya data
 * tetap terbaca oleh kode/pembaca lama dan diff antar versi tetap bermakna.
 */
export function mirrorFirstCondition(group: ConditionGroup | null | undefined): {
  conditionField: string | null;
  conditionOp: string | null;
  conditionValue: number | null;
} {
  const first = group?.conditions[0];
  if (!first) return { conditionField: null, conditionOp: null, conditionValue: null };
  return { conditionField: first.field, conditionOp: first.op, conditionValue: first.value };
}
