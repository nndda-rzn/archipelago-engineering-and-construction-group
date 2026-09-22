import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { createHandoverSchema } from '@aec/api-contracts';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useCreateHandover, useSubmitHandover, useVerifyHandoverItem, useApproveHandover } from '../model/work-package.api';
import { statusLabel, type HandoverStatus } from './handover-grid';

const DEFAULT_DOCS = ['As-Built Drawing', 'Test Certificate'];

const formSchema = z.object({
  title: createHandoverSchema.shape.title,
  handoverDate: z.string(),
  checklist: createHandoverSchema.shape.checklist,
  docNames: z.array(z.object({ documentName: z.string().min(2, 'Nama dokumen wajib diisi').max(200) })),
});
type FormValues = z.infer<typeof formSchema>;

export function HandoverForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateHandover(projectId);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      handoverDate: new Date().toISOString().slice(0, 10),
      checklist: '',
      docNames: DEFAULT_DOCS.map((documentName) => ({ documentName })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'docNames' });
  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { title: input.title, handoverDate: input.handoverDate, checklist: input.checklist || undefined, items: input.docNames.map((d) => ({ documentName: d.documentName })) },
      { onSuccess: () => { reset({ title: '', handoverDate: new Date().toISOString().slice(0, 10), checklist: '', docNames: DEFAULT_DOCS.map((documentName) => ({ documentName })) }); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="hand-title">Judul <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="hand-title" placeholder="Handover Area A" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="hand-date">Tanggal</Label>
          <Input id="hand-date" type="date" error={!!errors.handoverDate} {...register('handoverDate')} />
          {errors.handoverDate && <p className="mt-1 text-caption text-destructive-600">{errors.handoverDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="hand-checklist">Checklist</Label>
          <Input id="hand-checklist" placeholder="Opsional" error={!!errors.checklist} {...register('checklist')} />
          {errors.checklist && <p className="mt-1 text-caption text-destructive-600">{errors.checklist.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Dokumen</Label>
        {fields.map((field, i) => (
          <div key={field.id} className="flex gap-2">
            <div className="flex-1">
              <Input error={!!errors.docNames?.[i]?.documentName} {...register(`docNames.${i}.documentName` as const)} />
              {errors.docNames?.[i]?.documentName && <p className="mt-1 text-caption text-destructive-600">{errors.docNames[i]?.documentName?.message}</p>}
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={() => remove(i)}>Hapus</Button>
          </div>
        ))}
        <Button size="sm" variant="secondary" type="button" onClick={() => append({ documentName: '' })}>+ Dokumen</Button>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" type="button" onClick={onDone}>Batal</Button><Button size="sm" type="submit" loading={create.isPending}>Buat Handover</Button></div>
      {create.isError && <p className="mt-1 text-caption text-destructive-600" role="alert">Gagal menyimpan. Periksa kembali data.</p>}
    </form>
  );
}

export function HandoverDetail({ selected, projectId }: { selected: { id: string; title: string; hoNumber: string; status: string; items: Array<{ id: string; documentName: string; isMandatory: boolean; status: string }> }; projectId: string }) {
  const submit = useSubmitHandover(projectId);
  const verify = useVerifyHandoverItem(projectId);
  const approve = useApproveHandover(projectId);
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between"><div><h2 className="text-h3 text-neutral-800">{selected.title}</h2><p className="font-mono text-caption text-neutral-500">{selected.hoNumber} · {statusLabel[selected.status as HandoverStatus]}</p></div><div className="flex gap-2">{selected.status === 'DRAFT' && <Button size="sm" onClick={() => submit.mutate(selected.id)} disabled={submit.isPending}>Submit</Button>}{selected.status === 'SUBMITTED' && <Button size="sm" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending || selected.items.some((i) => i.status !== 'VERIFIED')}>Approve</Button>}</div></div>
      <div className="mt-4 space-y-2">{selected.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2"><div><span className="text-body-sm text-neutral-800">{item.documentName}</span>{item.isMandatory && <Badge variant="warning" className="ml-2">Mandatory</Badge>}<Badge variant={item.status === 'VERIFIED' ? 'success' : 'default'} className="ml-2">{item.status}</Badge></div>{item.status !== 'VERIFIED' && <Button size="sm" variant="secondary" onClick={() => verify.mutate({ id: selected.id, itemId: item.id })} disabled={verify.isPending}>Verifikasi</Button>}</div>)}</div>
      {approve.isError && <p className="mt-2 text-body-sm text-destructive-600">Semua dokumen harus VERIFIED sebelum approve.</p>}
    </div>
  );
}
