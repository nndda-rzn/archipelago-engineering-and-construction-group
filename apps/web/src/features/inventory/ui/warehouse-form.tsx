import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createWarehouseSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateWarehouse } from '../model/warehouse.api';

const formSchema = z.object({
  code: createWarehouseSchema.shape.code,
  name: createWarehouseSchema.shape.name,
  warehouseType: z.string(),
  location: createWarehouseSchema.shape.location,
});
type FormValues = z.infer<typeof formSchema>;

export function WarehouseForm({ onDone }: { onDone: () => void }) {
  const create = useCreateWarehouse();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', warehouseType: 'PROJECT', location: '' },
  });
  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { code: input.code, name: input.name, warehouseType: input.warehouseType, location: input.location || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="wh-code">Code <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="wh-code" placeholder="WH-PROJ-014" error={!!errors.code} {...register('code')} />
          {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="wh-name">Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="wh-name" placeholder="Project Warehouse" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="wh-type">Type</Label>
          <Controller name="warehouseType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="wh-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT">PROJECT</SelectItem>
                <SelectItem value="CORPORATE">CORPORATE</SelectItem>
                <SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
                <SelectItem value="VIRTUAL">VIRTUAL</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="wh-location">Location</Label>
          <Input id="wh-location" error={!!errors.location} {...register('location')} />
          {errors.location && <p className="mt-1 text-caption text-destructive-600">{errors.location.message}</p>}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={create.isPending}>Save</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600" role="alert">Failed to save. Please check the data.</p>}
    </form>
  );
}
