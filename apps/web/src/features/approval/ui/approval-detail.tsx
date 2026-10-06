import { Badge, BulletBar, Button, EmptyCell, Skeleton, StatusBadge, labelRole } from '@aec/ui';
import { FileText } from 'lucide-react';
import type { ApprovalDetail as ApprovalDetailData } from '@aec/api-contracts';
import { DecisionHistory } from './decision-history';
import { BudgetImpact } from './budget-impact';
import { ApprovalChain } from './approval-chain';
import { ProjectContext } from './project-context';
import { VendorCard } from './vendor-card';
import { RelatedDocuments } from './related-documents';
import { formatDateTime, formatIdrCustom, formatNumber } from '@/shared/lib/format';

const TYPE_LABEL: Record<string, string> = { PurchaseRequisition: 'Purchase Requisition', PurchaseOrder: 'Purchase Order' };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-overline uppercase text-neutral-500">{label}</dt>
      <dd className="text-body text-neutral-900">{children}</dd>
    </div>
  );
}

/** Item mana yang menghabiskan biaya — bar proporsi, bukan hiasan. */
function ItemTable({ items, currency }: { items: ApprovalDetailData['document']['items']; currency: string | null }) {
  if (items.length === 0) {
    return <p className="text-body-sm text-neutral-500">No line items on this document.</p>;
  }
  const maxTotal = Math.max(...items.map((i) => i.totalPrice ?? 0), 0);
  return (
    <table className="w-full border-collapse text-left text-body-sm">
      <caption className="sr-only">Line items</caption>
      <thead>
        <tr className="border-b border-neutral-200 text-caption uppercase text-neutral-500">
          <th scope="col" className="py-2 font-medium">Description</th>
          <th scope="col" className="py-2 font-medium">WBS</th>
          <th scope="col" className="py-2 text-right font-medium">Qty</th>
          <th scope="col" className="py-2 font-medium">Unit</th>
          <th scope="col" className="py-2 text-right font-medium">Unit price</th>
          <th scope="col" className="py-2 text-right font-medium">Total</th>
          <th scope="col" className="w-24 py-2 font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-b border-neutral-100 last:border-0">
            <td className="py-2 text-neutral-800">{item.description}</td>
            <td className="py-2 font-mono text-caption text-neutral-500">{item.wbsCode ?? <EmptyCell label="No WBS" />}</td>
            <td className="py-2 text-right font-mono tabular-nums text-neutral-700">{formatNumber(item.quantity)}</td>
            <td className="py-2 text-neutral-600">{item.unit}</td>
            <td className="py-2 text-right font-mono tabular-nums text-neutral-700">
              {item.unitPrice != null ? formatIdrCustom(item.unitPrice, currency ?? 'IDR') : <EmptyCell label="No unit price" />}
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-neutral-900">
              {item.totalPrice != null ? formatIdrCustom(item.totalPrice, currency ?? 'IDR') : <EmptyCell label="No total" />}
            </td>
            <td className="py-2">
              {item.totalPrice != null && maxTotal > 0 ? (
                <BulletBar value={item.totalPrice} max={maxTotal} label={`${item.description} share of cost`} tone="neutral" className="h-1.5" />
              ) : (
                <EmptyCell label="No share" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export interface ApprovalDetailProps {
  data: ApprovalDetailData | undefined;
  isLoading: boolean;
  isError: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRetry: () => void;
}

export function ApprovalDetail({ data, isLoading, isError, canApprove, onApprove, onReject, onRetry }: ApprovalDetailProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6" aria-label="Loading details">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-body text-neutral-700">Could not load this task.</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const { task, document: doc, history, budget, chain, project, vendor, related } = data;
  const decided = task.status !== 'PENDING';

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-neutral-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-h2 text-neutral-950">{doc.code ?? task.transactionId}</h2>
          <Badge variant="default">{TYPE_LABEL[doc.type] ?? doc.type}</Badge>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-1 text-body-sm text-neutral-500">
          {chain ? `Step ${task.stepOrder ?? 1} of ${chain.length} · ${task.stepName} · ` : ''}
          Approver role: {labelRole(task.approverRoleCode)}
          {doc.requesterName ? ` · Requested by ${doc.requesterName}` : ''} · {formatDateTime(task.createdAt)}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {budget && <BudgetImpact budget={budget} amount={doc.amount} />}

        <dl className="grid grid-cols-2 gap-x-8 border-b border-neutral-200 px-6 py-2">
          <Fact label="Amount">{doc.amount != null ? formatIdrCustom(doc.amount, doc.currency ?? 'IDR') : <EmptyCell label="No amount" />}</Fact>
          <Fact label="Project">
            {doc.projectCode ? `${doc.projectCode}${doc.projectName ? ` · ${doc.projectName}` : ''}` : <EmptyCell label="No project" />}
          </Fact>
          <Fact label="Vendor">{doc.vendor ?? <EmptyCell label="Not applicable" />}</Fact>
          <Fact label="Type">{TYPE_LABEL[doc.type] ?? doc.type}</Fact>
        </dl>

        {doc.description && <p className="border-b border-neutral-200 px-6 py-3 text-body-sm text-neutral-600">{doc.description}</p>}

        <section className="border-b border-neutral-200 px-6 py-4">
          <h3 className="mb-2 text-h3 text-neutral-800">Items ({doc.items.length})</h3>
          <div className="overflow-x-auto">
            <ItemTable items={doc.items} currency={doc.currency} />
          </div>
        </section>

        {project && <ProjectContext project={project} />}
        {chain && <ApprovalChain chain={chain} currentStep={task.stepOrder} />}
        {vendor && <VendorCard vendor={vendor} />}
        <RelatedDocuments related={related} />

        <section className="px-6 py-4">
          <h3 className="mb-2 text-h3 text-neutral-800">History</h3>
          <DecisionHistory history={history} />
        </section>
      </div>

      <footer className="border-t border-neutral-200 px-6 py-3">
        {decided ? (
          <p className="text-body-sm text-neutral-500">
            This request was already {task.status.toLowerCase()}. No further action is needed.
          </p>
        ) : canApprove ? (
          <div className="flex gap-2">
            <Button onClick={onApprove}>Approve</Button>
            <Button variant="destructive" onClick={onReject}>
              Reject
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-body-sm text-neutral-500">
            <FileText className="h-4 w-4" aria-hidden="true" />
            You can view this request but not decide it (you are the requester or lack the approver role).
          </p>
        )}
      </footer>
    </div>
  );
}
