import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createBidDecisionSchema, createTenderSubmissionSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateBidDecision, useCreateTenderSubmission } from '../model/tender.api';
import type { OppOption } from './tender-types';

const bidSchema = z.object({ oppId: z.string().min(1, 'Opportunity is required'), decision: createBidDecisionSchema.shape.decision, rationale: createBidDecisionSchema.shape.rationale });
type BidValues = z.infer<typeof bidSchema>;
const submissionSchema = z.object({ opportunityId: z.string().min(1, 'Opportunity is required'), channel: createTenderSubmissionSchema.shape.channel, packageVersion: createTenderSubmissionSchema.shape.packageVersion, fileHash: createTenderSubmissionSchema.shape.fileHash });
type SubmissionValues = z.infer<typeof submissionSchema>;

export function BidForm({ opportunities }: { opportunities: OppOption[] }) {
  const create = useCreateBidDecision();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BidValues>({ resolver: zodResolver(bidSchema), defaultValues: { oppId: '', decision: 'BID', rationale: '' } });
  const onSubmit = handleSubmit(({ oppId, decision, rationale }) => create.mutate({ id: oppId, decision, rationale: rationale || undefined }, { onSuccess: () => reset() }));
  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="bid-opp">Opportunity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="oppId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="bid-opp">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber} · {o.title}</SelectItem>)}
            </SelectContent>
          </Select>} />
          {errors.oppId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.oppId.message}</p>}
        </div>
        <div>
          <Label htmlFor="bid-dec">Decision <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="decision" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="bid-dec">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['BID', 'NO_BID'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>} />
        </div>
        <div className="flex-1">
          <Label htmlFor="bid-rat">Reason</Label>
          <Input id="bid-rat" {...register('rationale')} />
        </div>
        <Button type="submit" loading={create.isPending}>Save Decision</Button>
      </div>
    </form>
  );
}

export function SubmissionForm({ opportunities }: { opportunities: OppOption[] }) {
  const create = useCreateTenderSubmission();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SubmissionValues>({ resolver: zodResolver(submissionSchema), defaultValues: { opportunityId: '', channel: 'ELECTRONIC', packageVersion: '', fileHash: '' } });
  const onSubmit = handleSubmit(({ opportunityId, channel, packageVersion, fileHash }) => create.mutate({ opportunityId, channel, packageVersion: packageVersion || undefined, fileHash: fileHash || undefined }, { onSuccess: () => reset() }));
  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="ts-opp">Opportunity <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="opportunityId" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="ts-opp">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((o) => <SelectItem key={o.id} value={o.id}>{o.oppNumber} · {o.title}</SelectItem>)}
            </SelectContent>
          </Select>} />
          {errors.opportunityId && <p role="alert" className="mt-1 text-caption text-destructive-600">{errors.opportunityId.message}</p>}
        </div>
        <div>
          <Label htmlFor="ts-ch">Channel <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Controller name="channel" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="ts-ch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['ELECTRONIC', 'HARDCOPY', 'PORTAL'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>} />
        </div>
        <div>
          <Label htmlFor="ts-pkg">Package Version</Label>
          <Input id="ts-pkg" {...register('packageVersion')} placeholder="v1.2" />
        </div>
        <div className="flex-1">
          <Label htmlFor="ts-hash">File Hash</Label>
          <Input id="ts-hash" {...register('fileHash')} placeholder="sha256:..." />
        </div>
        <Button type="submit" loading={create.isPending}>Record Submission</Button>
      </div>
    </form>
  );
}
