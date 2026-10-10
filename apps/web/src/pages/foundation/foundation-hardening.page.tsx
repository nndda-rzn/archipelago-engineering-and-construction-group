import { useState } from 'react';
import {
  useCurrencies, useDoaAnalysis, useDoaRules, useExchangeRates, useOrganizations, useSetDoaRuleStatus,
} from '@/features/foundation-hardening';
import { useLegalEntities } from '@/entities/legal-entity';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import {
  OrgSection, DoaSection, CurrencyRateSection, HardeningTabs, DoaForm, ResolveForm, CurrencyForm,
} from '@/features/foundation-hardening/ui';

type Tab = 'org' | 'doa' | 'currency';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'org', label: 'Organization' },
  { id: 'doa', label: 'Delegation of Authority' },
  { id: 'currency', label: 'Currency & Rate' },
];

/**
 * Foundation Hardening — tiga tab domain: Organization (struktur + waktu),
 * Delegation of Authority (tangga wewenang + analisis), Currency & Rate
 * (register + matriks + riwayat). Tab hidup di URL agar dapat dibagikan.
 * IFC control & readiness gate sengaja TIDAK di sini (milik engineering/
 * construction).
 */
export function FoundationHardeningPage() {
  const [tab, setTab] = useUrlFilter('tab', 'org') as [Tab, (v: string) => void];
  const [entityId, setEntityId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [doaType, setDoaType] = useState('PurchaseOrder');
  const [doaEditId, setDoaEditId] = useState<string | null>(null);
  const [resolvedMarker, setResolvedMarker] = useState<number | null>(null);

  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const orgs = useOrganizations(entityId, asOf || undefined);
  const rules = useDoaRules();
  const analysis = useDoaAnalysis(doaType);
  const setRuleStatus = useSetDoaRuleStatus();
  const currencies = useCurrencies();
  const rates = useExchangeRates();

  const entityOptions = (entities.data?.items ?? []).map((e) => ({ id: e.id, code: e.code }));
  const currencyItems = currencies.data?.items ?? [];
  const rateItems = rates.data?.items ?? [];
  const ruleItems = rules.data?.items ?? [];
  const editingRule = ruleItems.find((r) => r.id === doaEditId) ?? null;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <header>
        <h1 className="text-h1 text-neutral-950">Foundation Hardening</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Effective-dated organization, delegation of authority, currency &amp; exchange rates
        </p>
      </header>

      <HardeningTabs tabs={TABS} value={tab} onChange={setTab} />

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === 'org' && (
          <OrgSection
            entityId={entityId}
            setEntityId={setEntityId}
            asOf={asOf}
            setAsOf={setAsOf}
            entities={entityOptions}
            orgs={{ isLoading: orgs.isLoading, isError: orgs.isError, onRetry: () => orgs.refetch(), data: orgs.data ?? null }}
          />
        )}

        {tab === 'doa' && (
          <div className="flex flex-col gap-4">
            <DoaForm editing={editingRule} onDone={() => setDoaEditId(null)} />
            <ResolveForm onResolved={setResolvedMarker} />
            <DoaSection
              transactionType={doaType}
              setTransactionType={setDoaType}
              rules={{ isLoading: rules.isLoading, isError: rules.isError, onRetry: () => rules.refetch(), data: ruleItems }}
              analysis={{ isLoading: analysis.isLoading, data: analysis.data }}
              resolvedMarker={resolvedMarker}
              onEditRule={(r) => setDoaEditId(r.id)}
              onToggleStatus={(r) => setRuleStatus.mutate({ id: r.id, status: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
            />
          </div>
        )}

        {tab === 'currency' && (
          <div className="flex flex-col gap-4">
            <CurrencyForm currencies={currencyItems} />
            <CurrencyRateSection
              currencies={currencyItems}
              rates={{ isLoading: rates.isLoading, isError: rates.isError, onRetry: () => rates.refetch(), data: rateItems }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
