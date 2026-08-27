import { useState } from 'react';
import { Button } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { useWarehouses, useCreateMaterialIssue } from '../model/inventory.api';
import { IssueHeaderFields } from './issue-header-fields';
import { IssueLineEditor, type IssueLine } from './issue-line-editor';

const EMPTY_LINE: IssueLine = { description: '', quantity: 0, unit: 'EA', wbsItemId: '' };

export function IssueForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [reason, setReason] = useState('CONSTRUCTION');
  const [lines, setLines] = useState<IssueLine[]>([EMPTY_LINE]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const wbsTree = useWbsTree(projectId);
  const create = useCreateMaterialIssue();

  const wbsOptions = (wbsTree.data ?? []).flatMap((node) => [
    { id: node.id, label: node.code },
    ...(node.children ?? []).map((c) => ({ id: c.id, label: `${node.code}.${c.code}` })),
  ]);

  const updateLine = (index: number, patch: Partial<IssueLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !warehouseId || !issuedTo) return;
    const items = lines
      .filter((l) => l.description && l.quantity > 0)
      .map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        wbsItemId: l.wbsItemId || undefined,
      }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, warehouseId, issuedTo, issueReason: reason, remark: undefined, items },
      {
        onSuccess: () => {
          setIssuedTo('');
          setLines([EMPTY_LINE]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <IssueHeaderFields
        projectId={projectId}
        onProjectChange={setProjectId}
        warehouseId={warehouseId}
        onWarehouseChange={setWarehouseId}
        issuedTo={issuedTo}
        onIssuedToChange={setIssuedTo}
        reason={reason}
        onReasonChange={setReason}
        projects={projects.data?.items ?? []}
        warehouses={warehouses.data?.items ?? []}
      />

      <IssueLineEditor
        lines={lines}
        wbsOptions={wbsOptions}
        onChange={updateLine}
        onAdd={() => setLines((prev) => [...prev, EMPTY_LINE])}
        onRemove={(index) => setLines((prev) => prev.filter((_, i) => i !== index))}
      />

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Issue Material</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal issue. Stok tidak boleh melebihi available.</p>}
    </div>
  );
}
