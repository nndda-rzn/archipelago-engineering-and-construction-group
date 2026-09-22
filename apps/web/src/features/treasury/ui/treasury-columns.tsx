import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, StatusBadge } from '@aec/ui';
import {
  useApproveProposal, useReleaseProposal, useSubmitProposal,
  type BankAccount, type BankGuarantee, type PaymentProposal,
} from '../model/treasury.api';
import { formatDate, formatIdr as fmt } from '@/shared/lib/format';


const bankHelper = createColumnHelper<BankAccount>();
const proposalHelper = createColumnHelper<PaymentProposal>();
const bgHelper = createColumnHelper<BankGuarantee>();

export const bankColumns = [
  bankHelper.accessor('accountCode', { header: 'Kode', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  bankHelper.accessor('bankName', { header: 'Bank', cell: (i) => <span className="text-neutral-800 font-medium">{i.getValue()}</span> }),
  bankHelper.accessor('accountNumber', { header: 'No. Rekening', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
  bankHelper.accessor('currency', { header: 'Mata Uang', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  bankHelper.accessor('legalEntity', { header: 'Entity', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()?.code}</span> }),
  bankHelper.accessor('openingBalance', { header: 'Saldo Awal', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  bankHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
];

export const proposalColumns = [
  proposalHelper.accessor('proposalNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  proposalHelper.accessor('vendor', { header: 'Vendor', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  proposalHelper.accessor('totalAmount', { header: 'Nilai', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  proposalHelper.accessor('bankAccount', { header: 'Rekening', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ? `${i.getValue()!.bankName} ${i.getValue()!.accountCode}` : '-'}</span> }),
  proposalHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
  proposalHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => <ProposalActions proposal={row.original} />,
  }),
];

function ProposalActions({ proposal }: { proposal: PaymentProposal }) {
  const submit = useSubmitProposal();
  const approve = useApproveProposal();
  const release = useReleaseProposal();
  if (proposal.status === 'DRAFT') {
    return <Button size="sm" variant="secondary" loading={submit.isPending} onClick={() => submit.mutate(proposal.id)}>Submit</Button>;
  }
  if (proposal.status === 'SUBMITTED') {
    return <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(proposal.id)}>Approve</Button>;
  }
  if (proposal.status === 'APPROVED') {
    return <Button size="sm" variant="secondary" loading={release.isPending} onClick={() => release.mutate(proposal.id)}>Release</Button>;
  }
  return null;
}

export const bgColumns = [
  bgHelper.accessor('guaranteeNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  bgHelper.accessor('guaranteeType', { header: 'Tipe', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  bgHelper.accessor('beneficiary', { header: 'Beneficiary', cell: (i) => <span className="text-neutral-700">{i.getValue()}</span> }),
  bgHelper.accessor('bankName', { header: 'Bank', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  bgHelper.accessor('amount', { header: 'Nilai', cell: (i) => <span className="font-mono tabular-nums text-neutral-800">{fmt(i.getValue())}</span> }),
  bgHelper.accessor('expiryDate', { header: 'Expiry', cell: (i) => <span className="font-mono text-neutral-600">{formatDate(i.getValue())}</span> }),
  bgHelper.accessor('status', { header: 'Status', cell: (i) => <StatusBadge status={i.getValue()} /> }),
];
