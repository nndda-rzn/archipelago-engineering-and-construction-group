import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@aec/ui';
import { labelResource } from '@aec/ui';
import type { ApprovalDetail } from '@aec/api-contracts';

/**
 * Dokumen terkait dari relasi nyata. Ini hanya TAUTAN — sistem belum menghitung
 * 3-way match (PO/GR/invoice), jadi status invoice tidak diklaim "matched".
 */
export function RelatedDocuments({ related }: { related: ApprovalDetail['related'] }) {
  if (related.length === 0) return null;
  return (
    <section className="border-b border-neutral-200 px-6 py-4" aria-label="Related documents">
      <h3 className="mb-2 text-h3 text-neutral-800">Related documents</h3>
      <ul className="space-y-1.5">
        {related.map((doc) => (
          <li key={`${doc.type}-${doc.code}`} className="flex items-center gap-2 text-body-sm">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="font-mono text-neutral-800">{doc.code}</span>
            <span className="text-neutral-500">{labelResource(doc.type)}</span>
            <StatusBadge status={doc.status} size={11} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-neutral-400">Links only; invoice matching is not evaluated here.</p>
    </section>
  );
}
