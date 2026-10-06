import { Check, Dot } from 'lucide-react';
import { labelRole } from '@aec/ui';
import type { ApprovalDetail } from '@aec/api-contracts';

const DOT_CLASS: Record<'done' | 'current' | 'upcoming', string> = {
  done: 'bg-success-500 text-white',
  current: 'bg-neutral-800 text-white',
  upcoming: 'bg-neutral-100 text-neutral-400',
};

/**
 * Rantai approval dari definisi aktif + posisi task ini. Status tiap langkah
 * diturunkan dari `stepOrder` task (bukan tebakan). Bila tak ada definisi, UI
 * menyebutnya "custom approval" alih-alih menggambar rantai palsu.
 */
export function ApprovalChain({ chain, currentStep }: { chain: NonNullable<ApprovalDetail['chain']>; currentStep: number }) {
  return (
    <section className="border-b border-neutral-200 px-6 py-4" aria-label="Approval chain">
      <h3 className="mb-3 text-h3 text-neutral-800">
        Approval chain <span className="text-body-sm font-normal text-neutral-500">· step {currentStep} of {chain.length}</span>
      </h3>
      <ol className="space-y-3">
        {chain.map((step) => (
          <li key={step.stepOrder} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption ${DOT_CLASS[step.status]}`}
              aria-hidden="true"
            >
              {step.status === 'done' ? <Check className="h-3 w-3" /> : <Dot className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-body-sm text-neutral-900">
                <span className="font-mono text-neutral-400">{step.stepOrder}.</span> {step.name}
                {step.status === 'current' && <span className="ml-2 text-caption text-neutral-500">(you are here)</span>}
              </p>
              <p className="text-caption text-neutral-500">
                {labelRole(step.approverRoleCode)}
                {step.condition && <> · only when {step.condition}</>}
                {step.status === 'done' && <> · approved</>}
                {step.status === 'upcoming' && <> · waiting</>}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-caption text-neutral-400">Route from the active workflow definition.</p>
    </section>
  );
}
