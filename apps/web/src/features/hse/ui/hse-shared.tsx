import { formatDate } from '@/shared/lib/format';

export type HseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export function HseDateCell({ value }: { value: string }) {
  return <span className="font-mono text-neutral-600">{formatDate(value)}</span>;
}
