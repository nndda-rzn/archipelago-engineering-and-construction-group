import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClientSchema } from '@aec/api-contracts';
import { Button, Input, Label } from '@aec/ui';
import { useCreateClient } from '../model/commercial.api';

const formSchema = z.object({
  name: createClientSchema.shape.name,
  industry: z.string().max(100),
  contactPerson: z.string().max(200),
  email: z.union([z.literal(''), z.string().email('Invalid email')]),
});
type FormValues = z.infer<typeof formSchema>;

export function ClientForm({ onDone }: { onDone: () => void }) {
  const create = useCreateClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', industry: '', contactPerson: '', email: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { name: input.name, industry: input.industry || undefined, contactPerson: input.contactPerson || undefined, email: input.email || undefined },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="clt-name">Client Name <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="clt-name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="clt-industry">Industry</Label>
          <Input id="clt-industry" {...register('industry')} />
        </div>
        <div>
          <Label htmlFor="clt-contact">Contact</Label>
          <Input id="clt-contact" {...register('contactPerson')} />
        </div>
        <div>
          <Label htmlFor="clt-email">Email</Label>
          <Input id="clt-email" type="email" error={!!errors.email} {...register('email')} />
          {errors.email && <p className="mt-1 text-caption text-destructive-600">{errors.email.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Create Client</Button>
      </div>
    </form>
  );
}
