import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateFiscalPeriod, useCreateVendor } from '../model/master-data.api';

export function VendorForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [category, setCategory] = useState('MATERIAL');
  const create = useCreateVendor();
  const onSubmit = () => {
    if (!name) return;
    create.mutate({ name, taxId: taxId || undefined, category }, { onSuccess: () => { setName(''); setTaxId(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1"><Label htmlFor="vnd-name">Nama Vendor</Label><Input id="vnd-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="vnd-tax">NPWP</Label><Input id="vnd-tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
        <div>
          <Label htmlFor="vnd-cat">Kategori</Label>
          <select id="vnd-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['MATERIAL', 'SUBCONTRACTOR', 'SERVICE', 'EQUIPMENT', 'OTHER'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Vendor</Button>
      </div>
    </div>
  );
}

export function PeriodForm({ onDone }: { onDone: () => void }) {
  const [periodCode, setPeriodCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const create = useCreateFiscalPeriod();
  const onSubmit = () => {
    if (!periodCode || !startDate || !endDate) return;
    const [y, m] = periodCode.split('-');
    create.mutate(
      { periodCode, periodYear: Number(y), periodMonth: Number(m), startDate, endDate },
      { onSuccess: () => { setPeriodCode(''); setStartDate(''); setEndDate(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="fp-code">Kode (mis. 2026-09)</Label><Input id="fp-code" value={periodCode} onChange={(e) => setPeriodCode(e.target.value)} /></div>
        <div><Label htmlFor="fp-start">Mulai</Label><Input id="fp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><Label htmlFor="fp-end">Selesai</Label><Input id="fp-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Periode</Button>
      </div>
    </div>
  );
}
