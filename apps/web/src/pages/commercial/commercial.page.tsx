import { useState } from 'react';
import { Button } from '@aec/ui';
import { useClients, useOpportunities, useContracts, useCommercialSummary } from '@/features/commercial';
import {
  OpportunityForm,
  ClientForm,
  ContractForm,
} from '@/features/commercial/ui';
import { PipelinePulse } from '@/features/commercial/ui/pipeline-pulse';
import { OpportunityBoard } from '@/features/commercial/ui/opportunity-board';
import { ContractBook } from '@/features/commercial/ui/contract-book';
import { ClientNetwork } from '@/features/commercial/ui/client-network';
import { PageHeader } from '@/widgets/page-header';
import { PAGE_SIZE } from '@/shared/lib/pagination';

const FORMS = {
  opportunity: OpportunityForm,
  client: ClientForm,
  contract: ContractForm,
} as const;

type FormKey = keyof typeof FORMS;

/**
 * Commercial — halaman commercial dibaca sebagai SATU halaman, bukan tiga tab.
 *
 * Alasannya: ketiga tab lama (clients/opportunities/contracts) adalah TIGA TAMPILAN
 * dari satu pipeline yang sama. Memisahkannya memaksa pengguna berpindah tab untuk
 * memahami hubungan — sementara pertanyaan komersial selalu lintas: "peluang mana
 * yang terbesar, dari klien siapa, dan sudah jadi kontrak belum?"
 *
 * Komposisi (satu encoding per section, bar muncul hanya 2×):
 *   [ PIPELINE PULSE ]       angka ledger + mini-funnel tipis (klik = filter)
 *   [ OPEN OPPORTUNITIES ]   dot stepper — posisi stage, bukan besaran
 *   [ CONTRACT BOOK ]        satu stacked bar komposisi + daftar mono
 *   [ CLIENTS ]              kartu strip relasional, tanpa grafik
 *
 * Form create dibuka sebagai drawer kanan, context-aware sesuai tombol pemicunya.
 */
export function CommercialPage() {
  const summary = useCommercialSummary();
  const clients = useClients({ page: 1, pageSize: PAGE_SIZE });
  const opportunities = useOpportunities({ page: 1, pageSize: PAGE_SIZE });
  const contracts = useContracts({ page: 1, pageSize: PAGE_SIZE });

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState<FormKey | null>(null);

  const ActiveForm = formKey ? FORMS[formKey] : null;
  const closeForm = () => setFormKey(null);

  const isLoading = summary.isLoading || clients.isLoading || opportunities.isLoading || contracts.isLoading;
  const isError = summary.isError || clients.isError || opportunities.isError || contracts.isError;

  // Filter opportunity mengikuti stage yang dipilih di funnel.
  const filteredOpps = selectedStage
    ? (opportunities.data?.items ?? []).filter((o) => o.stage === selectedStage && o.status === 'OPEN')
    : (opportunities.data?.items ?? []);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PageHeader
        title="Commercial"
        subtitle="Pipeline · contracts · clients"
        scope={summary.data ? <span className="font-mono text-caption tabular-nums text-neutral-600">{summary.data.clients.total} clients · {summary.data.openOpportunities} open</span> : undefined}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setFormKey('opportunity')}>+ Opportunity</Button>
            <Button size="sm" variant="secondary" onClick={() => setFormKey('contract')}>+ Contract</Button>
            <Button size="sm" onClick={() => setFormKey('client')}>+ Client</Button>
          </div>
        }
      />

      {isLoading && (
        <div aria-busy="true" className="space-y-6">
          <div className="h-[120px] animate-pulse bg-neutral-100" />
          <div className="h-[420px] animate-pulse bg-neutral-100" />
        </div>
      )}

      {isError && (
        <p className="text-body-sm text-destructive-600">
          Failed to load commercial data.{' '}
          <button type="button" className="underline" onClick={() => { void summary.refetch(); void clients.refetch(); void opportunities.refetch(); void contracts.refetch(); }}>
            Retry
          </button>
        </p>
      )}

      {!isLoading && !isError && (
        <>
          {summary.data && (
            <PipelinePulse summary={summary.data} selectedStage={selectedStage} onSelectStage={setSelectedStage} />
          )}

          <OpportunityBoard
            opportunities={selectedStage ? filteredOpps : (opportunities.data?.items ?? [])}
            onSelect={(id) => setSelectedOppId((prev) => (prev === id ? null : id))}
            selectedId={selectedOppId}
          />

          <ContractBook contracts={contracts.data?.items ?? []} clients={clients.data?.items ?? []} />

          <ClientNetwork clients={clients.data?.items ?? []} opportunities={opportunities.data?.items ?? []} contracts={contracts.data?.items ?? []} />

          {ActiveForm && (
            <div className="fixed inset-y-0 right-0 z-modal w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-surface-raised p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-h3 text-neutral-950">New {formKey}</h2>
                <Button size="sm" variant="ghost" onClick={closeForm}>Close</Button>
              </div>
              <ActiveForm onDone={closeForm} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
