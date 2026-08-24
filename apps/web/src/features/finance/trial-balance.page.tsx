import { useState } from 'react';
import { Badge, Button } from '@aec/ui';
import { useLegalEntities } from '@/features/foundation/legal-entity.api';
import { useTrialBalance } from './finance.api';

const typeLabel: Record<string, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Liabilitas',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export function TrialBalancePage() {
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const defaultEntityId = entityId || entities.data?.items[0]?.id || '';

  const { data, isLoading, isError, refetch } = useTrialBalance({
    legalEntityId: defaultEntityId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Trial Balance</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Neraca saldo dari journal ter-posting (FR-FIN-001)</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
        <div>
          <label htmlFor="tb-entity" className="mb-1 block text-caption font-medium uppercase tracking-wide text-neutral-500">Legal Entity</label>
          <select
            id="tb-entity"
            value={defaultEntityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="flex h-9 w-48 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih entity…</option>
            {(entities.data?.items ?? []).map((en) => <option key={en.id} value={en.id}>{en.code}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tb-from" className="mb-1 block text-caption font-medium uppercase tracking-wide text-neutral-500">Dari</label>
          <input
            id="tb-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          />
        </div>
        <div>
          <label htmlFor="tb-to" className="mb-1 block text-caption font-medium uppercase tracking-wide text-neutral-500">Sampai</label>
          <input
            id="tb-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>Muat Ulang</Button>
      </div>

      {!defaultEntityId && <p className="text-body-sm text-neutral-500">Pilih legal entity untuk melihat neraca saldo.</p>}

      {defaultEntityId && (
        <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
          {isLoading && <p className="p-4 text-body-sm text-neutral-500">Menghitung…</p>}
          {isError && <p className="p-4 text-body-sm text-destructive-600">Gagal memuat trial balance.</p>}
          {!isLoading && !isError && data && (
            <>
              <div className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3">
                <Badge variant="default">{data.legalEntityCode}</Badge>
                <span className="text-caption text-neutral-500">
                  {new Date(data.generatedAt).toLocaleString('id-ID')}
                  {data.from || data.to ? ` — ${data.from ?? 'awal'} s/d ${data.to ?? 'sekarang'}` : ' — semua periode'}
                </span>
                <Badge variant={data.balanced ? 'success' : 'warning'}>
                  {data.balanced ? 'Balance ✓' : 'TIDAK BALANCE'}
                </Badge>
              </div>

              <table className="w-full text-left text-body">
                <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Kode</th>
                    <th className="px-4 py-2">Akun</th>
                    <th className="px-4 py-2">Tipe</th>
                    <th className="px-4 py-2 text-right">Debit</th>
                    <th className="px-4 py-2 text-right">Kredit</th>
                    <th className="px-4 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => (
                    <tr key={line.accountId} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2 font-mono text-neutral-800">{line.code}</td>
                      <td className="px-4 py-2 text-neutral-700">{line.name}</td>
                      <td className="px-4 py-2 text-neutral-500">{typeLabel[line.accountType] ?? line.accountType}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{line.debit > 0 ? fmt(line.debit) : '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{line.credit > 0 ? fmt(line.credit) : '—'}</td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums text-neutral-800">{fmt(line.balance)}</td>
                    </tr>
                  ))}
                  {data.lines.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-4 text-caption text-neutral-500">Belum ada journal ter-posting.</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-neutral-200 bg-neutral-50 font-medium">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-caption uppercase tracking-wide text-neutral-500">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-800">{fmt(data.totalDebit)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-800">{fmt(data.totalCredit)}</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
