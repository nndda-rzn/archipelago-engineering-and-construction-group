import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useWarehouses } from '../model/warehouse.api';
import { useCreateStockTransfer } from '../model/stock-transfer.api';

interface TransferLine { description: string; quantity: number; unit: string }

export function TransferForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([{ description: '', quantity: 0, unit: 'EA' }]);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const warehouses = useWarehouses({ page: 1, pageSize: 100 });
  const create = useCreateStockTransfer();
  const projectWhs = (warehouses.data?.items ?? []).filter((w) => w.projectId === projectId || (w.warehouseType === 'CORPORATE' && !w.projectId));
  const updateLine = (index: number, patch: Partial<TransferLine>) => setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
  const onSubmit = () => {
    if (!projectId || !fromWarehouseId || !toWarehouseId) return;
    const items = lines.filter((l) => l.description && l.quantity > 0).map((l) => ({ description: l.description, quantity: l.quantity, unit: l.unit }));
    if (!items.length) return;
    create.mutate({ projectId, fromWarehouseId, toWarehouseId, remark: undefined, items }, { onSuccess: () => { setLines([{ description: '', quantity: 0, unit: 'EA' }]); onDone(); } });
  };
  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div><Label htmlFor="st-project">Project</Label><Select value={projectId} onValueChange={(v) => { setProjectId(v); setFromWarehouseId(''); setToWarehouseId(''); }}><SelectTrigger id="st-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger><SelectContent>{(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="st-from">Dari Warehouse</Label><Select value={fromWarehouseId} onValueChange={setFromWarehouseId}><SelectTrigger id="st-from"><SelectValue placeholder="Pilih…" /></SelectTrigger><SelectContent>{projectWhs.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} - {w.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="st-to">Ke Warehouse</Label><Select value={toWarehouseId} onValueChange={setToWarehouseId}><SelectTrigger id="st-to"><SelectValue placeholder="Pilih…" /></SelectTrigger><SelectContent>{projectWhs.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} - {w.name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200"><table className="w-full text-left text-body"><thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500"><tr><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2"></th></tr></thead><tbody>{lines.map((line, index) => <tr key={index} className="border-t border-neutral-100"><td className="px-3 py-2"><Input placeholder="Deskripsi" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8" /></td><td className="px-3 py-2"><Input placeholder="EA" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" /></td><td className="px-3 py-2"><Input type="number" min={0} value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="h-8 w-28" /></td><td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} disabled={lines.length === 1}>Hapus</Button></td></tr>)}</tbody></table></div>
      <div className="mt-2"><Button type="button" variant="secondary" size="sm" onClick={() => setLines((prev) => [...prev, { description: '', quantity: 0, unit: 'EA' }])}>+ Tambah Baris</Button></div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Transfer</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal transfer. Stok asal tidak cukup.</p>}
    </div>
  );
}
