import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { createRiskSchema, createAuditSchema, createLegalCaseSchema } from '@aec/api-contracts';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateAccessReview, useCreateAudit, useCreateLegalCase, useCreateRisk } from '../model/governance.api';

const riskSchema = z.object({
  title: createRiskSchema.shape.title,
  category: z.enum(['TECHNICAL', 'FINANCIAL', 'SCHEDULE', 'HSE', 'COMMERCIAL', 'OTHER']),
  likelihood: z.string().min(1, 'Likelihood wajib diisi').refine((v) => Number(v) >= 1 && Number(v) <= 5, 'Likelihood harus 1–5'),
  impact: z.string().min(1, 'Impact wajib diisi').refine((v) => Number(v) >= 1 && Number(v) <= 5, 'Impact harus 1–5'),
  owner: createRiskSchema.shape.owner,
});
type RiskValues = z.infer<typeof riskSchema>;

export function RiskForm({ onDone }: { onDone: () => void }) {
  const create = useCreateRisk();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RiskValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: { title: '', category: 'TECHNICAL', likelihood: '3', impact: '3', owner: '' },
  });
  const likelihood = useWatch({ control, name: 'likelihood' });
  const impact = useWatch({ control, name: 'impact' });
  const score = Number(likelihood) * Number(impact);

  const onSubmit = handleSubmit((input) =>
    create.mutate(
      { title: input.title, category: input.category, likelihood: Number(input.likelihood), impact: Number(input.impact), owner: input.owner },
      { onSuccess: () => { reset(); onDone(); } },
    )
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="risk-title">Risk <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="risk-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="risk-cat">Kategori</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="risk-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['TECHNICAL', 'FINANCIAL', 'SCHEDULE', 'HSE', 'COMMERCIAL', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="risk-l">Likelihood</Label>
          <Input id="risk-l" type="number" min={1} max={5} className="w-16" error={!!errors.likelihood} {...register('likelihood')} />
          {errors.likelihood && <p className="mt-1 text-caption text-destructive-600">{errors.likelihood.message}</p>}
        </div>
        <div>
          <Label htmlFor="risk-i">Impact</Label>
          <Input id="risk-i" type="number" min={1} max={5} className="w-16" error={!!errors.impact} {...register('impact')} />
          {errors.impact && <p className="mt-1 text-caption text-destructive-600">{errors.impact.message}</p>}
        </div>
        <div>
          <Label htmlFor="risk-owner">Owner <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="risk-owner" error={!!errors.owner} {...register('owner')} />
          {errors.owner && <p className="mt-1 text-caption text-destructive-600">{errors.owner.message}</p>}
        </div>
        <div className="pb-2 text-caption text-neutral-500">Skor: <span className="font-mono font-bold">{score}</span></div>
        <Button type="submit" loading={create.isPending}>Buat Risk</Button>
      </div>
    </form>
  );
}

const auditSchema = z.object({
  title: createAuditSchema.shape.title,
  scope: createAuditSchema.shape.scope,
});
type AuditValues = z.infer<typeof auditSchema>;

export function AuditForm({ onDone }: { onDone: () => void }) {
  const create = useCreateAudit();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AuditValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: { title: '', scope: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate({ title: input.title, scope: input.scope || undefined }, { onSuccess: () => { reset(); onDone(); } })
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="audit-title">Judul Audit <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="audit-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div className="flex-1">
          <Label htmlFor="audit-scope">Scope</Label>
          <Input id="audit-scope" error={!!errors.scope} {...register('scope')} />
          {errors.scope && <p className="mt-1 text-caption text-destructive-600">{errors.scope.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Audit</Button>
      </div>
    </form>
  );
}

const legalSchema = z.object({
  title: createLegalCaseSchema.shape.title,
  caseType: z.enum(['CONTRACT', 'LABOR', 'REGULATORY', 'TAX', 'OTHER']),
  counterpart: createLegalCaseSchema.shape.counterpart,
});
type LegalValues = z.infer<typeof legalSchema>;

export function LegalForm({ onDone }: { onDone: () => void }) {
  const create = useCreateLegalCase();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<LegalValues>({
    resolver: zodResolver(legalSchema),
    defaultValues: { title: '', caseType: 'CONTRACT', counterpart: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate({ title: input.title, caseType: input.caseType, counterpart: input.counterpart || undefined }, { onSuccess: () => { reset(); onDone(); } })
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="legal-title">Judul Kasus <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="legal-title" error={!!errors.title} {...register('title')} />
          {errors.title && <p className="mt-1 text-caption text-destructive-600">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="legal-type">Tipe</Label>
          <Controller name="caseType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="legal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['CONTRACT', 'LABOR', 'REGULATORY', 'TAX', 'OTHER'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div>
          <Label htmlFor="legal-cp">Pihak Lawan</Label>
          <Input id="legal-cp" error={!!errors.counterpart} {...register('counterpart')} />
          {errors.counterpart && <p className="mt-1 text-caption text-destructive-600">{errors.counterpart.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Kasus</Button>
      </div>
    </form>
  );
}

const reviewSchema = z.object({
  period: z.string().min(1, 'Periode wajib diisi'),
});
type ReviewValues = z.infer<typeof reviewSchema>;

export function ReviewForm({ onDone }: { onDone: () => void }) {
  const create = useCreateAccessReview();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { period: '' },
  });

  const onSubmit = handleSubmit((input) =>
    create.mutate({ period: input.period }, { onSuccess: () => { reset(); onDone(); } })
  );

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="review-period">Periode (mis. 2026-Q3) <span aria-hidden="true" className="text-destructive-600">*</span></Label>
          <Input id="review-period" error={!!errors.period} {...register('period')} />
          {errors.period && <p className="mt-1 text-caption text-destructive-600">{errors.period.message}</p>}
        </div>
        <Button type="submit" loading={create.isPending}>Buat Review</Button>
      </div>
    </form>
  );
}
