import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createIntercompanySchema, createPeriodCloseSchema } from '@aec/api-contracts';
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
  const schema = z.object({ fromEntityId: z.string().min(1, 'Entity wajib dipilih'), toEntityId: z.string().min(1, 'Entity wajib dipilih'), amount: z.string().min(1, 'Nilai wajib diisi').refine((v) => Number(v) > 0, 'Nilai harus lebih dari 0'), description: createIntercompanySchema.shape.description });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fromEntityId: '', toEntityId: '', amount: '', description: '' } });
  const onSubmit = handleSubmit(({ fromEntityId, toEntityId, amount, description }) => create.mutate({ fromEntityId, toEntityId, amount: Number(amount), description: description || undefined }, { onSuccess: () => reset() }));

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ic-from">Dari Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="fromEntityId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="ic-from"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>} />
          {errors.fromEntityId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.fromEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ic-to">Ke Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="toEntityId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="ic-to"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>} />
          {errors.toEntityId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.toEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ic-amt">Nilai <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ic-amt" type="number" min={0} error={!!errors.amount} {...register('amount')} className="w-32" />
          {errors.amount && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.amount.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="ic-desc">Keterangan</Label>
          <Input id="ic-desc" {...register('description')} />
        </div>
        <Button type="submit" loading={create.isPending}>Buat IC</Button>
      </div>
    </form>
  );
}

export function PeriodCloseForm() {
  const { data: entities } = useLegalEntities({ page: 1, pageSize: 100 });
  const start = useStartPeriodClose();
  const schema = createPeriodCloseSchema;
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { legalEntityId: '', period: '' } });
  const onSubmit = handleSubmit((input) => start.mutate(input, { onSuccess: () => reset({ legalEntityId: input.legalEntityId, period: '' }) }));

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="pc-entity">Entity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="legalEntityId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="pc-entity"><SelectValue placeholder="Pilih." /></SelectTrigger>
            <SelectContent>
              {(entities?.items ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.code}</SelectItem>)}
            </SelectContent>
          </Select>} />
          {errors.legalEntityId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="pc-period">Periode <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="pc-period" error={!!errors.period} {...register('period')} placeholder="2026-08" />
          {errors.period && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.period.message}</p>}
        </div>
        <Button
          type="submit"
          loading={start.isPending}
        >
          Mulai Period Close
        </Button>
      </div>
    </form>
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
