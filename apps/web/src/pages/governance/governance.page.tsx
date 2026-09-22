import { useState } from 'react';
import { Button, DataGrid } from '@aec/ui';
import { useAccessReviews, useAudits, useLegalCases, useRisks, type AuditEngagement } from '@/features/governance';
import { RiskForm, AuditForm, LegalForm, ReviewForm, AuditDetail, riskColumns, auditColumns, legalColumns, reviewColumns } from '@/features/governance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import { useUrlFilter, useUrlPagination } from '@/shared/lib/use-url-state';

type Tab = 'risks' | 'audits' | 'legal' | 'reviews';

const TAB_LABELS: Record<Tab, string> = {
  risks: 'Risk',
  audits: 'Audit',
  legal: 'Legal',
  reviews: 'Access Review',
};

export function GovernancePage() {
  const [tab, setTab] = useUrlFilter('tab', 'risks') as [Tab, (v: string) => void];
  const [showForm, setShowForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditEngagement | null>(null);
  const { pagination, onPaginationChange } = useUrlPagination(PAGE_SIZE);
  const risks = useRisks({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const audits = useAudits({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const legal = useLegalCases({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const reviews = useAccessReviews({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange };

  const tabCount: Record<Tab, number> = {
    risks: risks.data?.total ?? 0,
    audits: audits.data?.total ?? 0,
    legal: legal.data?.total ?? 0,
    reviews: reviews.data?.total ?? 0,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Governance</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Risk register, internal audit, legal case, access review (FR-GOV-001..004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['risks', 'audits', 'legal', 'reviews'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); setSelectedAudit(null); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {TAB_LABELS[t]} ({tabCount[t]})
          </button>
        ))}
      </div>

      {showForm && tab === 'risks' && <RiskForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'audits' && <AuditForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'legal' && <LegalForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'reviews' && <ReviewForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'risks' && (
          <DataGrid columns={riskColumns} data={risks.data?.items ?? []} rowCount={risks.data?.total ?? 0} isLoading={risks.isLoading} isError={risks.isError} onRetry={() => risks.refetch()} emptyMessage="Belum ada risk" {...gridProps} />
        )}
        {tab === 'audits' && (
          <DataGrid columns={auditColumns} data={audits.data?.items ?? []} rowCount={audits.data?.total ?? 0} isLoading={audits.isLoading} isError={audits.isError} onRetry={() => audits.refetch()} onRowClick={(row) => setSelectedAudit(row.original)} emptyMessage="Belum ada audit" {...gridProps} />
        )}
        {tab === 'legal' && (
          <DataGrid columns={legalColumns} data={legal.data?.items ?? []} rowCount={legal.data?.total ?? 0} isLoading={legal.isLoading} isError={legal.isError} onRetry={() => legal.refetch()} emptyMessage="Belum ada kasus legal" {...gridProps} />
        )}
        {tab === 'reviews' && (
          <DataGrid columns={reviewColumns} data={reviews.data?.items ?? []} rowCount={reviews.data?.total ?? 0} isLoading={reviews.isLoading} isError={reviews.isError} onRetry={() => reviews.refetch()} emptyMessage="Belum ada access review" {...gridProps} />
        )}
      </div>

      {selectedAudit && <AuditDetail audit={selectedAudit} />}
    </div>
  );
}
