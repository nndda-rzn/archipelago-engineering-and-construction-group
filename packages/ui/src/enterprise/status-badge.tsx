import * as React from 'react';
import {
  CheckCircle2, XCircle, Clock, CircleDashed, FilePen, Send, Ban,
  Eye, Rocket, Lock, AlertTriangle, TrendingDown, TrendingUp, Zap,
  ShieldAlert, ShieldCheck, Wrench, UserX, Award,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, type BadgeProps } from '../primitives/badge';

export type StatusKey =
  | 'DRAFT' | 'DRAFT_APPROVED' | 'SUBMITTED' | 'UNDER_REVIEW'
  | 'APPROVED' | 'REJECTED' | 'RELEASED' | 'POSTED' | 'CANCELLED'
  | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'IN_PROGRESS' | 'COMPLETED'
  | 'LEAVER' | 'CRITICAL' | 'AT_RISK' | 'ON_TRACK' | 'NO_BUDGET'
  | 'LOST' | 'WON' | 'CLOSED_WON' | 'CLOSED_LOST'
  | 'INVESTIGATING' | 'RESOLVED' | 'REVOKED' | 'AWARD_RECONCILED'
  | 'SUPERSEDED' | 'LOCKED' | 'SOFT_CLOSED' | 'ENDED'
  | 'BREAKDOWN' | 'ASSIGNED' | 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED'
  | 'OPEN' | 'MITIGATED' | 'SETTLED' | 'PLANNED' | 'FIELDWORK' | 'FINDINGS'
  | 'EXECUTED' | 'TERMINATED' | 'AMENDED'
  | 'PASS' | 'FAIL' | 'DISPOSED' | 'VERIFIED'
  | 'FUTURE' | 'CLOSED'
  | 'POTENTIAL' | 'MATCHED'
  | 'HIGH' | 'MEDIUM' | 'LOW'
  | 'PAID';

interface StatusMeta {
  label?: string;
  variant: NonNullable<BadgeProps['variant']>;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const statusMeta: Record<StatusKey, StatusMeta> = {
  DRAFT: { label: 'Draft', variant: 'outline', icon: FilePen },
  DRAFT_APPROVED: { label: 'Draft Approved', variant: 'default', icon: FilePen },
  SUBMITTED: { label: 'Submitted', variant: 'muted', icon: Send },
  UNDER_REVIEW: { label: 'Under Review', variant: 'info', icon: Eye },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', variant: 'destructive', icon: XCircle },
  RELEASED: { label: 'Released', variant: 'info', icon: Rocket },
  POSTED: { label: 'Posted', variant: 'success-filled', icon: Lock },
  CANCELLED: { label: 'Dibatalkan', variant: 'muted', icon: Ban },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  ACTIVE: { label: 'Aktif', variant: 'success', icon: CheckCircle2 },
  INACTIVE: { label: 'Nonaktif', variant: 'muted', icon: CircleDashed },
  ARCHIVED: { label: 'Archived', variant: 'muted', icon: Ban },
  IN_PROGRESS: { label: 'In Progress', variant: 'info', icon: Clock },
  COMPLETED: { label: 'Selesai', variant: 'success', icon: CheckCircle2 },

  LEAVER: { label: 'Leaver', variant: 'muted', icon: UserX },
  CRITICAL: { label: 'Kritis', variant: 'destructive', icon: AlertTriangle },
  AT_RISK: { label: 'Berisiko', variant: 'warning', icon: TrendingDown },
  ON_TRACK: { label: 'On Track', variant: 'success', icon: TrendingUp },
  NO_BUDGET: { label: 'No Budget', variant: 'default', icon: CircleDashed },

  LOST: { label: 'Lost', variant: 'muted', icon: XCircle },
  WON: { label: 'Menang', variant: 'success', icon: Award },
  CLOSED_WON: { label: 'Menang', variant: 'success', icon: Award },
  CLOSED_LOST: { label: 'Kalah', variant: 'muted', icon: XCircle },

  INVESTIGATING: { label: 'Investigasi', variant: 'warning', icon: Eye },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
  REVOKED: { label: 'Dicabut', variant: 'destructive', icon: Ban },
  AWARD_RECONCILED: { label: 'Reconciled', variant: 'success', icon: CheckCircle2 },
  SUPERSEDED: { label: 'Diganti', variant: 'muted', icon: CircleDashed },
  LOCKED: { label: 'Terkunci', variant: 'muted', icon: Lock },
  SOFT_CLOSED: { label: 'Soft Closed', variant: 'warning', icon: Clock },
  ENDED: { label: 'Berakhir', variant: 'muted', icon: Ban },

  BREAKDOWN: { label: 'Breakdown', variant: 'destructive', icon: Zap },
  ASSIGNED: { label: 'Assigned', variant: 'info', icon: Send },
  AVAILABLE: { label: 'Tersedia', variant: 'success', icon: CheckCircle2 },
  MAINTENANCE: { label: 'Maintenance', variant: 'warning', icon: Wrench },
  RETIRED: { label: 'Retired', variant: 'muted', icon: Ban },

  OPEN: { label: 'Terbuka', variant: 'warning', icon: Clock },
  MITIGATED: { label: 'Dimitigasi', variant: 'info', icon: ShieldCheck },
  SETTLED: { label: 'Selesai', variant: 'success', icon: CheckCircle2 },
  PLANNED: { label: 'Direncanakan', variant: 'default', icon: Clock },
  FIELDWORK: { label: 'Fieldwork', variant: 'info', icon: Eye },
  FINDINGS: { label: 'Temuan', variant: 'warning', icon: AlertTriangle },

  EXECUTED: { label: 'Dieksekusi', variant: 'success', icon: CheckCircle2 },
  TERMINATED: { label: 'Diakhiri', variant: 'destructive', icon: Ban },
  AMENDED: { label: 'Diamendemen', variant: 'warning', icon: FilePen },

  PASS: { label: 'Lulus', variant: 'success', icon: CheckCircle2 },
  FAIL: { label: 'Gagal', variant: 'destructive', icon: XCircle },
  DISPOSED: { label: 'Disposed', variant: 'info', icon: Eye },
  VERIFIED: { label: 'Verified', variant: 'success', icon: ShieldCheck },

  FUTURE: { label: 'Akan Datang', variant: 'default', icon: Clock },
  CLOSED: { label: 'Ditutup', variant: 'success', icon: Lock },

  POTENTIAL: { label: 'Potensial', variant: 'default', icon: CircleDashed },
  MATCHED: { label: 'Matched', variant: 'success', icon: CheckCircle2 },

  HIGH: { label: 'Tinggi', variant: 'warning', icon: AlertTriangle },
  MEDIUM: { label: 'Sedang', variant: 'default', icon: Clock },
  LOW: { label: 'Rendah', variant: 'success', icon: CheckCircle2 },

  PAID: { label: 'Lunas', variant: 'success-filled', icon: CheckCircle2 },
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  size?: number;
}

export function StatusBadge({ status, label, className, size = 12 }: StatusBadgeProps) {
  const meta = statusMeta[status as StatusKey];
  const Icon = meta?.icon ?? CircleDashed;
  return (
    <Badge variant={meta?.variant ?? 'default'} className={cn('gap-1', className)}>
      <Icon className="shrink-0" style={{ width: size, height: size }} aria-hidden="true" />
      <span>{label ?? meta?.label ?? status}</span>
    </Badge>
  );
}
