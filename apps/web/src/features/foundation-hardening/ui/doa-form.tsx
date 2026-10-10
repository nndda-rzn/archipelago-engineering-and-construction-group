import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createDoaRuleSchema } from '@aec/api-contracts';
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, labelResource, labelRole } from '@aec/ui';
import { useCreateDoaRule, useResolveDoa, useUpdateDoaRule } from '../model/foundation-hardening.api';

const TX_TYPES = ['PurchaseRequisition', 'PurchaseOrder', 'Journal', 'Payment', 'BudgetBaseline', 'Contract'];

const doaSchema = z.object({
  transactionType: z.string().min(1, 'Transaction is required'),
  approverLevel: createDoaRuleSchema.shape.approverLevel,
  amountFrom: z.string().optional(),
  amountTo: z.string().optional(),
  riskLevel: z.string().optional(),
  approverRoleCode: z.string().optional(),
});
type DoaValues = z.infer<typeof doaSchema>;

export interface DoaFormProps {
  editing?: { id: string; transactionType: string; approverLevel: string; amountFrom?: number | null; amountTo?: number | null; riskLevel?: string | null; approverRoleCode?: string | null } | null;
  onDone?: () => void;
}

export function DoaForm({ editing, onDone }: DoaFormProps) {
  const create = useCreateDoaRule();
  const update = useUpdateDoaRule();
  const pending = editing ? update.isPending : create.isPending;
  const isError = editing ? update.isError : create.isError;

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<DoaValues>({
    resolver: zodResolver(doaSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      transactionType: editing?.transactionType ?? 'PurchaseOrder',
      approverLevel: (editing?.approverLevel as DoaValues['approverLevel']) ?? 'L2',
      amountFrom: editing?.amountFrom != null ? String(editing.amountFrom) : '',
      amountTo: editing?.amountTo != null ? String(editing.amountTo) : '',
      riskLevel: editing?.riskLevel ?? '',
      approverRoleCode: editing?.approverRoleCode ?? '',
    },
  });

  const onSubmit = handleSubmit((input) => {
    const payload = {
      transactionType: input.transactionType,
      approverLevel: input.approverLevel,
      amountFrom: input.amountFrom ? Number(input.amountFrom) : undefined,
      amountTo: input.amountTo ? Number(input.amountTo) : undefined,
      riskLevel: (input.riskLevel || undefined) as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
      approverRoleCode: input.approverRoleCode || undefined,
    };
    if (editing) update.mutate({ id: editing.id, ...payload }, { onSuccess: () => { reset(); onDone?.(); } });
    else create.mutate(payload, { onSuccess: () => reset({ transactionType: 'PurchaseOrder', approverLevel: 'L2', amountFrom: '', amountTo: '', riskLevel: '', approverRoleCode: '' }) });
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="doaf-tx">Transaction <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="transactionType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doaf-tx"><SelectValue /></SelectTrigger>
              <SelectContent>{TX_TYPES.map((t) => <SelectItem key={t} value={t}>{labelResource(t)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          {errors.transactionType && <p className="mt-1 text-caption text-destructive-600">{errors.transactionType.message}</p>}
        </div>
        <div><Label htmlFor="doaf-from">From</Label><Input id="doaf-from" type="number" error={!!errors.amountFrom} {...register('amountFrom')} /></div>
        <div><Label htmlFor="doaf-to">To (blank = ∞)</Label><Input id="doaf-to" type="number" error={!!errors.amountTo} {...register('amountTo')} /></div>
        <div>
          <Label htmlFor="doaf-risk">Risk</Label>
          <Controller name="riskLevel" control={control} render={({ field }) => (
            <Select value={field.value || '__any'} onValueChange={(v) => field.onChange(v === '__any' ? '' : v)}>
              <SelectTrigger id="doaf-risk"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {['LOW', 'MEDIUM', 'HIGH'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="doaf-lv">Approver level</Label>
          <Controller name="approverLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doaf-lv"><SelectValue /></SelectTrigger>
              <SelectContent>{['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </div>
        <div><Label htmlFor="doaf-role">Approver role</Label><Input id="doaf-role" placeholder="PROCUREMENT_MANAGER" error={!!errors.approverRoleCode} {...register('approverRoleCode')} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {onDone && <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>}
        <Button type="submit" loading={pending}>{editing ? 'Save changes' : 'Create rule'}</Button>
      </div>
      {isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Check the data again.</p>}
    </form>
  );
}

const resolveSchema = z.object({
  transactionType: z.string().min(1, 'Transaction is required'),
  amount: z.string().optional(),
  legalEntityId: z.string().optional(),
  projectId: z.string().optional(),
  businessUnit: z.string().optional(),
  currencyCode: z.string().optional(),
  riskLevel: z.string().optional(),
});
type ResolveValues = z.infer<typeof resolveSchema>;

/** Simulator: "siapa menyetujui nominal X, dalam konteks Y?" — kirim konteks penuh. */
export function ResolveForm({ onResolved }: { onResolved?: (amount: number | null) => void }) {
  const resolve = useResolveDoa();
  const [result, setResult] = useState<{ approverLevel: string; approverRoleCode: string | null; matchedRules?: number } | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<ResolveValues>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { transactionType: 'PurchaseOrder', amount: '', legalEntityId: '', projectId: '', businessUnit: '', currencyCode: '', riskLevel: '' },
  });

  const onSubmit = handleSubmit((input) => {
    const amount = input.amount ? Number(input.amount) : undefined;
    resolve.mutate(
      {
        transactionType: input.transactionType,
        amount,
        legalEntityId: input.legalEntityId || undefined,
        projectId: input.projectId || undefined,
        businessUnit: input.businessUnit || undefined,
        currencyCode: input.currencyCode || undefined,
        riskLevel: input.riskLevel || undefined,
      },
      {
        onSuccess: (data) => {
          const r = data as unknown as { resolved: { approverLevel: string; approverRoleCode: string | null } | null; matchedRules: number };
          setResult(r.resolved ? { ...r.resolved, matchedRules: r.matchedRules } : null);
          onResolved?.(amount ?? null);
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-950">Who approves?</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="doar-tx">Transaction <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="transactionType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="doar-tx"><SelectValue /></SelectTrigger>
              <SelectContent>{TX_TYPES.map((t) => <SelectItem key={t} value={t}>{labelResource(t)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          {errors.transactionType && <p className="mt-1 text-caption text-destructive-600">{errors.transactionType.message}</p>}
        </div>
        <div><Label htmlFor="doar-amt">Amount</Label><Input id="doar-amt" type="number" error={!!errors.amount} {...register('amount')} /></div>
        <div><Label htmlFor="doar-entity">Legal entity</Label><Input id="doar-entity" placeholder="(optional id)" {...register('legalEntityId')} /></div>
        <div><Label htmlFor="doar-bu">Business unit</Label><Input id="doar-bu" placeholder="(optional)" {...register('businessUnit')} /></div>
        <div><Label htmlFor="doar-proj">Project</Label><Input id="doar-proj" placeholder="(optional id)" {...register('projectId')} /></div>
        <div><Label htmlFor="doar-ccy">Currency</Label><Input id="doar-ccy" placeholder="IDR" maxLength={3} {...register('currencyCode')} /></div>
        <div>
          <Label htmlFor="doar-risk">Risk</Label>
          <Controller name="riskLevel" control={control} render={({ field }) => (
            <Select value={field.value || '__any'} onValueChange={(v) => field.onChange(v === '__any' ? '' : v)}>
              <SelectTrigger id="doar-risk"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {['LOW', 'MEDIUM', 'HIGH'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex items-end"><Button type="submit" loading={resolve.isPending}>Resolve</Button></div>
      </div>
      {result && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-caption text-neutral-500">Approver:</span>
          <Badge variant="success">{result.approverLevel}</Badge>
          {result.approverRoleCode && <span className="text-body-sm text-neutral-700" title={result.approverRoleCode}>{labelRole(result.approverRoleCode)}</span>}
          {result.matchedRules != null && <span className="text-caption text-neutral-500">· {result.matchedRules} matching rule(s)</span>}
        </div>
      )}
      {resolve.isSuccess && !result && <p className="mt-3 text-body-sm text-neutral-500">No rule matches this amount and context.</p>}
    </form>
  );
}
