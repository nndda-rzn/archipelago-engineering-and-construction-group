import { Link } from '@tanstack/react-router';
import { Badge, cn } from '@aec/ui';
import type { NavItem } from './nav-config';

/**
 * Bagian presentasional sidebar: garis pemandu pohon dan baris item.
 * Dipisah dari `sidebar-nav.tsx` (orkestrasi state) agar masing-masing fokus.
 * `resolveOpenNodes`/`scrollActiveIntoView` tetap tinggal di `sidebar-nav.tsx`
 * karena diuji langsung dari sana.
 */

/**
 * Garis pemandu pohon. Elemen nyata (bukan pseudo-element) agar bisa diuji.
 * Empat bentuk:
 * - `full`   : garis leluhur setinggi baris — menjaga batang tetap menyambung
 *              melewati blok anak (mis. garis level-1 terus turun saat subgrup terbuka)
 * - `top`    : setengah batang atas, menyambung dari baris sebelumnya
 * - `bottom` : setengah batang bawah, menyambung ke baris berikutnya
 * - `stub`   : konektor horizontal dari batang ke label (bentuk ├─ / └─)
 *
 * Garis selalu netral (`neutral-200`) — tidak ikut menyala saat item aktif, dan
 * sengaja dipisah dari elemen yang bisa diklik (lihat `NavLink`).
 */
export type GuideX = 'left-5' | 'left-8';

export interface GuideSpec {
  x: GuideX;
  kind: 'full' | 'top' | 'bottom' | 'stub';
}

export function Guides({ specs }: { specs: GuideSpec[] }) {
  return (
    <>
      {specs.map((spec, index) => (
        <span
          key={index}
          data-tree-guide={spec.kind === 'full' ? 'full' : spec.kind === 'stub' ? 'stub' : `trunk-${spec.kind}`}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute bg-neutral-200',
            spec.x,
            spec.kind === 'full' && 'inset-y-0 w-px',
            spec.kind === 'top' && 'top-0 h-1/2 w-px',
            spec.kind === 'bottom' && 'bottom-0 h-1/2 w-px',
            spec.kind === 'stub' && 'top-1/2 h-px w-3 -translate-y-1/2',
          )}
        />
      ))}
    </>
  );
}

/**
 * Satu baris item. Garis tree berada di baris (`data-nav-row`), **di luar** `<a>`,
 * sehingga area klik/hover/aktif hanya membungkus tulisan — garis tidak ikut
 * tersorot. `<a>` dibiarkan selebar konten (inline-flex), bukan selebar baris.
 */
export function NavLink({ item, active, badge, x, isLast, ancestorFull, onNavigate }: { item: NavItem; active: boolean; badge?: number; x: GuideX; isLast: boolean; ancestorFull: boolean; onNavigate: () => void }) {
  const specs: GuideSpec[] = [];
  // Garis leluhur (level induk di atasnya) harus tetap turun agar tidak putus.
  if (ancestorFull) specs.push({ x: 'left-5', kind: 'full' });
  specs.push({ x, kind: 'top' });
  if (!isLast) specs.push({ x, kind: 'bottom' });
  specs.push({ x, kind: 'stub' });

  return (
    <div data-nav-row className={cn('relative flex min-h-7 items-center', x === 'left-8' ? 'pl-11' : 'pl-8')}>
      <Guides specs={specs} />
      <Link
        to={item.to}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-label={badge ? `${item.label}, ${badge} pending` : undefined}
        className={cn(
          'inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-body-sm',
          active ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
        )}
      >
        <span className="truncate">{item.label}</span>
        {badge ? (
          <Badge variant="warning" className="shrink-0 tabular-nums">
            {badge}
          </Badge>
        ) : null}
      </Link>
    </div>
  );
}
