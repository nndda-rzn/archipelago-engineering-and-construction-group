import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createWorkflowDefinitionSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateWorkflowDefinition } from '../model/approval.api';

const formSchema = createWorkflowDefinitionSchema.pick({ code: true, name: true, transactionType: true });
type FormValues = z.infer<typeof formSchema>;

export function CreateWorkflowForm({ onDone }: { onDone: () => void }) {
  const create = useCreateWorkflowDefinition();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', transactionType: 'PurchaseRequisition' },
  });

  const onSubmit = handleSubmit((input) => create.mutate(input, { onSuccess: () => { reset(); onDone(); } }));

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="wf-code">Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="wf-code" placeholder="e.g. SUB_APPROVAL" error={!!errors.code} {...register('code')} />
          {errors.code && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="wf-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="wf-name" placeholder="Subcontract Approval" error={!!errors.name} {...register('name')} />
          {errors.name && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="wf-type">Transaction Type <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="transactionType" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="wf-type">
              <SelectValue placeholder="Select type…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PurchaseRequisition">PurchaseRequisition</SelectItem>
              <SelectItem value="PurchaseOrder">PurchaseOrder</SelectItem>
            </SelectContent>
          </Select>} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Create Workflow v1</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Workflow code already exists.</p>}
    </form>
  );
}
