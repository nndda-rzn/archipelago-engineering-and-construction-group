import { cn } from '../lib/cn';

/**
 * Inisial dari nama entitas — **deterministik**, dipakai sebagai jangkar visual
 * di page header (Geist: "lead with a scannable identifier").
 *
 * Aturan: dua kata pertama → huruf pertama masing-masing (`"EPC Industrial…"` → `EP`);
 * satu kata → dua huruf pertama (`"Alpha"` → `AL`); nama kosong → `?` (tidak pernah crash).
 * Tanda baca diabaikan; hasil selalu huruf besar.
 */
export function initialsFrom(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-_/]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export interface EntityAvatarProps {
  /** Nama entitas — sumber inisial. */
  name: string;
  /** `md` (32px) untuk daftar, `lg` (48px) untuk page header. */
  size?: 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EntityAvatarProps['size']>, string> = {
  md: 'h-8 w-8 text-caption',
  lg: 'h-12 w-12 text-h3',
};

/**
 * Tile inisial entitas (proyek, klien, …). **Rounded square**, bukan bulat —
 * konvensi untuk entitas (bukan orang). Warna netral saja: satu-satunya sinyal
 * warna di header adalah status pill, jadi tile ini tidak boleh bersaing.
 *
 * `aria-hidden` disengaja: nama entitas selalu ada tepat di sebelahnya, sehingga
 * memberi label akan membuat pembaca layar menyebut nama dua kali.
 */
export function EntityAvatar({ name, size = 'md', className }: EntityAvatarProps) {
  return (
    <span
      data-slot="entity-avatar"
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-medium tracking-tight text-neutral-700',
        SIZE_CLASS[size],
        className,
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}
