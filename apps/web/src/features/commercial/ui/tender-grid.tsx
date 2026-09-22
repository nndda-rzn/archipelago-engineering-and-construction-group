import { Badge, Button, StatusBadge } from '@aec/ui';
import { createColumnHelper } from '@tanstack/react-table';
import { useApproveDeviation, useExecuteAmendment, useRejectDeviation } from '../model/tender.api';
import type { BidDecision, ContractAmendment, ContractDeviation, TenderSubmission } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';


const bidHelper = createColumnHelper<BidDecision>();
const submissionHelper = createColumnHelper<TenderSubmission>();
const deviationHelper = createColumnHelper<ContractDeviation>();
const amendmentHelper = createColumnHelper<ContractAmendment>();

export const bidColumns = [
  bidHelper.accessor('opportunity', { header: 'Opportunity', cell: (i) => <span className="text-neutral-800">{i.getValue()?.title}</span> }),
  bidHelper.accessor('decision', { header: 'Keputusan', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  bidHelper.accessor('rationale', { header: 'Alasan', cell: (i) => <span className="max-w-xs truncate text-neutral-600">{i.getValue() ?? '-'}</span> }),
  bidHelper.accessor('decidedBy', { header: 'Pembuat', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
];

export const submissionColumns = [
  submissionHelper.accessor('submissionNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  submissionHelper.accessor('opportunity', { header: 'Opportunity', cell: (i) => <span className="text-neutral-700">{i.getValue()?.title}</span> }),
  submissionHelper.accessor('channel', { header: 'Channel', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  submissionHelper.accessor('packageVersion', { header: 'Paket', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ?? '-'}</span> }),
  submissionHelper.accessor('submittedAt', { header: 'Waktu', cell: (i) => <span className="font-mono text-neutral-600">{new Date(i.getValue()).toLocaleString('id-ID')}</span> }),
  submissionHelper.accessor('fileHash', { header: 'Hash', cell: (i) => <span className="max-w-[120px] truncate font-mono text-caption text-neutral-500">{i.getValue() ?? '-'}</span> }),
  submissionHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
];

export const deviationColumns = [
  deviationHelper.accessor('clause', { header: 'Klausul', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()}</span> }),
  deviationHelper.accessor('clientRequirement', { header: 'Req. Client', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('aecPosition', { header: 'Posisi AEC', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('risk', { header: 'Risiko', cell: (i) => <Badge variant={i.getValue() === 'HIGH' ? 'warning' : 'default'}>{i.getValue()}</Badge> }),
  deviationHelper.accessor('owner', { header: 'Owner', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  deviationHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (row.original.status !== 'OPEN') return null;
      return (
        <div className="flex gap-1">
          <ApproveDeviationBtn id={row.original.id} />
          <RejectDeviationBtn id={row.original.id} />
        </div>
      );
    },
  }),
];

export const amendmentColumns = [
  amendmentHelper.accessor('amendmentNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  amendmentHelper.accessor('title', { header: 'Judul', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  amendmentHelper.accessor('amountChange', { header: 'Perubahan', cell: (i) => <span className={`font-mono tabular-nums ${i.getValue() >= 0 ? 'text-financial-positive-500' : 'text-destructive-600'}`}>{fmt(i.getValue())}</span> }),
  amendmentHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  amendmentHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ExecuteAmendmentCell amendment={row.original} />,
  }),
];

function ExecuteAmendmentCell({ amendment }: { amendment: ContractAmendment }) {
  const execute = useExecuteAmendment();
  if (amendment.status !== 'DRAFT') return null;
  return <Button size="sm" variant="secondary" loading={execute.isPending} onClick={() => execute.mutate(amendment.id)}>Eksekusi</Button>;
}

export function ApproveDeviationBtn({ id }: { id: string }) {
  const approve = useApproveDeviation();
  return <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(id)}>Approve</Button>;
}

export function RejectDeviationBtn({ id }: { id: string }) {
  const reject = useRejectDeviation();
  return <Button size="sm" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate(id)}>Reject</Button>;
}
