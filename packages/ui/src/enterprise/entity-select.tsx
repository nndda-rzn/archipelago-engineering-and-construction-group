import * as React from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Input } from '../primitives/input';
import { cn } from '../lib/cn';

/**
 * EntitySelect — dropdown dengan pencarian client-side.
 * Menggantikan <select> flat untuk daftar panjang (project, entity, vendor, dll).
 */
export interface EntitySelectOption {
  value: string;
  label: string;
}

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
}

export function EntitySelect({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih…',
  emptyText = 'Tidak ada data',
  searchPlaceholder = 'Cari…',
  disabled,
  error,
  className,
}: EntitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

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
      <SelectTrigger error={error} disabled={disabled} className={className}>
        <SelectValue placeholder={placeholder}>{selectedLabel ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="sticky top-0 border-b border-neutral-100 bg-white p-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 pl-7 text-body-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-body-sm text-neutral-500">{emptyText}</div>
        ) : (
          filtered.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
