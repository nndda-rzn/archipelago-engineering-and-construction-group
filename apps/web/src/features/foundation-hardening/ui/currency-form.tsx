import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
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
          <Select value={fromCurrencyId} onValueChange={setFromCurrencyId}>
            <SelectTrigger id="rate-from">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rate-to">Ke</Label>
          <Select value={toCurrencyId} onValueChange={setToCurrencyId}>
            <SelectTrigger id="rate-to">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rate-type">Tipe</Label>
          <Select value={rateType} onValueChange={setRateType}>
            <SelectTrigger id="rate-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['SPOT', 'MONTHLY', 'PERIOD_END'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="rate-val">Rate</Label><Input id="rate-val" type="number" step="0.000001" value={rate} onChange={(e) => setRate(e.target.value)} className="w-32" /></div>
        <Button onClick={() => { if (fromCurrencyId && toCurrencyId && rate) createRate.mutate({ fromCurrencyId, toCurrencyId, rateType, rate: Number(rate) }, { onSuccess: () => setRate('') }); }} loading={createRate.isPending}>
          Catat Kurs
        </Button>
      </div>
    </div>
  );
}
