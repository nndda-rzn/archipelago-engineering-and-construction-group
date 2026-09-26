import { useState } from 'react';
import {
  BudgetCheckSection,
  PoChangeSection,
  VendorPerformanceSection,
} from '@/features/procurement/ui';

type Tab = 'budget' | 'po-change' | 'vendor-perf';

const TABS: { id: Tab; label: string }[] = [
  { id: 'budget', label: 'Budget Check' },
  { id: 'po-change', label: 'PO Change' },
  { id: 'vendor-perf', label: 'Vendor Performance' },
];

export function ProcurementHardeningPage() {
  const [tab, setTab] = useState<Tab>('budget');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Procurement Hardening</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Budget check, technical/commercial eval, PO change, vendor performance (Phase 11E)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t.id ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'budget' && <BudgetCheckSection />}
      {tab === 'po-change' && <PoChangeSection />}
      {tab === 'vendor-perf' && <VendorPerformanceSection />}
    </div>
  );
}
