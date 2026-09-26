

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

/** Unit + pluralisasi Inggris untuk waktu relatif. Format angka & tanggal `id-ID` (standar bank nasional). */
function ago(value: number, unit: 'minute' | 'hour' | 'day') {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

export function formatRelativeTime(d: string | Date | null | undefined) {
  const date = safeDate(d);
  if (!date) return INVALID;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return ago(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days <= 7) return ago(days, 'day');
  return formatDate(date);
}
