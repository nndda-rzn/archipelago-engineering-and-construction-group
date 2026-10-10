import { useState } from 'react';
import type { Currency } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useRevalue } from '../model/foundation-hardening.api';
import { formatIdr } from '@/shared/lib/format';

/** Kalkulator konversi: nominal + pasangan + tanggal → nilai hasil & kurs terpakai. */
export function RevaluePanel({ currencies }: { currencies: Currency[] }) {
  const revalue = useRevalue();
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asOf, setAsOf] = useState('');
  const [result, setResult] = useState<{ rate: number | null; converted: number | null; note?: string } | null>(null);

  const run = () => {
    const fromCode = currencies.find((c) => c.id === from)?.code;
    const toCode = currencies.find((c) => c.id === to)?.code;
    if (!fromCode || !toCode || !amount) return;
    revalue.mutate(
      { amount: Number(amount), fromCurrencyCode: fromCode, toCurrencyCode: toCode, asOf: asOf || undefined },
      { onSuccess: (data) => setResult({ rate: data.rate, converted: data.converted, note: data.note }) },
    );
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-2 text-h3 text-neutral-950">Currency conversion</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><Label htmlFor="rv-amount">Amount</Label><Input id="rv-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div>
          <Label htmlFor="rv-from">From</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger id="rv-from"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rv-to">To</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger id="rv-to"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="rv-asof">As of</Label><Input id="rv-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
        <div className="flex items-end"><Button type="button" onClick={run} loading={revalue.isPending} disabled={!amount || !from || !to}>Convert</Button></div>
      </div>
      {result && (
        <p className="mt-3 text-body-sm text-neutral-700">
          {result.converted != null ? (
            <>Converted: <span className="font-mono tabular-nums">{formatIdr(result.converted)}</span> · rate <span className="font-mono tabular-nums">{result.rate}</span></>
          ) : (
            <span className="text-neutral-500">{result.note ?? 'No exchange rate found for this pair and date.'}</span>
          )}
        </p>
      )}
    </div>
  );
}
