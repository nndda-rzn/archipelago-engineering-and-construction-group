import { useState } from 'react';
import {
  useCurrencies, useDoaRules, useExchangeRates, useOrganizations,
} from '@/features/foundation-hardening';
import { useLegalEntities } from '@/entities/legal-entity';
import { OrgForm, DoaForm, ResolveForm, CurrencyForm } from '@/features/foundation-hardening/ui';
import { OrgSection, DoaSection, CurrencyRateSection } from '@/features/foundation-hardening/ui';

type Tab = 'org' | 'doa' | 'currency';

export function FoundationHardeningPage() {
  const [tab, setTab] = useState<Tab>('org');
  const [entityId, setEntityId] = useState('');
  const [asOf, setAsOf] = useState('');

  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const orgs = useOrganizations(entityId, asOf || undefined);
  const rules = useDoaRules();
  const currencies = useCurrencies();
  const rates = useExchangeRates();

  const entityOptions = (entities.data?.items ?? []).map((e) => ({ id: e.id, code: e.code }));
  const currencyItems = (currencies.data?.items ?? []).map((c) => ({ id: c.id, code: c.code, name: c.name, isActive: c.isActive }));
  const rateItems = (rates.data?.items ?? []).map((r) => ({ id: r.id, fromCurrency: r.fromCurrency, toCurrency: r.toCurrency, rateType: r.rateType, rate: r.rate }));
  const ruleItems = rules.data?.items ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Foundation Hardening</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Effective-dated organization, delegation of authority, currency &amp; exchange rates</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(['org', 'doa', 'currency'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-neutral-800 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {t === 'org' ? 'Organization' : t === 'doa' ? 'Delegation of Authority' : 'Currency & Rate'}
          </button>
        ))}
      </div>

      {tab === 'org' && (
        <>
          <OrgSection
            entityId={entityId}
            setEntityId={setEntityId}
            asOf={asOf}
            setAsOf={setAsOf}
            entities={entityOptions}
            orgs={{ isLoading: orgs.isLoading, isError: orgs.isError, onRetry: () => orgs.refetch(), data: orgs.data ?? null }}
          />
        </>
      )}

      {tab === 'doa' && (
        <>
          <DoaForm />
          <ResolveForm />
          <DoaSection rules={{ isLoading: rules.isLoading, data: ruleItems }} />
        </>
      )}

      {tab === 'currency' && (
        <>
          <CurrencyForm currencies={currencyItems} />
          <CurrencyRateSection currencies={currencyItems} rates={{ isLoading: rates.isLoading, data: rateItems }} />
        </>
      )}
    </div>
  );
}
