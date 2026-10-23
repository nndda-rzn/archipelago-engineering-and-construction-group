import * as React from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Input } from '../primitives/input';
import { cn } from '../lib/cn';

export interface EntitySelectOption {
  value: string;
  label: string;
}

/**
 * Varian visual.
 *
 * `default` — gaya lama (radius, shadow, aksen merah, animasi masuk). Dipakai
 * 15 layar yang belum dirombak, jadi sengaja TIDAK diubah agar tidak ada
 * perubahan tak terduga di tempat lain.
 *
 * `editorial` — mengikuti bahasa visual halaman yang sudah dirombak: rectilinear
 * tanpa radius, garis rambut, tanpa shadow, tanpa animasi masuk, dan hierarki
 * lewat opacity bukan hue. Penanda terpilih memakai latar tipis, bukan centang
 * merah, karena warna merah di halaman-halaman itu disimpan untuk nilai negatif.
 */
export type EntitySelectVariant = 'default' | 'editorial';

export interface EntitySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: EntitySelectOption[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  variant?: EntitySelectVariant;
}

const TRIGGER: Record<EntitySelectVariant, string> = {
  default: '',
  editorial:
    'rounded-none border-neutral-300 focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20',
};

const CONTENT: Record<EntitySelectVariant, string> = {
  default: '',
  editorial:
    'rounded-none border-neutral-300 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none',
};

const ITEM: Record<EntitySelectVariant, string> = {
  default: '',
  editorial:
    'rounded-none px-2 py-1.5 data-[state=checked]:bg-neutral-100 data-[state=checked]:text-neutral-950',
};

export function EntitySelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  emptyText = 'No data',
  searchPlaceholder = 'Search…',
  disabled,
  error,
  className,
  id,
  variant = 'default',
}: EntitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const editorial = variant === 'editorial';

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQuery('');
      }}
    >
      <SelectTrigger id={id} error={error} disabled={disabled} className={cn(TRIGGER[variant], className)}>
        <SelectValue placeholder={placeholder}>{selectedLabel ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent className={CONTENT[variant]}>
        <div className={cn('sticky top-0 border-b bg-white p-1.5', editorial ? 'border-neutral-200' : 'border-neutral-100')}>
          <div className="relative">
            <Search
              className={cn(
                'pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
                editorial ? 'text-neutral-900/40' : 'text-neutral-400',
              )}
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={cn('h-8 pl-7 text-body-sm', editorial && 'rounded-none border-neutral-300')}
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-body-sm text-neutral-500">{emptyText}</div>
        ) : (
          filtered.map((o) => (
            <SelectItem key={o.value} value={o.value} className={ITEM[variant]}>
              {o.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
