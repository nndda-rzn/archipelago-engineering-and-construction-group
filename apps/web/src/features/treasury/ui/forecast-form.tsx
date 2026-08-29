import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateCashForecast } from '../model/treasury.api';
import { useLegalEntities } from '@/entities/legal-entity';

export function ForecastForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateCashForecast();
  const [legalEntityId, setLegalEntityId] = useState('');
  const [period, setPeriod] = useState('');
  const [receipt, setReceipt] = useState('');
  const [ap, setAp] = useState('');
  const [payroll, setPayroll] = useState('');
  const onSubmit = () => {
    if (!legalEntityId || !period) return;
    create.mutate(
      { legalEntityId, period, expectedReceipt: receipt ? Number(receipt) : undefined, expectedAp: ap ? Number(ap) : undefined, expectedPayroll: payroll ? Number(payroll) : undefined },
      { onSuccess: () => { setPeriod(''); setReceipt(''); setAp(''); setPayroll(''); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="cf-entity">Entity</Label>
          <Select value={legalEntityId} onValueChange={setLegalEntityId}>
            <SelectTrigger id="cf-entity"><SelectValue placeholder="Pilih…" /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="cf-period">Periode</Label>
          <Input id="cf-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" />
        </div>
        <div>
          <Label htmlFor="cf-receipt">Receipt</Label>
          <Input id="cf-receipt" type="number" min={0} value={receipt} onChange={(e) => setReceipt(e.target.value)} className="w-32" />
        </div>
        <div>
          <Label htmlFor="cf-ap">AP</Label>
          <Input id="cf-ap" type="number" min={0} value={ap} onChange={(e) => setAp(e.target.value)} className="w-32" />
        </div>
        <div>
          <Label htmlFor="cf-payroll">Payroll</Label>
          <Input id="cf-payroll" type="number" min={0} value={payroll} onChange={(e) => setPayroll(e.target.value)} className="w-32" />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Forecast</Button>
      </div>
    </div>
  );
}
