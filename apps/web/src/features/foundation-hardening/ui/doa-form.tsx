import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createDoaRuleSchema } from '@aec/api-contracts';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, labelResource, labelRole } from '@aec/ui';
import { useCreateDoaRule, useResolveDoa } from '../model/foundation-hardening.api';

const TX_TYPES = ['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'];

const doaSchema = z.object({
  transactionType: z.string().min(1, 'Transaksi wajib dipilih'),
  approverLevel: createDoaRuleSchema.shape.approverLevel,
  amountFrom: z.string().optional(),
  amountTo: z.string().optional(),
  riskLevel: z.string().optional(),
  approverRoleCode: z.string().optional(),
});
type DoaValues = z.infer<typeof doaSchema>;

export function DoaForm() {
  const create = useCreateDoaRule();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<DoaValues>({
    resolver: zodResolver(doaSchema),
    defaultValues: { transactionType: 'PurchaseOrder', approverLevel: 'L2', amountFrom: '', amountTo: '', riskLevel: '', approverRoleCode: '' },
  });
  const onSubmit = handleSubmit((input) => create.mutate({
    transactionType: input.transactionType,
    approverLevel: input.approverLevel,
    amountFrom: input.amountFrom ? Number(input.amountFrom) : undefined,
    amountTo: input.amountTo ? Number(input.amountTo) : undefined,
    riskLevel: (input.riskLevel || undefined) as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
    approverRoleCode: input.approverRoleCode || undefined,
  }, { onSuccess: () => reset({ transactionType: 'PurchaseOrder', approverLevel: 'L2', amountFrom: '', amountTo: '', riskLevel: '', approverRoleCode: '' }) }));

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="doaf-tx">Transaksi <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="transactionType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doaf-tx">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              {TX_TYPES.map((t) => <SelectItem key={t} value={t}>{labelResource(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
          {errors.transactionType && <p className="mt-1 text-caption text-destructive-600">{errors.transactionType.message}</p>}
        </div>
        <div><Label htmlFor="doaf-from">Dari</Label><Input id="doaf-from" type="number" className="w-28" error={!!errors.amountFrom} {...register('amountFrom')} /></div>
        <div><Label htmlFor="doaf-to">Sampai</Label><Input id="doaf-to" type="number" className="w-28" error={!!errors.amountTo} {...register('amountTo')} /></div>
        <div>
          <Label htmlFor="doaf-risk">Risiko</Label>
          <Controller name="riskLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doaf-risk">
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                {['LOW', 'MEDIUM', 'HIGH'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="doaf-lv">Level</Label>
          <Controller name="approverLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doaf-lv">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div><Label htmlFor="doaf-role">Role</Label><Input id="doaf-role" placeholder="PROCUREMENT_MANAGER" error={!!errors.approverRoleCode} {...register('approverRoleCode')} /></div>
        <Button type="submit" loading={create.isPending}>Buat Rule</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Gagal menyimpan. Periksa kembali data.</p>}
    </form>
  );
}

const resolveSchema = z.object({
  transactionType: z.string().min(1, 'Transaksi wajib dipilih'),
  amount: z.string().optional(),
});
type ResolveValues = z.infer<typeof resolveSchema>;

export function ResolveForm() {
  const resolve = useResolveDoa();
  const [result, setResult] = useState<{ approverLevel: string; approverRoleCode: string | null } | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<ResolveValues>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { transactionType: 'PurchaseOrder', amount: '' },
  });
  const onSubmit = handleSubmit((input) => {
    resolve.mutate({ transactionType: input.transactionType, amount: input.amount ? Number(input.amount) : undefined }, {
      onSuccess: (data) => {
        const r = data as unknown as { resolved: { approverLevel: string; approverRoleCode: string | null } | null };
        setResult(r.resolved);
      },
    });
  });
  return (
    <form onSubmit={onSubmit} className="mt-2 flex items-end gap-3">
      <div>
        <Label htmlFor="doar-tx">Transaksi <span aria-hidden="true" className="text-destructive-600">*</span></Label>
        <Controller name="transactionType" control={control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="doar-tx">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )} />
        {errors.transactionType && <p className="mt-1 text-caption text-destructive-600">{errors.transactionType.message}</p>}
      </div>
      <div><Label htmlFor="doar-amt">Amount</Label><Input id="doar-amt" type="number" className="w-36" error={!!errors.amount} {...register('amount')} /></div>
      <Button type="submit" loading={resolve.isPending}>Resolve</Button>
      {result && (
        <div className="flex items-center gap-2">
          <span className="text-caption text-neutral-500">Approver:</span>
          <Badge variant="success">{result.approverLevel}</Badge>
          {result.approverRoleCode && <span className="text-body-sm text-neutral-700" title={result.approverRoleCode}>{labelRole(result.approverRoleCode)}</span>}
        </div>
      )}
    </form>
  );
}
