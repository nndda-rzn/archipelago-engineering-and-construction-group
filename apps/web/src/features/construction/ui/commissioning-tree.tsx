import { useState } from 'react';
import { Badge, Button, ConfirmActionButton, type BadgeVariant } from '@aec/ui';
import { useUpdateCommissioningStatus } from '../model/work-package.api';
import type { CommissioningSystem } from '@aec/api-contracts';

type CommissioningLevel = CommissioningSystem['level'];
type CommissioningStatus = CommissioningSystem['status'];

export const commissioningLevelVariant: Record<CommissioningLevel, BadgeVariant> = {
  PLANT: 'default', SYSTEM: 'warning', SUBSYSTEM: 'success', EQUIPMENT: 'outline',
};
export const commissioningStatusVariant: Record<CommissioningStatus, BadgeVariant> = {
  NOT_STARTED: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success',
};
const statusLabel: Record<CommissioningStatus, string> = { NOT_STARTED: 'Belum Mulai', IN_PROGRESS: 'Berjalan', COMPLETED: 'Selesai' };

function TreeRow({ node, depth, projectId }: { node: CommissioningSystem; depth: number; projectId: string }) {
  const updateStatus = useUpdateCommissioningStatus(projectId);
  const [showChildren, setShowChildren] = useState(true);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-100 px-3 py-2 hover:bg-neutral-50" style={{ marginLeft: depth * 24 }}>
        {node.children && node.children.length > 0 && <button type="button" className="text-caption text-neutral-500 hover:text-neutral-800" onClick={() => setShowChildren(!showChildren)}>{showChildren ? '▾' : '▸'}</button>}
        <Badge variant={commissioningLevelVariant[node.level]}>{node.level}</Badge>
        <span className="font-mono text-sm text-neutral-600">{node.code}</span>
        <span className="text-body-sm text-neutral-800">{node.name}</span>
        <Badge variant={commissioningStatusVariant[node.status]}>{statusLabel[node.status]}</Badge>
        <div className="ml-auto flex gap-1">
          {node.status === 'NOT_STARTED' && <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: node.id, status: 'IN_PROGRESS' })}>Mulai</Button>}
          {node.status === 'IN_PROGRESS' && <ConfirmActionButton size="sm" variant="secondary" confirmTitle="Tandai selesai?" confirmDescription="Status commissioning akan berubah menjadi selesai." confirmLabel="Selesai" onConfirm={() => updateStatus.mutate({ id: node.id, status: 'COMPLETED' })}>Selesai</ConfirmActionButton>}
        </div>
      </div>
      {showChildren && node.children?.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} projectId={projectId} />)}
    </div>
  );
}

export function CommissioningTree({ tree, projectId }: { tree: CommissioningSystem[]; projectId: string }) {
  return <div className="space-y-1">{tree.length === 0 && <p className="text-body-sm text-neutral-500">Belum ada node commissioning.</p>}{tree.map((n) => <TreeRow key={n.id} node={n} depth={0} projectId={projectId} />)}</div>;
}
