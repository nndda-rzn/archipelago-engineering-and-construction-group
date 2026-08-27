export const engStatusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ISSUED: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  ANSWERED: 'success',
  CLOSED: 'success',
  REJECTED: 'warning',
  OPEN: 'warning',
  SUBMITTED: 'default',
};

export function EngDateCell({ value }: { value?: string | null }) {
  return <span className="font-mono text-neutral-600">{value ? new Date(value).toLocaleDateString('id-ID') : '—'}</span>;
}
