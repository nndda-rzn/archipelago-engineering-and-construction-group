import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateFxExposure } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

export function FxForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateFxExposure();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exposureAmount, setExposureAmount] = useState('');
  const [rate, setRate] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !currency || !exposureAmount) return;
    create.mutate(
      { legalEntityId, currency, exposureAmount: Number(exposureAmount), rate: rate ? Number(rate) : undefined },
      { onSuccess: () => { setExposureAmount(''); setRate(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="fx-entity">Entity</Label>
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="fx-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fx-ccy">Mata Uang</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="fx-ccy"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['USD', 'EUR', 'SGD', 'JPY', 'GBP', 'CNY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fx-amt">Eksposur</Label>
          <Input id="fx-amt" type="number" min={0} value={exposureAmount} onChange={(e) => setExposureAmount(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label htmlFor="fx-rate">Rate</Label>
          <Input id="fx-rate" type="number" step="0.000001" min={0} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="16000" className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat FX</Button>
      </div>
    </div>
  );
}
