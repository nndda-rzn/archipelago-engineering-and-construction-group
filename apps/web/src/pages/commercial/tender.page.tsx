import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useAmendments, useApproveDeviation, useBidDecisions, useContracts, useCreateAmendment, useCreateBidDecision,
  useCreateDeviation, useCreateEstimate, useCreatePricingScenario, useCreateTenderSubmission,
  useDeviations, useEstimates, useExecuteAmendment, useOpportunities, useRejectDeviation, useTenderSubmissions,
  useTransitionEstimate,
  type BidDecision, type ContractAmendment, type ContractDeviation, type Estimate, type TenderSubmission,
} from '@/features/commercial';
import { formatIdr as fmt } from '@/shared/lib/format';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  BID: 'success',
  NO_BID: 'warning',
  APPROVED: 'success',
  REJECTED: 'warning',
  EXECUTED: 'success',
  WORKING: 'default',
  REVIEW: 'default',
  FINAL_BID: 'success',
  AWARD_RECONCILED: 'success',
  OPEN: 'default',
};

const bidHelper = createColumnHelper<BidDecision>();
const submissionHelper = createColumnHelper<TenderSubmission>();
const deviationHelper = createColumnHelper<ContractDeviation>();
const amendmentHelper = createColumnHelper<ContractAmendment>();

const bidColumns = [
  bidHelper.accessor('opportunity', { header: 'Opportunity', cell: (i) => <span className="text-neutral-800">{i.getValue()?.title}</span> }),
  bidHelper.accessor('decision', { header: 'Keputusan', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  bidHelper.accessor('rationale', { header: 'Alasan', cell: (i) => <span className="max-w-xs truncate text-neutral-600">{i.getValue() ?? '—'}</span> }),
  bidHelper.accessor('decidedBy', { header: 'Pembuat', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue()}</span> }),
];

const submissionColumns = [
  submissionHelper.accessor('submissionNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  submissionHelper.accessor('opportunity', { header: 'Opportunity', cell: (i) => <span className="text-neutral-700">{i.getValue()?.title}</span> }),
  submissionHelper.accessor('channel', { header: 'Channel', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
  submissionHelper.accessor('packageVersion', { header: 'Paket', cell: (i) => <span className="font-mono text-neutral-600">{i.getValue() ?? '—'}</span> }),
  submissionHelper.accessor('submittedAt', { header: 'Waktu', cell: (i) => <span className="font-mono text-neutral-600">{new Date(i.getValue()).toLocaleString('id-ID')}</span> }),
  submissionHelper.accessor('fileHash', { header: 'Hash', cell: (i) => <span className="max-w-[120px] truncate font-mono text-caption text-neutral-500">{i.getValue() ?? '—'}</span> }),
  submissionHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant="default">{i.getValue()}</Badge> }),
];

const deviationColumns = [
  deviationHelper.accessor('clause', { header: 'Klausul', cell: (i) => <span className="font-mono text-neutral-700">{i.getValue()}</span> }),
  deviationHelper.accessor('clientRequirement', { header: 'Req. Client', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('aecPosition', { header: 'Posisi AEC', cell: (i) => <span className="max-w-[200px] truncate text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('risk', { header: 'Risiko', cell: (i) => <Badge variant={i.getValue() === 'HIGH' ? 'warning' : 'default'}>{i.getValue()}</Badge> }),
  deviationHelper.accessor('owner', { header: 'Owner', cell: (i) => <span className="text-neutral-600">{i.getValue()}</span> }),
  deviationHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  deviationHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const approve = useApproveDeviation();
      const reject = useRejectDeviation();
      if (row.original.status !== 'OPEN') return null;
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(row.original.id)}>Approve</Button>
          <Button size="sm" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate(row.original.id)}>Reject</Button>
        </div>
      );
    },
  }),
];

const amendmentColumns = [
  amendmentHelper.accessor('amendmentNumber', { header: 'No.', cell: (i) => <span className="font-mono text-neutral-800">{i.getValue()}</span> }),
  amendmentHelper.accessor('title', { header: 'Judul', cell: (i) => <span className="text-neutral-800">{i.getValue()}</span> }),
  amendmentHelper.accessor('amountChange', { header: 'Perubahan', cell: (i) => <span className={`font-mono tabular-nums ${i.getValue() >= 0 ? 'text-semantic-success' : 'text-destructive-600'}`}>{fmt(i.getValue())}</span> }),
  amendmentHelper.accessor('status', { header: 'Status', cell: (i) => <Badge variant={statusVariant[i.getValue()] ?? 'default'}>{i.getValue()}</Badge> }),
  amendmentHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const execute = useExecuteAmendment();
      if (row.original.status !== 'DRAFT') return null;
      return <Button size="sm" variant="secondary" loading={execute.isPending} onClick={() => execute.mutate(row.original.id)}>Eksekusi</Button>;
    },
  }),
];

type Tab = 'bid' | 'estimates' | 'deviations' | 'submissions' | 'amendments';

export function TenderPage() {
  const [tab, setTab] = useState<Tab>('bid');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [oppId, setOppId] = useState('');
  const [contractId, setContractId] = useState('');

  const bids = useBidDecisions({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const submissions = useTenderSubmissions({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const opportunities = useOpportunities({ page: 1, pageSize: 100 });
  const contracts = useContracts({ page: 1, pageSize: 100 });
  const estimates = useEstimates(oppId);
  const deviations = useDeviations(oppId);
  const amendments = useAmendments(contractId);

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Tender & Bid</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Bid/No-Bid, estimate versioning, pricing scenario, deviation, submission, amendment (Fase 11C)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['bid', 'estimates', 'deviations', 'submissions', 'amendments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'bid' ? 'Bid/No-Bid' : t === 'estimates' ? 'Estimate' : t === 'deviations' ? 'Deviation' : t === 'submissions' ? 'Submission' : 'Amendment'}
          </button>
        ))}
      </div>

      {tab === 'bid' && (
        <>
          <BidForm />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={bidColumns} data={bids.data?.items ?? []} rowCount={bids.data?.total ?? 0} isLoading={bids.isLoading} isError={bids.isError} onRetry={() => bids.refetch()} emptyMessage="Belum ada keputusan bid" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'estimates' && (
        <>
          <EstimatePanel
            oppId={oppId}
            setOppId={setOppId}
            opportunities={opportunities.data?.items ?? []}
            estimates={estimates.data?.items ?? []}
            loading={estimates.isLoading}
          />
        </>
      )}

      {tab === 'deviations' && (
        <>
          <DeviationPanel
            oppId={oppId}
            setOppId={setOppId}
            opportunities={opportunities.data?.items ?? []}
            deviations={deviations.data?.items ?? []}
            loading={deviations.isLoading}
          />
        </>
      )}

      {tab === 'submissions' && (
        <>
          <SubmissionForm opportunities={opportunities.data?.items ?? []} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={submissionColumns} data={submissions.data?.items ?? []} rowCount={submissions.data?.total ?? 0} isLoading={submissions.isLoading} isError={submissions.isError} onRetry={() => submissions.refetch()} emptyMessage="Belum ada tender submission" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'amendments' && (
        <>
          <AmendmentPanel
            contractId={contractId}
            setContractId={setContractId}
            contracts={contracts.data?.items ?? []}
            amendments={amendments.data?.items ?? []}
            loading={amendments.isLoading}
          />
        </>
      )}
    </div>
  );
}

function BidForm() {
  const { data: opportunities } = useOpportunities({ page: 1, pageSize: 100 });
  const create = useCreateBidDecision();
  const [oppId, setOppId] = useState('');
  const [decision, setDecision] = useState('BID');
  const [rationale, setRationale] = useState('');
  const onSubmit = () => {
    if (!oppId) return;
    create.mutate({ id: oppId, decision, rationale: rationale || undefined }, { onSuccess: () => { setOppId(''); setRationale(''); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="bid-opp">Opportunity</Label>
          <select id="bid-opp" value={oppId} onChange={(e) => setOppId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {(opportunities?.items ?? []).map((o) => <option key={o.id} value={o.id}>{o.oppNumber} — {o.title}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="bid-dec">Keputusan</Label>
          <select id="bid-dec" value={decision} onChange={(e) => setDecision(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['BID', 'NO_BID'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="bid-rat">Alasan</Label>
          <Input id="bid-rat" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Simpan Keputusan</Button>
      </div>
    </div>
  );
}

function EstimatePanel({
  oppId, setOppId, opportunities, estimates, loading,
}: {
  oppId: string; setOppId: (v: string) => void; opportunities: Array<{ id: string; oppNumber: string; title: string }>;
  estimates: Estimate[]; loading: boolean;
}) {
  const createEstimate = useCreateEstimate(oppId);
  const transition = useTransitionEstimate();
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [selectedEstimateId, setSelectedEstimateId] = useState('');
  const [scenarioType, setScenarioType] = useState('BASE');
  const [scenarioAmount, setScenarioAmount] = useState('');

  const selected = estimates.find((e) => e.id === selectedEstimateId);
  const createScenario = useCreatePricingScenario(selectedEstimateId);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="est-opp">Opportunity</Label>
          <select id="est-opp" value={oppId} onChange={(e) => { setOppId(e.target.value); setSelectedEstimateId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.oppNumber} — {o.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="est-desc">Deskripsi</Label>
          <Input id="est-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="est-total">Total</Label>
          <Input id="est-total" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} className="w-36" />
        </div>
        <Button onClick={() => { if (oppId && total) createEstimate.mutate({ description: description || undefined, totalAmount: Number(total) }, { onSuccess: () => { setDescription(''); setTotal(''); } }); }} loading={createEstimate.isPending}>
          Versi Baru
        </Button>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Versi</th>
              <th className="px-4 py-2">No.</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : estimates).map((e) => (
              <tr key={e.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 font-mono text-neutral-800">v{e.version}</td>
                <td className="px-4 py-2 font-mono text-neutral-600">{e.estimateNumber}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-800">{fmt(e.totalAmount)}</td>
                <td className="px-4 py-2"><Badge variant={statusVariant[e.status] ?? 'default'}>{e.status}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {e.status === 'WORKING' && <Button size="sm" variant="ghost" onClick={() => transition.mutate({ id: e.id, status: 'REVIEW' })}>Review</Button>}
                    {e.status === 'REVIEW' && <Button size="sm" variant="ghost" onClick={() => transition.mutate({ id: e.id, status: 'APPROVED' })}>Approve</Button>}
                    {e.status === 'APPROVED' && <Button size="sm" variant="secondary" onClick={() => transition.mutate({ id: e.id, status: 'FINAL_BID' })}>Final Bid</Button>}
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedEstimateId(selectedEstimateId === e.id ? '' : e.id); }}>Scenarios</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && estimates.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">Belum ada estimate. Pilih opportunity + total untuk versi baru.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <h3 className="text-h3 text-neutral-900">Pricing Scenario — v{selected.version}</h3>
          <div className="mt-3 flex items-end gap-3">
            <div>
              <Label htmlFor="sc-type">Tipe</Label>
              <select id="sc-type" value={scenarioType} onChange={(e) => setScenarioType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
                {['BASE', 'AGGRESSIVE', 'TARGET', 'NEGOTIATION_FLOOR', 'BEST_CASE'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="sc-amt">Nilai</Label>
              <Input id="sc-amt" type="number" min={0} value={scenarioAmount} onChange={(e) => setScenarioAmount(e.target.value)} className="w-36" />
            </div>
            <Button onClick={() => { if (scenarioAmount) createScenario.mutate({ scenarioType, amount: Number(scenarioAmount) }, { onSuccess: () => setScenarioAmount('') }); }} loading={createScenario.isPending}>
              Tambah Scenario
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(selected.pricingScenarios ?? []).map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-body-sm">
                <Badge variant="default">{s.scenarioType}</Badge>
                <span className="font-mono tabular-nums text-neutral-800">{fmt(s.amount)}</span>
              </span>
            ))}
            {(selected.pricingScenarios ?? []).length === 0 && <p className="text-caption text-neutral-500">Belum ada scenario.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviationPanel({
  oppId, setOppId, opportunities, deviations, loading,
}: {
  oppId: string; setOppId: (v: string) => void; opportunities: Array<{ id: string; oppNumber: string; title: string }>;
  deviations: ContractDeviation[]; loading: boolean;
}) {
  const create = useCreateDeviation(oppId);
  const [clause, setClause] = useState('');
  const [req, setReq] = useState('');
  const [position, setPosition] = useState('');
  const [owner, setOwner] = useState('');
  const onSubmit = () => {
    if (!oppId || !clause || !req || !position || !owner) return;
    create.mutate({ clause, clientRequirement: req, aecPosition: position, owner }, { onSuccess: () => { setClause(''); setReq(''); setPosition(''); setOwner(''); } });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="dev-opp">Opportunity</Label>
          <select id="dev-opp" value={oppId} onChange={(e) => setOppId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.oppNumber}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="dev-clause">Klausul</Label>
          <Input id="dev-clause" value={clause} onChange={(e) => setClause(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="dev-req">Req. Client</Label>
          <Input id="dev-req" value={req} onChange={(e) => setReq(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="dev-pos">Posisi AEC</Label>
          <Input id="dev-pos" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dev-owner">Owner</Label>
          <Input id="dev-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Deviation</Button>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Klausul</th>
              <th className="px-4 py-2">Req. Client</th>
              <th className="px-4 py-2">Posisi AEC</th>
              <th className="px-4 py-2">Risiko</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : deviations).map((d) => (
              <tr key={d.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-4 py-2 font-mono text-neutral-700">{d.clause}</td>
                <td className="px-4 py-2 max-w-[200px] truncate text-neutral-600">{d.clientRequirement}</td>
                <td className="px-4 py-2 max-w-[200px] truncate text-neutral-600">{d.aecPosition}</td>
                <td className="px-4 py-2"><Badge variant={d.risk === 'HIGH' ? 'warning' : 'default'}>{d.risk}</Badge></td>
                <td className="px-4 py-2 text-neutral-600">{d.owner}</td>
                <td className="px-4 py-2"><Badge variant={statusVariant[d.status] ?? 'default'}>{d.status}</Badge></td>
                <td className="px-4 py-2">
                  {d.status === 'OPEN' && (
                    <div className="flex gap-1">
                      <ApproveDeviationBtn id={d.id} />
                      <RejectDeviationBtn id={d.id} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && deviations.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-caption text-neutral-500">Belum ada deviation.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApproveDeviationBtn({ id }: { id: string }) {
  const approve = useApproveDeviation();
  return <Button size="sm" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate(id)}>Approve</Button>;
}

function RejectDeviationBtn({ id }: { id: string }) {
  const reject = useRejectDeviation();
  return <Button size="sm" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate(id)}>Reject</Button>;
}

function SubmissionForm({ opportunities }: { opportunities: Array<{ id: string; oppNumber: string; title: string }> }) {
  const create = useCreateTenderSubmission();
  const [oppId, setOppId] = useState('');
  const [channel, setChannel] = useState('ELECTRONIC');
  const [packageVersion, setPackageVersion] = useState('');
  const [fileHash, setFileHash] = useState('');
  const onSubmit = () => {
    if (!oppId) return;
    create.mutate(
      { opportunityId: oppId, channel, packageVersion: packageVersion || undefined, fileHash: fileHash || undefined },
      { onSuccess: () => { setOppId(''); setPackageVersion(''); setFileHash(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="ts-opp">Opportunity</Label>
          <select id="ts-opp" value={oppId} onChange={(e) => setOppId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.oppNumber} — {o.title}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-ch">Channel</Label>
          <select id="ts-ch" value={channel} onChange={(e) => setChannel(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['ELECTRONIC', 'HARDCOPY', 'PORTAL'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="ts-pkg">Versi Paket</Label>
          <Input id="ts-pkg" value={packageVersion} onChange={(e) => setPackageVersion(e.target.value)} placeholder="v1.2" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ts-hash">File Hash</Label>
          <Input id="ts-hash" value={fileHash} onChange={(e) => setFileHash(e.target.value)} placeholder="sha256:..." />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Catat Submission</Button>
      </div>
    </div>
  );
}

function AmendmentPanel({
  contractId, setContractId, contracts, amendments, loading,
}: {
  contractId: string; setContractId: (v: string) => void; contracts: Array<{ id: string; contractNumber: string; title: string }>;
  amendments: ContractAmendment[]; loading: boolean;
}) {
  const create = useCreateAmendment(contractId);
  const [title, setTitle] = useState('');
  const [amountChange, setAmountChange] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="w-72">
          <Label htmlFor="amd-contract">Kontrak</Label>
          <select id="amd-contract" value={contractId} onChange={(e) => setContractId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.title}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="amd-title">Judul</Label>
          <Input id="amd-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="amd-chg">Perubahan</Label>
          <Input id="amd-chg" type="number" value={amountChange} onChange={(e) => setAmountChange(e.target.value)} className="w-36" placeholder="+/−" />
        </div>
        <Button onClick={() => { if (contractId && title && amountChange) create.mutate({ title, amountChange: Number(amountChange) }, { onSuccess: () => { setTitle(''); setAmountChange(''); } }); }} loading={create.isPending}>
          Buat Amendment
        </Button>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        <DataGrid
          columns={amendmentColumns}
          data={loading ? [] : amendments}
          rowCount={loading ? 0 : amendments.length}
          isLoading={loading}
          isError={false}
          emptyMessage="Belum ada amendment"
        />
      </div>
    </div>
  );
}
