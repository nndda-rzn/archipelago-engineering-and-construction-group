import { CONDITION_FIELDS, CONDITION_FIELD_LABELS } from '@aec/api-contracts';

/** Label operator: `==` ditampilkan sebagai `=` (lebih mudah dibaca). */
const OP_LABELS: Record<string, string> = {
  '>': '>',
  '<': '<',
  '>=': '≥',
  '<=': '≤',
  '==': '=',
};

export function opLabel(op: string | null | undefined): string {
  if (!op) return '';
  return OP_LABELS[op] ?? op;
}

/** Field yang boleh dipakai untuk jenis transaksi, dari satu sumber kebenaran di kontrak. */
export function conditionFieldsFor(transactionType: string): readonly string[] {
  return CONDITION_FIELDS[transactionType] ?? [];
}

export function conditionFieldLabel(field: string): string {
  return CONDITION_FIELD_LABELS[field] ?? field;
}

export { CONDITION_FIELDS, CONDITION_FIELD_LABELS };

/** Status versi → gaya badge. Warna bukan satu-satunya sinyal (teks selalu ada). */
export const VERSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};
