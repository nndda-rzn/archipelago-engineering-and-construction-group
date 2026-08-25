import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { useWarehouses, useCreateMaterialIssue } from './inventory.api';

type IssueLine = { description: string; quantity: number; unit: string; wbsItemId: string };

export function IssueForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [issuedTo, setIssuedTo] = useState('');
  const [reason, setReason] = useState('CONSTRUCTION');
  const [lines, setLines] = useState<IssueLine[]>([{ description: '', quantity: 0, unit: 'EA', wbsItemId: '' }]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const wbsTree = useWbsTree(projectId);
  const create = useCreateMaterialIssue();

  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));

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
          setLines([{ description: '', quantity: 0, unit: 'EA', wbsItemId: '' }]);
          onDone();
        },
      },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mi-project">Project</Label>
          <select
            id="mi-project"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setWarehouseId(''); }}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih project…</option>
            {(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="mi-wh">Warehouse</Label>
          <select
            id="mi-wh"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          >
            <option value="">Pilih warehouse…</option>
            {projectWhs.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="mi-to">Issue ke</Label>
          <Input id="mi-to" placeholder="Tim Konstruksi" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="mi-reason">Alasan</Label>
          <select id="mi-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20">
            <option value="CONSTRUCTION">CONSTRUCTION</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="CONSUMPTION">CONSUMPTION</option>
            <option value="OTHERS">OTHERS</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">WBS</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Qty Keluar</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Input placeholder="Contoh: Semen 50kg" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={line.wbsItemId}
                    onChange={(e) => updateLine(index, { wbsItemId: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-body hover:border-neutral-300"
                  >
                    <option value="">WBS (opsional)…</option>
                    {wbsOptions.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    className="h-8 w-28"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    disabled={lines.length === 1}
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', quantity: 0, unit: 'EA', wbsItemId: '' }])}>
          + Tambah Baris
        </Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Issue Material</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal issue. Stok tidak boleh melebihi available.</p>}
    </div>
  );
}