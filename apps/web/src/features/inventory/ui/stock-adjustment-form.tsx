import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWarehouses } from '../model/warehouse.api';
import { useCreateStockAdjustment } from '../model/stock-adjustment.api';

type AdjLine = { description: string; quantity: number; unit: string };

export function AdjustmentForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reasonCode, setReasonCode] = useState('LOSS');
  const [lines, setLines] = useState<AdjLine[]>([{ description: '', quantity: 0, unit: 'EA' }]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateStockAdjustment();

  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));

  const updateLine = (index: number, patch: Partial<AdjLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !warehouseId) return;
    const items = lines
      .filter((l) => l.description && l.quantity !== 0)
      .map((l) => ({ description: l.description, quantity: l.quantity, unit: l.unit }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, warehouseId, reasonCode, items },
      { onSuccess: () => { setLines([{ description: '', quantity: 0, unit: 'EA' }]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="adj-project">Project</Label>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setWarehouseId(''); }}>
            <SelectTrigger id="adj-project">
              <SelectValue placeholder="Pilih project…" />
            </SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="adj-wh">Warehouse</Label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger id="adj-wh">
              <SelectValue placeholder="Pilih…" />
            </SelectTrigger>
            <SelectContent>
              {projectWhs.map((w) => <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="adj-reason">Alasan</Label>
          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger id="adj-reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOSS">LOSS</SelectItem>
              <SelectItem value="DAMAGE">DAMAGE</SelectItem>
              <SelectItem value="SURPLUS">SURPLUS</SelectItem>
              <SelectItem value="REVALUATION">REVALUATION</SelectItem>
              <SelectItem value="OTHERS">OTHERS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Delta Qty (+/-)</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2"><Input placeholder="Deskripsi" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" /></td>
                <td className="px-3 py-2"><Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" /></td>
                <td className="px-3 py-2"><Input type="number" step={1} placeholder="0" value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="h-8 w-28" /></td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} disabled={lines.length === 1}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', quantity: 0, unit: 'EA' }])}>+ Tambah Baris</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal buat adjustment.</p>}
    </div>
  );
}
