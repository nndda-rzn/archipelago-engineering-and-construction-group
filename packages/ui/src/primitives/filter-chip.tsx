import { cn } from '../lib/cn';

export interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

/** Chip "filter aktif" dengan tombol hapus. Aksesibel: tombol punya nama unik per label. */
export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-caption text-neutral-700',
        className,
      )}
    >
      {label}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="text-neutral-400 transition-colors duration-fast hover:text-neutral-700"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </span>
  );
}
