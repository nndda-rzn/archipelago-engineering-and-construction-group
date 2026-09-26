import { useState } from 'react';
import { Badge, Button, EmptyCell, Input, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useCertifyClaim } from '../model/progress-claim.api';
import type { ProgressClaim } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';

export const claimTypeLabel: Record<string, string> = {
  PROGRESS: 'Progres', COST: 'Biaya', TIME: 'Waktu', EOT: 'EOT', CONTRACTUAL: 'Kontraktual',
};

export type ProgressClaimStatus = 'DRAFT' | 'CERTIFIED' | 'REJECTED' | 'REVISED';

const columnHelper = createColumnHelper<ProgressClaim>();

export const progressClaimColumns = [
  columnHelper.accessor('claimNumber', { header: 'No. Klaim', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  columnHelper.accessor('claimType', { header: 'Tipe', cell: (i) => <Badge variant={i.getValue() === 'PROGRESS' ? 'default' : 'warning'}>{claimTypeLabel[i.getValue()] ?? i.getValue()}</Badge> }),
  columnHelper.accessor('project', { header: 'Project', cell: (i) => <span className="text-neutral-700">{i.getValue()?.code}</span> }),
  columnHelper.accessor('workPackage', { header: 'Work Package', cell: (i) => i.getValue() ? <span className="font-mono text-neutral-600">{i.getValue()!.wpNumber}</span> : <EmptyCell /> }),
  columnHelper.accessor('physicalProgressAtClaim', { header: 'Fisik', cell: (i) => i.getValue() != null ? <span className="font-mono tabular-nums text-neutral-600">{i.getValue()}%</span> : <EmptyCell /> }),
  columnHelper.accessor('billableProgress', { header: 'Billable', cell: (i) => i.getValue() != null ? <span className="font-mono tabular-nums text-neutral-700">{i.getValue()}%</span> : <EmptyCell /> }),
  columnHelper.accessor('period', { header: 'Periode', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ?? <EmptyCell />}</span> }),
  columnHelper.accessor('amount', { header: 'Nilai Klaim', cell: (i) => <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue())}</span> }),
  columnHelper.accessor('certifiedAmount', { header: 'Tersertifikasi', cell: (i) => i.getValue() != null ? <span className="font-mono tabular-nums text-neutral-700">{fmt(i.getValue()!)}</span> : <EmptyCell /> }),
  columnHelper.accessor('retentionRate', { header: 'Retensi', cell: (i) => { const rate = i.getValue(); const row = i.row.original; if (rate == null || row.status !== 'CERTIFIED') return <EmptyCell />; return <span className="font-mono tabular-nums text-neutral-600">{row.retentionAmount != null ? `${fmt(row.retentionAmount)} (${rate}%)` : `${rate}%`}</span>; } }),
  columnHelper.accessor('netCertifiedAmount', { header: 'Net', cell: (i) => i.getValue() != null ? <span className="font-mono font-medium tabular-nums text-neutral-800">{fmt(i.getValue()!)}</span> : <EmptyCell /> }),
  columnHelper.accessor('cumulativeRecovered', { header: 'DP Kembali', cell: (i) => { const row = i.row.original; const value = i.getValue(); if (row.status !== 'CERTIFIED') return <EmptyCell />; return value != null ? <span className="font-mono tabular-nums text-warning-700">{fmt(value)}</span> : <EmptyCell />; } }),
  columnHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  columnHelper.display({ id: 'actions', header: '', cell: ({ row }) => <CertifyButton claim={row.original} /> }),
];

function CertifyButton({ claim }: { claim: ProgressClaim }) {
  const certify = useCertifyClaim();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Number(claim.amount));
  const [retentionRate, setRetentionRate] = useState(5);
  if (claim.status !== 'DRAFT') return null;
  const retention = Math.round(amount * retentionRate) / 100;
  const net = Math.round((amount - retention) * 100) / 100;
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Sertifikasi</Button>;
  return (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} step={100000} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="h-8 w-32 text-right" aria-label="Nilai sertifikasi" />
      <div className="flex items-center gap-1"><Input type="number" min={0} max={100} value={retentionRate || ''} onChange={(e) => setRetentionRate(Number(e.target.value))} className="h-8 w-16 text-right" aria-label="Retensi (%)" /><span className="text-caption text-neutral-500">%</span></div>
      <span className="hidden text-caption text-neutral-500 xl:inline">{fmt(retention)} → {fmt(net)}</span>
      <Button size="sm" variant="secondary" onClick={() => certify.mutate({ id: claim.id, certifiedAmount: amount, retentionRate }, { onSuccess: () => setOpen(false) })} loading={certify.isPending}>Simpan</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
    </div>
  );
}
