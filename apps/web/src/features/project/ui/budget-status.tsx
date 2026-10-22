import { Badge, ConfirmActionButton } from '@aec/ui';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import type { BudgetSummary } from '@aec/api-contracts';
import { formatIdrCustom } from '@/shared/lib/format';

export function BudgetStatusBadge({ published, publishPending, onPublish }: { published: boolean; publishPending: boolean; onPublish: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant={published ? 'success' : 'default'}>
        {published ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
        {published ? 'PUBLISHED' : 'DRAFT'}
      </Badge>
      {!published && (
        <ConfirmActionButton
          size="sm"
          confirmTitle="Publish baseline"
          confirmDescription="Setelah publish tidak bisa diedit."
          confirmLabel="Publish"
          onConfirm={onPublish}
          loading={publishPending}
        >
          Publish Baseline
        </ConfirmActionButton>
      )}
    </div>
  );
}

export function BudgetTotalBar({ total, currency }: { total: number; currency: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2">
      <span className="text-caption font-medium uppercase text-neutral-500">WBS</span>
      <span className="text-caption font-medium uppercase text-neutral-500">
        Total: <span className="font-mono tabular-nums text-neutral-900">{formatIdrCustom(total, currency)}</span>
      </span>
    </div>
  );
}

/**
 * Peringatan kewajaran budget.
 *
 * Ditampilkan sebagai baris di atas pohon, bukan modal: ini konteks yang perlu
 * terbaca sambil bekerja, bukan sesuatu yang harus ditutup dulu. `pvMismatch`
 * dilaporkan apa adanya — baseline PV yang tidak seimbang dengan BAC adalah
 * masalah data nyata, dan menyembunyikannya membuat SPI terlihat bisa dipercaya
 * padahal tidak.
 */
export function BudgetWarnings({ warnings }: { warnings: BudgetSummary['warnings'] }) {
  const lines: string[] = [];
  if (warnings.overContract) lines.push('Total exceeds the contract value.');
  if (warnings.noBudget.length > 0) {
    lines.push(`${warnings.noBudget.length} node${warnings.noBudget.length === 1 ? '' : 's'} without budget: ${warnings.noBudget.map((n) => n.code).join(', ')}`);
  }
  if (warnings.overAllocated.length > 0) {
    lines.push(`${warnings.overAllocated.length} node${warnings.overAllocated.length === 1 ? '' : 's'} spent above budget: ${warnings.overAllocated.map((n) => n.code).join(', ')}`);
  }
  if (warnings.pvMismatch) {
    lines.push(`Baseline PV is ${Math.round(warnings.pvMismatch.ratio * 100)}% of the published budget — schedule indices derived from it are unreliable.`);
  }

  if (lines.length === 0) return null;

  return (
    <ul aria-label="Budget warnings" className="flex flex-col gap-1 rounded-md border border-warning-200 bg-warning-50 px-3 py-2">
      {lines.map((line) => (
        <li key={line} className="flex items-start gap-1.5 text-caption text-warning-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
