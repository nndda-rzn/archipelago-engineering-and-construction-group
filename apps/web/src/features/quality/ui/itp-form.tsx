import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createItpSchema } from '@aec/api-contracts';
import { Button, Input, Label } from '@aec/ui';
import { useCreateItp } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

const formSchema = z.object({
  title: createItpSchema.shape.title,
  wpId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function ItpForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const create = useCreateItp();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', wpId: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { workPackageId: input.wpId || undefined, title: input.title },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <Controller name="wpId" control={control} render={({ field }) => (
          <WpSelect id="itp-wp" projectId={projectId} value={field.value} onChange={field.onChange} workPackages={workPackages} />
        )} />
        <div className="flex-1">
          <Label htmlFor="itp-title">ITP Title <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="itp-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat ITP</Button>
      </div>
    </form>
  );
}
