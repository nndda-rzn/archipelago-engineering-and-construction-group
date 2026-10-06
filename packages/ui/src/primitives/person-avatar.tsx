import { cn } from '../lib/cn';
import { initialsFrom } from './entity-avatar';

export interface PersonAvatarProps {
  /** Nama orang, sumber inisial. Kosong berarti pemegang tidak diketahui. */
  name?: string | null;
  /** `sm` (20px) untuk baris padat, `md` (24px) daftar, `lg` (32px) kepala panel. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<PersonAvatarProps['size']>, string> = {
  sm: 'h-5 w-5 text-[9px]',
  md: 'h-6 w-6 text-[10px]',
  lg: 'h-8 w-8 text-caption',
};

/**
 * Avatar **orang**: bulat, berbeda dari `EntityAvatar` yang persegi untuk entitas
 * (proyek, klien). Bentuk itulah sinyalnya, bukan warnanya.
 *
 * Warna sengaja netral: aturan proyek melarang warna di luar token, dan warna
 * per-orang akan bersaing dengan status. Identitas dibawa oleh **inisial**.
 *
 * `aria-hidden` disengaja: nama orang selalu ada tepat di sebelahnya, jadi
 * memberi label akan membuat pembaca layar menyebut nama dua kali.
 *
 * Nama kosong tidak pernah digambar sebagai inisial palsu: ia menjadi cincin
 * **putus** dengan tanda tanya, sehingga data yang hilang terlihat hilang
 * (bukan tampak seperti orang yang tidak ada).
 */
export function PersonAvatar({ name, size = 'md', className }: PersonAvatarProps) {
  const known = typeof name === 'string' && name.trim().length > 0;
  return (
    <span
      data-slot="person-avatar"
      data-unknown={known ? undefined : 'true'}
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border font-medium tracking-tight',
        SIZE_CLASS[size],
        known
          ? 'border-neutral-200 bg-neutral-100 text-neutral-700'
          : 'border-dashed border-neutral-300 bg-white text-neutral-400',
        className,
      )}
    >
      {known ? initialsFrom(name!) : '?'}
    </span>
  );
}

export interface AvatarStackProps {
  names: string[];
  /** Maksimum avatar yang digambar sebelum muncul `+N`. Default 3. */
  max?: number;
  size?: PersonAvatarProps['size'];
  className?: string;
}

/**
 * Tumpukan avatar untuk beberapa pemegang. `aria-label` memuat **seluruh** nama,
 * bukan hanya yang tampak, karena `+N` tidak terbaca oleh pembaca layar.
 */
export function AvatarStack({ names, max = 3, size = 'sm', className }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  const label = names.length > 0 ? names.join(', ') : 'No one';

  return (
    <span
      data-slot="avatar-stack"
      role="img"
      aria-label={`${names.length} approver${names.length === 1 ? '' : 's'}: ${label}`}
      className={cn('inline-flex items-center', className)}
    >
      {shown.map((n, i) => (
        <PersonAvatar
          key={`${n}-${i}`}
          name={n}
          size={size}
          className={cn('ring-2 ring-white', i > 0 && '-ml-2')}
        />
      ))}
      {overflow > 0 && (
        <span
          data-slot="avatar-overflow"
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-200 font-medium text-neutral-600 ring-2 ring-white',
            SIZE_CLASS[size],
            shown.length > 0 && '-ml-2',
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
