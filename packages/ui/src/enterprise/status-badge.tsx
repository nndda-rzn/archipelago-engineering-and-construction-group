import * as React from 'react';
import { CheckCircle2, XCircle, Clock, CircleDashed, FilePen, Send, Ban, Eye, Rocket, Lock } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, type BadgeProps } from '../primitives/badge';

export type StatusKey =
  | 'DRAFT'
  | 'DRAFT_APPROVED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'
  | 'POSTED'
  | 'CANCELLED'
  | 'PENDING'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

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
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  RELEASED: { label: 'Released', variant: 'info', icon: Rocket },
  POSTED: { label: 'Posted', variant: 'success-filled', icon: Lock },
  CANCELLED: { label: 'Cancelled', variant: 'muted', icon: Ban },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  ACTIVE: { label: 'Active', variant: 'success', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactive', variant: 'muted', icon: CircleDashed },
  ARCHIVED: { label: 'Archived', variant: 'muted', icon: Ban },
  IN_PROGRESS: { label: 'In Progress', variant: 'info', icon: Clock },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
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