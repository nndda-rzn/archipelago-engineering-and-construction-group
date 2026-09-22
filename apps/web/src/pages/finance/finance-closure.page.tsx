import { useState } from 'react';
import { DataGrid } from '@aec/ui';
import {
  useBalanceSheet, useConsolidation, useIncomeStatement,
  useIntercompany, useIntercompanyReconciliation, usePeriodCloses,
} from '@/features/finance';
import {
  EntitySelector, IntercompanyForm, PeriodCloseForm,
  icColumns, pcColumns, ReconciliationSummary, IncomeStatementSection, BalanceSheetSection, ConsolidationSection,
} from '@/features/finance/ui';
import { PAGE_SIZE } from '@/shared/lib/pagination';

export function FinanceClosurePage() {
  const [icPage, setIcPage] = useState(1);
  const [entityId, setEntityId] = useState('');

  const intercompany = useIntercompany({ page: icPage, pageSize: PAGE_SIZE });
  const reconciliation = useIntercompanyReconciliation();
  const periodCloses = usePeriodCloses();
  const incomeStatement = useIncomeStatement({ legalEntityId: entityId });
  const balanceSheet = useBalanceSheet({ legalEntityId: entityId });
  const consolidation = useConsolidation();

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-h1 text-neutral-950">Finance Closure</h1>

      {}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Intercompany</h2>
        <IntercompanyForm />
        <DataGrid
          columns={icColumns}
          data={intercompany.data?.items ?? []}
          rowCount={intercompany.data?.total ?? 0}
          isLoading={intercompany.isLoading}
          isError={intercompany.isError}
          onRetry={() => intercompany.refetch()}
          emptyMessage="Belum ada transaksi intercompany"
        />
        {(intercompany.data?.total ?? 0) > PAGE_SIZE && (
          <div className="mt-2 flex gap-2">
            <button
              className="rounded border border-neutral-200 px-3 py-1 text-body-sm disabled:opacity-40"
              disabled={icPage <= 1}
              onClick={() => setIcPage((p) => p - 1)}
            >
              Prev
            </button>
            <button
              className="rounded border border-neutral-200 px-3 py-1 text-body-sm disabled:opacity-40"
              disabled={icPage * PAGE_SIZE >= (intercompany.data?.total ?? 0)}
              onClick={() => setIcPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Rekonsiliasi Intercompany</h2>
        {reconciliation.data && <ReconciliationSummary data={reconciliation.data} />}
      </section>

      {}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Period Close</h2>
        <PeriodCloseForm />
        <DataGrid
          columns={pcColumns}
          data={periodCloses.data?.items ?? []}
          rowCount={periodCloses.data?.items.length ?? 0}
          isLoading={periodCloses.isLoading}
          isError={false}
          emptyMessage="Belum ada period close"
        />
      </section>

      {}
      <section>
        <h2 className="mb-3 text-h5 font-medium text-neutral-800">Laporan Keuangan</h2>
        <EntitySelector entityId={entityId} setEntityId={setEntityId} />
        {entityId && incomeStatement.data && (
          <IncomeStatementSection data={incomeStatement.data} />
        )}
        {entityId && balanceSheet.data && (
          <BalanceSheetSection data={balanceSheet.data} />
        )}
      </section>

      {}
      {consolidation.data && (
        <section>
          <h2 className="mb-3 text-h5 font-medium text-neutral-800">Konsolidasi</h2>
          <ConsolidationSection data={consolidation.data} />
        </section>
      )}
    </div>
  );
}

