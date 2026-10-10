import { formatIdr, formatIdrCompact } from '@/shared/lib/format';

/**
 * Angka uang yang menampilkan **bentuk ringkas** (`Rp 6,25 T`) agar tabel/KPI tidak
 * penuh digit, tetapi menyimpan **nominal presisi penuh** di `title` sehingga hover
 * (atau screen reader) tetap mendapat angka lengkap. Elemen `<span>` dengan `title`
 * juga ramah terhadap salinan teks.
 */
export function Money({ value, className }: { value: number; className?: string }) {
  const full = formatIdr(value);
  return (
    <span className={className} title={full}>
      {formatIdrCompact(value)}
    </span>
  );
}
