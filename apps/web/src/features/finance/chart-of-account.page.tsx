import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useLegalEntities } from '@/features/foundation/legal-entity.api';
import { useChartOfAccounts, useCreateChartOfAccount, type ChartOfAccount } from './finance.api';

const typeVariant: Record<string, 'default' | 'success' | 'warning'> = {
  ASSET: 'success',
  LIABILITY: 'warning',
  EQUITY: 'default',
  REVENUE: 'default',
  EXPENSE: 'warning',
};

const typeLabel: Record<string, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Liabilitas',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
};

function CoaForm({ onDone, entityId }: { onDone: () => void; entityId: string }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('ASSET');
  const [normalBalance, setNormalBalance] = useState('DEBIT');
  const [description, setDescription] = useState('');
  const create = useCreateChartOfAccount();
  const { data: accounts } = useChartOfAccounts({ legalEntityId: entityId });

  const onSubmit = () => {
    if (!code || !name) return;
    create.mutate(
      { legalEntityId: entityId, code, name, accountType, normalBalance, description: description || undefined },
      {
        onSuccess: () => {
          setCode('');
          setName('');
          setDescription('');
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="coa-code">Kode</Label>
          <Input id="coa-code" placeholder="mis. 1300" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="coa-name">Nama</Label>
          <Input id="coa-name" placeholder="mis. Aset Tetap" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="coa-type">Tipe Akun</Label>
          <select
            id="coa-type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="ASSET">Aset</option>
            <option value="LIABILITY">Liabilitas</option>
            <option value="EQUITY">Ekuitas</option>
            <option value="REVENUE">Pendapatan</option>
            <option value="EXPENSE">Beban</option>
          </select>
        </div>
        <div>
          <Label htmlFor="coa-balance">Saldo Normal</Label>
          <select
            id="coa-balance"
            value={normalBalance}
            onChange={(e) => setNormalBalance(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Kredit</option>
          </select>
        </div>
        <div className="col-span-2">
          <Label htmlFor="coa-desc">Deskripsi (opsional)</Label>
          <Input id="coa-desc" placeholder="Keterangan akun" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan Akun</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Kode akun sudah ada / data tidak valid.</p>}
      {accounts && accounts.length > 0 && (
        <p className="mt-3 text-caption text-neutral-500">
          {accounts.length} akun terdaftar — format kode: 1xxx Aset, 2xxx Liabilitas, 3xxx Ekuitas, 4xxx Pendapatan, 6xxx Beban.
        </p>
      )}
    </div>
  );
}

export function ChartOfAccountPage() {
  const [entityId, setEntityId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const defaultEntityId = entityId || entities.data?.items[0]?.id || '';

  const { data: accounts, isLoading, isError, refetch } = useChartOfAccounts({ legalEntityId: defaultEntityId || undefined });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Chart of Accounts</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Daftar akun GL (FR-FIN-002)</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={defaultEntityId}
            onChange={(e) => { setEntityId(e.target.value); setShowForm(false); }}
            aria-label="Pilih legal entity"
            className="flex h-9 w-48 rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih entity…</option>
            {(entities.data?.items ?? []).map((en) => <option key={en.id} value={en.id}>{en.code}</option>)}
          </select>
          {defaultEntityId && (
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Tutup' : '+ Tambah Akun'}
            </Button>
          )}
        </div>
      </div>

      {showForm && defaultEntityId && <CoaForm onDone={() => setShowForm(false)} entityId={defaultEntityId} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {isLoading && <p className="p-4 text-body-sm text-neutral-500">Memuat…</p>}
        {isError && (
          <div className="flex items-center justify-between p-4">
            <p className="text-body-sm text-destructive-600">Gagal memuat akun.</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>Ulangi</Button>
          </div>
        )}
        {!isLoading && !isError && (
          <table className="w-full text-left text-body">
            <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Kode</th>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Tipe</th>
                <th className="px-4 py-2">Saldo Normal</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(accounts ?? []).map((acc: ChartOfAccount) => (
                <tr key={acc.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 font-mono text-neutral-800">{acc.code}</td>
                  <td className="px-4 py-2 text-neutral-700">{acc.name}</td>
                  <td className="px-4 py-2"><Badge variant={typeVariant[acc.accountType] ?? 'default'}>{typeLabel[acc.accountType] ?? acc.accountType}</Badge></td>
                  <td className="px-4 py-2 text-neutral-600">{acc.normalBalance}</td>
                  <td className="px-4 py-2">{acc.isActive ? <Badge variant="success">AKTIF</Badge> : <Badge>NONAKTIF</Badge>}</td>
                </tr>
              ))}
              {accounts?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-caption text-neutral-500">Belum ada akun.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
