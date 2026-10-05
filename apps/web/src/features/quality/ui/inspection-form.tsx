import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createInspectionSchema } from '@aec/api-contracts';
import { Button, Input, Label } from '@aec/ui';
import { useCreateInspection } from '../model/quality.api';
import { ProjectSelect, WpSelect, useProjectOptions } from './quality-selects';

const formSchema = z.object({
  description: createInspectionSchema.shape.description,
  wpId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function InspectionForm({ onDone }: { onDone: () => void }) {
  const { projectId, setProjectId, workPackages } = useProjectOptions();
  const create = useCreateInspection();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: '', wpId: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { workPackageId: input.wpId || undefined, description: input.description },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <ProjectSelect projectId={projectId} setProjectId={setProjectId} />
        <Controller name="wpId" control={control} render={({ field }) => (
          <WpSelect id="ins-wp" projectId={projectId} value={field.value} onChange={field.onChange} workPackages={workPackages} />
        )} />
        <div className="flex-1">
          <Label htmlFor="ins-desc">Inspection Description <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ins-desc" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Inspeksi</Button>
      </div>
    </form>
  );
}
