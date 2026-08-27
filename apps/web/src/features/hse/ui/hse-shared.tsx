export const severityVariant: Record<string, 'default' | 'success' | 'warning'> = {
  LOW: 'success',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'warning',
};

export function HseDateCell({ value }: { value: string }) {
  return <span className="font-mono text-neutral-600">{new Date(value).toLocaleDateString('id-ID')}</span>;
}
