import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateCurrency, useCreateExchangeRate } from '../model/foundation-hardening.api';

export function CurrencyForm({ currencies }: { currencies: Array<{ id: string; code: string }> }) {
  const createCurrency = useCreateCurrency();
  const createRate = useCreateExchangeRate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [fromCurrencyId, setFromCurrencyId] = useState('');
  const [toCurrencyId, setToCurrencyId] = useState('');
  const [rateType, setRateType] = useState('SPOT');
  const [rate, setRate] = useState('');
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div><Label htmlFor="cur-code">Kode</Label><Input id="cur-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="USD" className="w-24" /></div>
        <div className="flex-1"><Label htmlFor="cur-name">Nama</Label><Input id="cur-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <Button onClick={() => { if (code && name) createCurrency.mutate({ code: code.toUpperCase(), name }, { onSuccess: () => { setCode(''); setName(''); } }); }} loading={createCurrency.isPending}>
          Buat Mata Uang
        </Button>
      </div>
      <div className="mt-4 flex items-end gap-3 border-t border-neutral-100 pt-4">
        <div>
          <Label htmlFor="rate-from">Dari</Label>
          <select id="rate-from" value={fromCurrencyId} onChange={(e) => setFromCurrencyId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rate-to">Ke</Label>
          <select id="rate-to" value={toCurrencyId} onChange={(e) => setToCurrencyId(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            <option value="">Pilih…</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="rate-type">Tipe</Label>
          <select id="rate-type" value={rateType} onChange={(e) => setRateType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['SPOT', 'MONTHLY', 'PERIOD_END'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><Label htmlFor="rate-val">Rate</Label><Input id="rate-val" type="number" step="0.000001" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" /></div>
        <Button onClick={() => { if (fromCurrencyId && toCurrencyId && rate) createRate.mutate({ fromCurrencyId, toCurrencyId, rateType, rate: Number(rate) }, { onSuccess: () => setRate('') }); }} loading={createRate.isPending}>
          Catat Kurs
        </Button>
      </div>
    </div>
  );
}
