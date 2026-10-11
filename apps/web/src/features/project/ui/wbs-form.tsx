import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createWbsItemSchema } from '@aec/api-contracts';
import { z } from 'zod';
import { FolderTree } from 'lucide-react';
import { Button, ICON_SIZE, ICON_STROKE, Input, Label } from '@aec/ui';
import { useCreateWbsItem } from '@/entities/wbs';
import type { WbsItem } from '@aec/api-contracts';
import { findWbsCode } from './wbs-tree';

const formSchema = z.object({
  code: createWbsItemSchema.shape.code,
  name: createWbsItemSchema.shape.name,
  description: createWbsItemSchema.shape.description,
  responsibleManager: createWbsItemSchema.shape.responsibleManager,
});
type WbsFormValues = z.infer<typeof formSchema>;

export function WbsForm({ projectId, parentId, projectCode, tree, onDone }: { projectId: string; parentId?: string; projectCode: string; tree: WbsItem[]; onDone: () => void }) {
  const create = useCreateWbsItem(projectId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WbsFormValues>({ resolver: zodResolver(formSchema) });
  const onSubmit = handleSubmit((input) =>
    create.mutate(
      {
        code: input.code,
        name: input.name,
        description: input.description || undefined,
        responsibleManager: input.responsibleManager || undefined,
        parentId,
      },
      { onSuccess: () => { reset(); onDone(); } },
    ),
  );

  return (
    <form onSubmit={onSubmit} className="rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center gap-2 text-body-sm text-neutral-600">
        <FolderTree size={ICON_SIZE.md} strokeWidth={ICON_STROKE} aria-hidden="true" />
        {projectCode}
        {parentId && <span className="text-neutral-400">→ child of {findWbsCode(tree, parentId) ?? '…'}</span>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">WBS Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="code" placeholder="1.1" spellCheck={false} error={!!errors.code} {...register('code')} />
          {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="name" placeholder="Detail Engineering" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" placeholder="Optional scope note" {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="owner">Responsible manager</Label>
          <Input id="owner" placeholder="e.g. Ahmad Fauzi" {...register('responsibleManager')} />
          {errors.responsibleManager && <p className="mt-1 text-caption text-destructive-600">{errors.responsibleManager.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Save</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Failed to save. The code may already exist.</p>}
    </form>
  );
}
