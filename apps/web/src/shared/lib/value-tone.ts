/**
 * Semantik warna untuk angka finansial. **Nol bukanlah kondisi positif** —
 * likuiditas/kas/gap bernilai 0 dirender netral, bukan hijau.
 */
export type ValueTone = 'positive' | 'negative' | 'neutral';

export function valueTone(value: number | null | undefined): ValueTone {
  if (value == null || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

/** Kelas teks per tone — semuanya token design system. */
export const TONE_CLASS: Record<ValueTone, string> = {
  positive: 'text-financial-positive-600',
  negative: 'text-financial-negative-600',
  neutral: 'text-neutral-950',
};
