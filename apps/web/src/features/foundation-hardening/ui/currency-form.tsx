import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createCurrencySchema, createExchangeRateSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateCurrency, useCreateExchangeRate } from '../model/foundation-hardening.api';

const currencySchema = z.object({
  code: createCurrencySchema.shape.code,
  name: createCurrencySchema.shape.name,
  symbol: z.string().max(10).optional(),
  decimals: z.string().optional(),
});
type CurrencyValues = z.infer<typeof currencySchema>;

const rateSchema = z.object({
  fromCurrencyId: z.string().min(1, 'Source currency is required'),
  toCurrencyId: z.string().min(1, 'Target currency is required'),
  rateType: createExchangeRateSchema.shape.rateType,
  rate: z.string().min(1, 'Rate is required').refine((v) => !Number.isNaN(Number(v)), 'Rate must be a number'),
  effectiveDate: z.string().optional(),
});
type RateValues = z.infer<typeof rateSchema>;

export function CurrencyForm({ currencies }: { currencies: Array<{ id: string; code: string }> }) {
  const createCurrency = useCreateCurrency();
  const createRate = useCreateExchangeRate();
  const [busy, setBusy] = useState(false);

  const currencyForm = useForm<CurrencyValues>({ resolver: zodResolver(currencySchema), defaultValues: { code: '', name: '', symbol: '', decimals: '2' } });
  const onCurrencySubmit = currencyForm.handleSubmit((input) => {
    setBusy(true);
    createCurrency.mutate(
      { code: input.code.toUpperCase(), name: input.name, symbol: input.symbol || undefined, decimals: input.decimals ? Number(input.decimals) : undefined },
      { onSuccess: () => { currencyForm.reset(); setBusy(false); }, onError: () => setBusy(false) },
    );
  });

  const rateForm = useForm<RateValues>({ resolver: zodResolver(rateSchema), defaultValues: { fromCurrencyId: '', toCurrencyId: '', rateType: 'SPOT', rate: '', effectiveDate: '' } });
  const onRateSubmit = rateForm.handleSubmit((input) => {
    setBusy(true);
    createRate.mutate(
      { fromCurrencyId: input.fromCurrencyId, toCurrencyId: input.toCurrencyId, rateType: input.rateType, rate: Number(input.rate), effectiveDate: input.effectiveDate || undefined },
      { onSuccess: () => { rateForm.reset({ fromCurrencyId: '', toCurrencyId: '', rateType: 'SPOT', rate: '', effectiveDate: '' }); setBusy(false); }, onError: () => setBusy(false) },
    );
  });

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <form onSubmit={onCurrencySubmit}>
        <h3 className="mb-3 text-h3 text-neutral-950">Add currency</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="cur-code">Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="cur-code" placeholder="USD" maxLength={3} error={!!currencyForm.formState.errors.code} {...currencyForm.register('code')} />
            {currencyForm.formState.errors.code && <p className="mt-1 text-caption text-destructive-600">{currencyForm.formState.errors.code.message}</p>}
          </div>
          <div>
            <Label htmlFor="cur-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="cur-name" error={!!currencyForm.formState.errors.name} {...currencyForm.register('name')} />
            {currencyForm.formState.errors.name && <p className="mt-1 text-caption text-destructive-600">{currencyForm.formState.errors.name.message}</p>}
          </div>
          <div><Label htmlFor="cur-symbol">Symbol</Label><Input id="cur-symbol" placeholder="Rp" maxLength={10} {...currencyForm.register('symbol')} /></div>
          <div><Label htmlFor="cur-decimals">Decimals</Label><Input id="cur-decimals" type="number" min={0} max={6} {...currencyForm.register('decimals')} /></div>
        </div>
        <div className="mt-3 flex justify-end"><Button type="submit" loading={busy && createCurrency.isPending}>Create currency</Button></div>
      </form>

      <form onSubmit={onRateSubmit} className="mt-4 border-t border-neutral-100 pt-4">
        <h3 className="mb-3 text-h3 text-neutral-950">Record exchange rate</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="rate-from">From <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Controller name="fromCurrencyId" control={rateForm.control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="rate-from"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {rateForm.formState.errors.fromCurrencyId && <p className="mt-1 text-caption text-destructive-600">{rateForm.formState.errors.fromCurrencyId.message}</p>}
          </div>
          <div>
            <Label htmlFor="rate-to">To <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Controller name="toCurrencyId" control={rateForm.control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="rate-to"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {rateForm.formState.errors.toCurrencyId && <p className="mt-1 text-caption text-destructive-600">{rateForm.formState.errors.toCurrencyId.message}</p>}
          </div>
          <div>
            <Label htmlFor="rate-type">Type</Label>
            <Controller name="rateType" control={rateForm.control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="rate-type"><SelectValue /></SelectTrigger>
                <SelectContent>{['SPOT', 'MONTHLY', 'PERIOD_END'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div>
            <Label htmlFor="rate-val">Rate <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="rate-val" type="number" step="0.000001" error={!!rateForm.formState.errors.rate} {...rateForm.register('rate')} />
            {rateForm.formState.errors.rate && <p className="mt-1 text-caption text-destructive-600">{rateForm.formState.errors.rate.message}</p>}
          </div>
          <div><Label htmlFor="rate-date">Effective date</Label><Input id="rate-date" type="date" {...rateForm.register('effectiveDate')} /></div>
        </div>
        <div className="mt-3 flex justify-end"><Button type="submit" loading={busy && createRate.isPending}>Record rate</Button></div>
      </form>
    </div>
  );
}
