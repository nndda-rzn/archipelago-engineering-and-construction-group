import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateIncident, useCreateObservation, useCreatePermit } from '../model/hse.api';

const observationSchema = z.object({
  type: z.enum(['UNSAFE', 'SAFE']),
  description: z.string().min(1, 'Description is required'),
});
type ObservationValues = z.infer<typeof observationSchema>;

export function ObservationForm({ onDone }: { onDone: () => void }) {
  const create = useCreateObservation();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ObservationValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: { type: 'UNSAFE', description: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { type: input.type, description: input.description },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="obs-type">Type</Label>
          <Controller name="type" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="obs-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNSAFE">UNSAFE</SelectItem>
                <SelectItem value="SAFE">SAFE</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="obs-desc">Description <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="obs-desc" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Create Observation</Button>
      </div>
    </form>
  );
}

const incidentSchema = z.object({
  type: z.enum(['NEAR_MISS', 'INJURY', 'PROPERTY', 'ENVIRONMENT']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(1, 'Description is required'),
});
type IncidentValues = z.infer<typeof incidentSchema>;

export function IncidentForm({ onDone }: { onDone: () => void }) {
  const create = useCreateIncident();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<IncidentValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { type: 'NEAR_MISS', severity: 'MEDIUM', description: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { type: input.type, severity: input.severity, description: input.description },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="inc-type">Type</Label>
          <Controller name="type" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="inc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEAR_MISS">NEAR_MISS</SelectItem>
                <SelectItem value="INJURY">INJURY</SelectItem>
                <SelectItem value="PROPERTY">PROPERTY</SelectItem>
                <SelectItem value="ENVIRONMENT">ENVIRONMENT</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="inc-sev">Severity</Label>
          <Controller name="severity" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="inc-sev">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">LOW</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="flex-1">
          <Label htmlFor="inc-desc">Description <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="inc-desc" error={!!errors.description} {...register('description')} />
          {errors.description && <p className="mt-1 text-caption text-destructive-600">{errors.description.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Create Incident</Button>
      </div>
    </form>
  );
}

const permitSchema = z.object({
  area: z.string().min(1, 'Area is required'),
  issuedTo: z.string().min(1, 'Issued-to is required'),
  validFrom: z.string().min(1, 'Start date is required'),
  validTo: z.string().min(1, 'End date is required'),
});
type PermitValues = z.infer<typeof permitSchema>;

export function PermitForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePermit();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PermitValues>({
    resolver: zodResolver(permitSchema),
    defaultValues: { area: '', issuedTo: '', validFrom: '', validTo: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { area: input.area, issuedTo: input.issuedTo, validFrom: input.validFrom, validTo: input.validTo },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="ptw-area">Area <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ptw-area" error={!!errors.area} {...register('area')} />
          {errors.area && <p className="mt-1 text-caption text-destructive-600">{errors.area.message}</p>}
        </div>
        <div>
          <Label htmlFor="ptw-to">Issued to <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ptw-to" error={!!errors.issuedTo} {...register('issuedTo')} />
          {errors.issuedTo && <p className="mt-1 text-caption text-destructive-600">{errors.issuedTo.message}</p>}
        </div>
        <div>
          <Label htmlFor="ptw-from">From <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ptw-from" type="date" error={!!errors.validFrom} {...register('validFrom')} />
          {errors.validFrom && <p className="mt-1 text-caption text-destructive-600">{errors.validFrom.message}</p>}
        </div>
        <div>
          <Label htmlFor="ptw-until">Until <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="ptw-until" type="date" error={!!errors.validTo} {...register('validTo')} />
          {errors.validTo && <p className="mt-1 text-caption text-destructive-600">{errors.validTo.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Issue PTW</Button>
      </div>
    </form>
  );
}
