import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import {
  useCreateIntercompany,
  useStartPeriodClose,
} from '../model/finance-closure.api';
import { useLegalEntities } from '@/entities/legal-entity';
import { formatIdr as fmt } from '@/shared/lib/format';

export function IntercompanyForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateIntercompany();
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const onSubmit = () => {
    if (!fromEntityId || !toEntityId || !amount) return;
    create.mutate(
      { fromEntityId, toEntityId, amount: Number(amount), description: description || undefined },
      { onSuccess: () => { setFromEntityId(''); setToEntityId(''); setAmount(''); setDescription(''); } },
    );
  };

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ic-from">Dari Entity</Label>
          <Select value={fromEntityId} onValueChange={setFromEntityId}>
            <SelectTrigger id="ic-from"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ic-to">Ke Entity</Label>
          <Select value={toEntityId} onValueChange={setToEntityId}>
            <SelectTrigger id="ic-to"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ic-amt">Nilai</Label>
          <Input id="ic-amt" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ic-desc">Keterangan</Label>
          <Input id="ic-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat IC</Button>
      </div>
    </div>
  );
}

export function PeriodCloseForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const start = useStartPeriodClose();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [period, setPeriod] = useState('');

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pc-entity">Entity</Label>
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="pc-entity"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pc-period">Periode</Label>
          <Input id="pc-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" />
        </div>
        <Button
          onClick={() => {
            if (legalEntityId && period) start.mutate({ legalEntityId, period }, { onSuccess: () => setPeriod('') });
          }}
          loading={start.isPending}
        >
          Mulai Period Close
        </Button>
      </div>
    </div>
  );
}

export function EntitySelector({ entityId, setEntityId }: { entityId: string; setEntityId: (v: string) => void }) {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  return (
    <div className="mb-4 w-72">
      <Label htmlFor="fs-entity">Legal Entity</Label>
      <Select value={entityId} onValueChange={setEntityId}>
        <SelectTrigger id="fs-entity"><SelectValue placeholder="Pilih." /></SelectTrigger>
        <SelectContent>
          {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code} - {e.legalName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StatementTable({ title, rows, amountKey }: {
  title: string;
  rows: Array<{ code: string; name: string; [k: string]: unknown }>;
  amountKey: string;
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-neutral-500">{title}</h4>
      <table className="w-full text-left text-body">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-neutral-100">
              <td className="px-2 py-1.5 font-mono text-neutral-600">{r.code}</td>
              <td className="px-2 py-1.5 text-neutral-800">{r.name}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-neutral-700">{fmt(Number(r[amountKey] ?? 0))}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={3} className="px-2 py-2 text-caption text-neutral-500">Tidak ada saldo.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
