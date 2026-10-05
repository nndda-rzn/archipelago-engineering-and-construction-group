import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Label } from '@aec/ui';
import {
  useCreateDeliverable,
  useCreateDrawing,
  useCreateRfi,
  useCreateSubmittal,
  useCreateTransmittal,
} from '../model/engineering.api';

export type EngTab = 'deliverables' | 'drawings' | 'rfis' | 'submittals' | 'transmittals';

interface EngCreateFormProps {
  tab: EngTab;
  onClose: () => void;
}

const formSchema = z.object({
  title: z.string(),
  engineer: z.string(),
  question: z.string(),
  recipient: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export function EngCreateForm({ tab, onClose }: EngCreateFormProps) {
  const createDlv = useCreateDeliverable();
  const createDrw = useCreateDrawing();
  const createRfi = useCreateRfi();
  const createSub = useCreateSubmittal();
  const createTrm = useCreateTransmittal();

  const isPending =
    createDlv.isPending ||
    createDrw.isPending ||
    createRfi.isPending ||
    createSub.isPending ||
    createTrm.isPending;

  // Per-tab required-field expectations kept in the resolver so validation stays in RHF.
  const schema = formSchema.superRefine((values, ctx) => {
    if (!values.title)
      ctx.addIssue({ code: 'custom', path: ['title'], message: tab === 'transmittals' ? 'Subject is required' : 'Title is required' });
    if (tab === 'deliverables' && !values.engineer)
      ctx.addIssue({ code: 'custom', path: ['engineer'], message: 'Engineer is required' });
    if (tab === 'rfis' && !values.question)
      ctx.addIssue({ code: 'custom', path: ['question'], message: 'Question is required' });
    if (tab === 'transmittals' && !values.recipient)
      ctx.addIssue({ code: 'custom', path: ['recipient'], message: 'Recipient is required' });
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: { title: '', engineer: '', question: '', recipient: '' },
  });

  const onSuccess = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit((input) => {
    if (tab === 'deliverables') createDlv.mutate({ title: input.title, engineer: input.engineer }, { onSuccess });
    if (tab === 'drawings') createDrw.mutate({ title: input.title }, { onSuccess });
    if (tab === 'rfis') createRfi.mutate({ title: input.title, question: input.question }, { onSuccess });
    if (tab === 'submittals') createSub.mutate({ title: input.title }, { onSuccess });
    if (tab === 'transmittals') createTrm.mutate({ recipient: input.recipient, subject: input.title }, { onSuccess });
  });

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="eng-title">{tab === 'transmittals' ? 'Subject' : 'Title'} <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="eng-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        {tab === 'deliverables' && (
          <div>
            <Label htmlFor="eng-eng">Engineer <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="eng-eng" error={!!errors.engineer} {...register('engineer')} />
            {errors.engineer && <p className="mt-1 text-caption text-destructive-600">{errors.engineer.message}</p>}
          </div>
        )}
        {tab === 'rfis' && (
          <div className="flex-1">
            <Label htmlFor="eng-q">Question <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="eng-q" error={!!errors.question} {...register('question')} />
            {errors.question && <p className="mt-1 text-caption text-destructive-600">{errors.question.message}</p>}
          </div>
        )}
        {tab === 'transmittals' && (
          <div>
            <Label htmlFor="eng-recipient">Recipient <span aria-hidden="true" className="text-destructive-600">*</span></Label>
            <Input id="eng-recipient" error={!!errors.recipient} {...register('recipient')} />
            {errors.recipient && <p className="mt-1 text-caption text-destructive-600">{errors.recipient.message}</p>}
          </div>
        )}
        <Button type="submit" loading={isPending}>
          Create
        </Button>
      </div>
    </form>
  );
}
