import { useState } from 'react';
import { Button, ConfirmDialog, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EmptyState, Skeleton } from '@aec/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';
import type { FiscalPeriod, Vendor } from '@aec/api-contracts';
import {
  useVendors, useVendorStats, useFiscalPeriods, useNumberSequences,
  useUpdateFiscalPeriodStatus,
} from '@/features/master-data';
import { VendorList, VendorDetailPanel, VendorForm, PeriodForm, FiscalPeriodCalendar, FiscalStatusLegend } from '@/features/master-data/ui';
import { HardeningTabs } from '@/features/foundation-hardening/ui';

type Tab = 'vendors' | 'periods' | 'sequences';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'vendors', label: 'Vendors' },
  { id: 'periods', label: 'Fiscal Period' },
  { id: 'sequences', label: 'Number Sequences' },
];

/** Urutan maju periode fiskal — cermin BE; dipakai untuk tombol transisi. */
const FISCAL_FLOW = ['FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED'] as const;

/** KPI tanpa bingkai kartu — satu angka = angka, dengan label & konteks. */
function Kpi({ label, value, context }: { label: string; value: React.ReactNode; context?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-overline uppercase text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono tabular-nums text-h1 text-neutral-950">{value}</p>
      {context && <p className="text-caption text-neutral-500">{context}</p>}
    </div>
  );
}

export function MasterDataPage() {
  const [tab, setTab] = useUrlFilter('tab', 'vendors') as [Tab, (v: string) => void];
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // State per-tab (bukan dibagi) agar pagination satu tab tidak membocor ke tab lain.
  const [vendorPage, setVendorPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalPeriod | null>(null);
  const [transitionTo, setTransitionTo] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const stats = useVendorStats();
  const vendors = useVendors({ page: vendorPage + 1, pageSize: PAGE_SIZE, search: search || undefined, category: category || undefined, status: status || undefined });
  const periods = useFiscalPeriods({ page: 1, pageSize: 100, periodYear: new Date().getFullYear() });
  const sequences = useNumberSequences();
  const setPeriodStatus = useUpdateFiscalPeriodStatus();

  const periodItems = periods.data?.items ?? [];
  const activePeriod = periodItems.find((p) => p.status === 'OPEN') ?? periodItems.find((p) => p.status === 'FUTURE');
  const periodIdx = selectedPeriod ? FISCAL_FLOW.indexOf(selectedPeriod.status as (typeof FISCAL_FLOW)[number]) : -1;
  const forwardStatus = periodIdx >= 0 && periodIdx < FISCAL_FLOW.length - 1 ? FISCAL_FLOW[periodIdx + 1] : null;
  const backwardStatus = periodIdx > 0 && selectedPeriod?.status !== 'LOCKED' ? FISCAL_FLOW[periodIdx - 1] : null;

  const closeForm = () => { setShowForm(false); setEditingVendor(null); };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-neutral-950">Master Data</h1>
          <p className="mt-1 text-body-sm text-neutral-500">
            Vendor master, fiscal periods &amp; document numbering (FR-PRO-010, FR-FND-010)
          </p>
        </div>
        <Button size="sm" onClick={() => (showForm ? closeForm() : setShowForm(true))}>
          {showForm ? 'Close' : tab === 'periods' ? '+ New period' : '+ New vendor'}
        </Button>
      </header>

      {/* KPI strip — angka tanpa bingkai, bukan grid kartu */}
      <section aria-label="Master data summary" className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-neutral-200 pb-5 sm:grid-cols-4">
        <Kpi label="Vendors" value={stats.data?.total ?? '—'} context={stats.data ? `${stats.data.byCategory.length} categories` : undefined} />
        <Kpi label="Active" value={stats.data?.active ?? '—'} context={stats.data ? `${stats.data.inactive} inactive` : undefined} />
        <Kpi label="Avg rating" value={stats.data?.avgScore ?? '—'} context={stats.data ? `${stats.data.ratingCount} ratings` : undefined} />
        <Kpi label="Open period" value={activePeriod?.periodCode ?? '—'} context={activePeriod?.status} />
      </section>

      <HardeningTabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.id === 'vendors' ? `Vendors (${stats.data?.total ?? '—'})` : t.label }))}
        value={tab}
        onChange={(v) => { setTab(v); closeForm(); }}
      />

      {tab === 'vendors' && (
        <div className="flex flex-col gap-4">
          {(showForm || editingVendor) && <VendorForm editing={editingVendor} onDone={closeForm} />}

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64 max-w-full">
              <Input type="search" aria-label="Search vendors" placeholder="Search name, code or NPWP…" value={search} onChange={(e) => { setSearch(e.target.value); setVendorPage(0); }} />
            </div>
            <Select value={category || 'ALL'} onValueChange={(v) => { setCategory(v === 'ALL' ? '' : v); setVendorPage(0); }}>
              <SelectTrigger className="w-44" aria-label="Filter category"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || 'ALL'} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setVendorPage(0); }}>
              <SelectTrigger className="w-36" aria-label="Filter status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="min-w-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                <span className="text-caption text-neutral-500">{vendors.data?.total ?? 0} vendors</span>
                <div className="flex items-center gap-1">
                  <button type="button" className="rounded px-2 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 disabled:opacity-40" disabled={vendorPage === 0} onClick={() => setVendorPage((p) => p - 1)}>Prev</button>
                  <button type="button" className="rounded px-2 py-0.5 text-caption text-neutral-500 hover:bg-neutral-100 disabled:opacity-40" disabled={(vendors.data?.items.length ?? 0) < PAGE_SIZE} onClick={() => setVendorPage((p) => p + 1)}>Next</button>
                </div>
              </div>
              {vendors.isLoading ? (
                <div className="space-y-2 p-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : (
                <VendorList vendors={vendors.data?.items ?? []} selectedId={selectedVendor} onSelect={setSelectedVendor} />
              )}
            </div>

            <div className="min-w-0 rounded-md border border-neutral-200 bg-white">
              {selectedVendor ? (
                <VendorDetailPanel vendorId={selectedVendor} onEdit={() => { const v = vendors.data?.items.find((x) => x.id === selectedVendor); if (v) setEditingVendor(v); }} />
              ) : (
                <div className="p-6"><EmptyState title="Select a vendor" description="Pick a vendor on the left to see its profile, performance and procurement." /></div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'periods' && (
        <div className="flex flex-col gap-4">
          {showForm && <PeriodForm onDone={closeForm} />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FiscalStatusLegend />
            <span className="text-caption text-neutral-500">{periodItems.length} periods · FY{new Date().getFullYear()}</span>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <FiscalPeriodCalendar periods={periodItems} selectedId={selectedPeriod?.id} onSelect={(p) => setSelectedPeriod(p)} />
          </div>

          {selectedPeriod && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-4">
              <div>
                <p className="text-body-sm font-medium text-neutral-900">{selectedPeriod.periodCode}</p>
                <p className="text-caption text-neutral-500">
                  Status: <span className="font-mono">{selectedPeriod.status}</span> · {selectedPeriod.startDate.slice(0, 10)} → {selectedPeriod.endDate.slice(0, 10)}
                </p>
              </div>
              <div className="flex gap-2">
                {backwardStatus && (
                  <Button size="sm" variant="secondary" onClick={() => setTransitionTo(backwardStatus)}>Reopen → {backwardStatus}</Button>
                )}
                {forwardStatus && (
                  <Button size="sm" onClick={() => setTransitionTo(forwardStatus)}>Advance → {forwardStatus}</Button>
                )}
                {!forwardStatus && !backwardStatus && <span className="text-caption text-neutral-500">Locked — final state</span>}
              </div>
            </div>
          )}

          <ConfirmDialog
            open={!!transitionTo}
            onOpenChange={(o) => { if (!o) setTransitionTo(null); }}
            title={`Move ${selectedPeriod?.periodCode} to ${transitionTo}?`}
            description="Fiscal period status can only move one step at a time. This action is audited."
            confirmLabel="Confirm"
            onConfirm={() => {
              if (selectedPeriod && transitionTo) {
                setPeriodStatus.mutate({ id: selectedPeriod.id, status: transitionTo }, {
                  onSuccess: () => { setSelectedPeriod({ ...selectedPeriod, status: transitionTo }); setTransitionTo(null); },
                  onError: () => setTransitionTo(null),
                });
              }
            }}
          />
        </div>
      )}

      {tab === 'sequences' && (
        <div className="rounded-md border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-4 py-2">
            <span className="text-caption text-neutral-500">Document numbering (read-only) — managed automatically</span>
          </div>
          {sequences.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : (sequences.data?.items.length ?? 0) === 0 ? (
            <div className="p-6"><EmptyState title="No sequences" description="Number sequences are created automatically when documents are issued." /></div>
          ) : (
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
                  <th scope="col" className="px-4 py-2 font-medium">Code</th>
                  <th scope="col" className="px-4 py-2 font-medium">Prefix</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Next</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Padding</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(sequences.data?.items ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-neutral-800">{s.code}</td>
                    <td className="px-4 py-2 font-mono text-neutral-600">{s.prefix}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-700">{String(s.nextNumber).padStart(s.padding, '0')}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-500">{s.padding}</td>
                    <td className="px-4 py-2 text-neutral-600">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
