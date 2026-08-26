import { useState } from 'react';
import { Badge, Button, Input } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useAdvanceAudit, useCompleteAccessReview, useMitigateRisk, useRespondFinding, useUpdateLegalCaseStatus } from '../model/governance.api';
import type { AccessReview, AuditEngagement, AuditFinding, LegalCase, Risk } from '@aec/api-contracts';

export const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  MITIGATED: 'default',
  CLOSED: 'success',
  PLANNED: 'default',
  FIELDWORK: 'default',
  FINDINGS: 'warning',
  COMPLETED: 'success',
  SETTLED: 'success',
  WON: 'success',
  LOST: 'warning',
  IN_PROGRESS: 'default',
  SCHEDULED: 'default',
};

const riskHelper = createColumnHelper<Risk>();
const auditHelper = createColumnHelper<AuditEngagement>();
const findingHelper = createColumnHelper<AuditFinding>();
const legalHelper = createColumnHelper<LegalCase>();
const reviewHelper = createColumnHelper<AccessReview>();

export const riskColumns = [
  riskHelper.accessor('riskNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  riskHelper.accessor('title', {
    header: 'Risk',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  riskHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  riskHelper.accessor('likelihood', {
    header: 'L',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span>,
  }),
  riskHelper.accessor('impact', {
    header: 'I',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span>,
  }),
  riskHelper.accessor('score', {
    header: 'Skor',
    cell: (info) => <Badge variant={Number(info.getValue()) >= 12 ? 'warning' : Number(info.getValue()) >= 6 ? 'default' : 'success'}>{info.getValue()}</Badge>,
  }),
  riskHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  riskHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const mitigate = useMitigateRisk();
      if (row.original.status === 'CLOSED' || row.original.status === 'MITIGATED') return null;
      return (
        <Button size="sm" variant="secondary" loading={mitigate.isPending} onClick={() => mitigate.mutate({ id: row.original.id, residualLikelihood: 2, residualImpact: 2 })}>
          Mitigasi
        </Button>
      );
    },
  }),
];

export const auditColumns = [
  auditHelper.accessor('auditNumber', {
    header: 'No. Audit',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  auditHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  auditHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  auditHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const advance = useAdvanceAudit();
      const next: Record<string, string> = { PLANNED: 'FIELDWORK', FIELDWORK: 'FINDINGS', FINDINGS: 'CLOSED' };
      const to = next[row.original.status];
      if (!to) return null;
      return (
        <Button size="sm" variant="secondary" loading={advance.isPending} onClick={() => advance.mutate({ id: row.original.id, status: to })}>
          → {to}
        </Button>
      );
    },
  }),
];

export const findingColumns = [
  findingHelper.accessor('title', {
    header: 'Finding',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  findingHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <Badge variant={info.getValue() === 'HIGH' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  findingHelper.accessor('response', {
    header: 'Respons',
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  findingHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  findingHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const respond = useRespondFinding();
      if (row.original.status === 'VERIFIED') return null;
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={respond.isPending} onClick={() => respond.mutate({ id: row.original.id, response: 'diterima', status: 'ACCEPTED' })}>
            Terima
          </Button>
          <Button size="sm" variant="ghost" loading={respond.isPending} onClick={() => respond.mutate({ id: row.original.id, status: 'VERIFIED' })}>
            Verified
          </Button>
        </div>
      );
    },
  }),
];

export const legalColumns = [
  legalHelper.accessor('caseNumber', {
    header: 'No. Kasus',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  legalHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  legalHelper.accessor('caseType', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  legalHelper.accessor('counterpart', {
    header: 'Pihak Lawan',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '-'}</span>,
  }),
  legalHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  legalHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const update = useUpdateLegalCaseStatus();
      if (['WON', 'LOST', 'SETTLED'].includes(row.original.status)) return null;
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: 'IN_PROGRESS' })}>
            Proses
          </Button>
          <Button size="sm" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: 'SETTLED' })}>
            Selesai
          </Button>
        </div>
      );
    },
  }),
];

export const reviewColumns = [
  reviewHelper.accessor('reviewNumber', {
    header: 'No. Review',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  reviewHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  reviewHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  reviewHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const complete = useCompleteAccessReview();
      if (row.original.status === 'COMPLETED') return null;
      return (
        <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ id: row.original.id })}>
          Selesaikan
        </Button>
      );
    },
  }),
];
