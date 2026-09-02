

export function formatIdr(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export function formatIdrCustom(n: number, currency: string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

const INVALID = '—';

function safeDate(d: string | Date | null | undefined): Date | null {
  if (d == null || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(d: string | Date | null | undefined) {
  const date = safeDate(d);
  if (!date) return INVALID;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(d: string | Date | null | undefined) {
  const date = safeDate(d);
  if (!date) return INVALID;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(d: string | Date | null | undefined) {
  const date = safeDate(d);
  if (!date) return INVALID;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} hari lalu`;
  return formatDate(date);
}
