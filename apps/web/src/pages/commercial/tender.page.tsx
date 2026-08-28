import { useState } from 'react';
import { DataGrid } from '@aec/ui';
import {
  useBidDecisions, useContracts, useDeviations, useEstimates, useOpportunities,
  useTenderSubmissions, useAmendments,
} from '@/features/commercial';
import {
  BidForm, EstimatePanel, DeviationPanel, SubmissionForm, AmendmentPanel,
  bidColumns, submissionColumns,
} from '@/features/commercial/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

type Tab = 'bid' | 'estimates' | 'deviations' | 'submissions' | 'amendments';

const TAB_LABELS: Record<Tab, string> = {
  bid: 'Bid/No-Bid',
  estimates: 'Estimate',
  deviations: 'Deviation',
  submissions: 'Submission',
  amendments: 'Amendment',
};

export function TenderPage() {
  const [tab, setTab] = useState<Tab>('bid');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [oppId, setOppId] = useState('');
  const [contractId, setContractId] = useState('');

  const opportunities = useOpportunities({ page: 1, pageSize: 100 });
  const contracts = useContracts({ page: 1, pageSize: 100 });
  const bids = useBidDecisions({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const submissions = useTenderSubmissions({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const estimates = useEstimates(oppId);
  const deviations = useDeviations(oppId);
  const amendments = useAmendments(contractId);

  const gridProps = { pagination, onPaginationChange: setPagination };

  const oppOptions = (opportunities.data?.items ?? []).map((o) => ({ id: o.id, oppNumber: o.oppNumber, title: o.title }));
  const contractOptions = (contracts.data?.items ?? []).map((c) => ({ id: c.id, contractNumber: c.contractNumber ?? c.id, title: c.title ?? '' }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Tender & Bid</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Bid/No-Bid, estimate versioning, pricing scenario, deviation, submission, amendment (Fase 11C)</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['bid', 'estimates', 'deviations', 'submissions', 'amendments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'bid' && (
        <>
          <BidForm opportunities={oppOptions} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={bidColumns} data={bids.data?.items ?? []} rowCount={bids.data?.total ?? 0} isLoading={bids.isLoading} isError={bids.isError} onRetry={() => bids.refetch()} emptyMessage="Belum ada bid decision" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'estimates' && (
        <EstimatePanel
          oppId={oppId}
          setOppId={setOppId}
          opportunities={oppOptions}
          estimates={estimates.data?.items ?? []}
          loading={estimates.isLoading}
        />
      )}

      {tab === 'deviations' && (
        <DeviationPanel
          oppId={oppId}
          setOppId={setOppId}
          opportunities={oppOptions}
          deviations={deviations.data?.items ?? []}
          loading={deviations.isLoading}
        />
      )}

      {tab === 'submissions' && (
        <>
          <SubmissionForm opportunities={oppOptions} />
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            <DataGrid columns={submissionColumns} data={submissions.data?.items ?? []} rowCount={submissions.data?.total ?? 0} isLoading={submissions.isLoading} isError={submissions.isError} onRetry={() => submissions.refetch()} emptyMessage="Belum ada submission" {...gridProps} />
          </div>
        </>
      )}

      {tab === 'amendments' && (
        <AmendmentPanel
          contractId={contractId}
          setContractId={setContractId}
          contracts={contractOptions}
          amendments={amendments.data?.items ?? []}
          loading={amendments.isLoading}
        />
      )}
    </div>
  );
}
