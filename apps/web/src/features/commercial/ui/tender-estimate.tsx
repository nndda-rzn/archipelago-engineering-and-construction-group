import { useState } from 'react';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from '@aec/ui';
import { useCreateEstimate, useCreatePricingScenario, useTransitionEstimate } from '../model/tender.api';
import type { Estimate } from '@aec/api-contracts';
import { formatIdr as fmt } from '@/shared/lib/format';
import type { OppOption } from './tender-types';

export function EstimatePanel({
  oppId, setOppId, opportunities, estimates, loading,
}: {
  oppId: string; setOppId: (v: string) => void; opportunities: OppOption[];
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
          <Select value={oppId} onValueChange={(v) => { setOppId(v); setSelectedEstimateId(''); }}>
            <SelectTrigger id="est-opp">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber} — {o.title}</SelectItem>)}
            </SelectContent>
          </Select>
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

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs overflow-x-auto">
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
                <td className="px-4 py-2"><StatusBadge status={e.status} /></td>
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
              <Select value={scenarioType} onValueChange={setScenarioType}>
                <SelectTrigger id="sc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['BASE', 'AGGRESSIVE', 'TARGET', 'NEGOTIATION_FLOOR', 'BEST_CASE'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
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
