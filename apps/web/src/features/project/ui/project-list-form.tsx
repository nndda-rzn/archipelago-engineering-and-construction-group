import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { createProjectSchema } from '@aec/api-contracts';
import { z } from 'zod';
import { Button, Input, Label, EntitySelect } from '@aec/ui';
import { useCreateProject } from '@/entities/project';
import { useLegalEntities } from '@/entities/legal-entity';

const formSchema = z.object({
  code: createProjectSchema.shape.code,
  name: createProjectSchema.shape.name,
  client: createProjectSchema.shape.client,
  legalEntityId: createProjectSchema.shape.legalEntityId,
  location: z.string().optional(),
});
type ProjectFormValues = z.infer<typeof formSchema>;

export function ProjectForm({ onDone }: { onDone: () => void }) {
  const entities = useLegalEntities({ page: 1, pageSize: 100 });
  const create = useCreateProject();
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<ProjectFormValues>({ resolver: zodResolver(formSchema) });
  const legalEntityId = useWatch({ control, name: 'legalEntityId' });
  const onSubmit = handleSubmit((input) => create.mutate(input, { onSuccess: () => { reset(); onDone(); } }));

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label htmlFor="code">Kode Project</Label><Input id="code" placeholder="PRJ-EPC-2027-014" spellCheck={false} error={!!errors.code} {...register('code')} />{errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}</div>
        <div><Label htmlFor="name">Nama Project</Label><Input id="name" placeholder="EPC Industrial Processing Facility" error={!!errors.name} {...register('name')} />{errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}</div>
        <div><Label htmlFor="client">Klien</Label><Input id="client" placeholder="PT Klien Utama" error={!!errors.client} {...register('client')} />{errors.client && <p className="mt-1 text-caption text-destructive-600">{errors.client.message}</p>}</div>
        <div>
          <Label htmlFor="legalEntityId">Legal Entity</Label>
          <EntitySelect
            value={legalEntityId ?? ''}
            onValueChange={(value) => setValue('legalEntityId', value, { shouldValidate: true })}
            options={(entities.data?.items ?? []).map((e) => ({ value: e.id, label: `${e.code} — ${e.legalName}` }))}
            placeholder="Pilih entity…"
            searchPlaceholder="Cari entity…"
            error={!!errors.legalEntityId}
          />
          {errors.legalEntityId && <p className="mt-1 text-caption text-destructive-600">{errors.legalEntityId.message}</p>}
        </div>
        <div className="col-span-2"><Label htmlFor="location">Lokasi</Label><Input id="location" placeholder="Karawang" {...register('location')} /></div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="submit" loading={create.isPending}>Simpan</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat project. Kode mungkin sudah dipakai.</p>}
    </form>
  );
}
