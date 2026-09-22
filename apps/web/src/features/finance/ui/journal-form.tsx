import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useChartOfAccounts, useCreateJournal } from '../model/finance.api';
import { formatNumber } from '@/shared/lib/format';

const lineSchema = z.object({
  accountId: z.string(),
  description: z.string().max(300),
  debit: z.number(),
  credit: z.number(),
});
const formSchema = z.object({
  description: z.string().min(1, 'Deskripsi wajib diisi').max(500),
  reference: z.string().max(100),
  lines: z.array(lineSchema),
});
type FormValues = z.infer<typeof formSchema>;

export function JournalForm({ onDone, entityId }: { onDone: () => void; entityId: string }) {
  const { data: accounts } = useChartOfAccounts({ legalEntityId: entityId });
  const create = useCreateJournal();
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: '', reference: '', lines: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });

  const totalDebit = (lines ?? []).reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = (lines ?? []).reduce((sum, l) => sum + (l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const onSubmit = handleSubmit((input) => {
    const validLines = input.lines.filter((l) => l.accountId && ((l.debit || 0) > 0 || (l.credit || 0) > 0));
    if (!balanced || validLines.length === 0) return;
    create.mutate(
      {
        legalEntityId: entityId,
        description: input.description,
        reference: input.reference || undefined,
        lines: validLines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, description: l.description || undefined })),
      },
      { onSuccess: () => { reset(); onDone(); } },
    );
  });

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="jrn-desc">Deskripsi <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="jrn-desc" placeholder="mis. Biaya operasional bulanan" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <div>
          <Label htmlFor="jrn-ref">Referensi (opsional)</Label>
          <Input id="jrn-ref" placeholder="No. dokumen" {...register('reference')} />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Akun</th>
              <th className="px-3 py-2">Deskripsi Line</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Kredit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Controller name={`lines.${index}.accountId`} control={control} render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Pilih akun…" /></SelectTrigger>
                      <SelectContent>
                        {(accounts ?? []).map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.code} — {acc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </td>
                <td className="px-3 py-2"><Input placeholder="opsional" className="h-8 w-44" {...register(`lines.${index}.description`)} /></td>
                <td className="px-3 py-2">
                  <Controller name={`lines.${index}.debit`} control={control} render={({ field: f }) => (
                    <Input type="number" min={0} placeholder="0" className="h-8 w-28 text-right" value={f.value || ''} onChange={(e) => {
                      const val = Number(e.target.value);
                      f.onChange(val);
                      if (val > 0) setValue(`lines.${index}.credit`, 0);
                    }} />
                  )} />
                </td>
                <td className="px-3 py-2">
                  <Controller name={`lines.${index}.credit`} control={control} render={({ field: f }) => (
                    <Input type="number" min={0} placeholder="0" className="h-8 w-28 text-right" value={f.value || ''} onChange={(e) => {
                      const val = Number(e.target.value);
                      f.onChange(val);
                      if (val > 0) setValue(`lines.${index}.debit`, 0);
                    }} />
                  )} />
                </td>
                <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>Hapus</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {fields.length === 0 && <p className="p-3 text-caption text-neutral-500">Belum ada line. Tambahkan akun debit/kredit.</p>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-6 text-body-sm">
          <span className="text-neutral-600">Total Debit: <span className="font-mono tabular-nums">{formatNumber(totalDebit)}</span></span>
          <span className="text-neutral-600">Total Kredit: <span className="font-mono tabular-nums">{formatNumber(totalCredit)}</span></span>
          {fields.length > 0 && (<span className={balanced ? 'text-semantic-success' : 'text-destructive-600'}>{balanced ? 'Balance ✓' : 'Belum balance'}</span>)}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ accountId: '', debit: 0, credit: 0, description: '' })}>+ Tambah Line</Button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={create.isPending} disabled={!balanced}>Simpan Journal DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal: journal harus balance, akun valid & aktif.</p>}
    </form>
  );
}
