import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useCreatePr } from '../model/procurement.api';
import { useProjects } from '@/entities/project';
import { useWbsTree } from '@/entities/wbs';
import { useUnsavedGuard } from '@/shared/lib/unsaved-guard';

type FormItem = { description: string; quantity: string; unit: string; estimatedUnitPrice: string };

export function PurchaseRequisitionForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [wbsItemId, setWbsItemId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState<FormItem[]>([{ description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }]);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const { data: wbsTree } = useWbsTree(projectId);
  const create = useCreatePr();
  useUnsavedGuard(projectId !== '' || requestedBy !== '' || items.some((i) => i.description.trim() !== ''));

  const flattenWbs = (nodes: { id: string; code: string; name: string; children: unknown[] }[]): { id: string; code: string; name: string }[] => nodes.flatMap((n) => [{ id: n.id, code: n.code, name: n.name }, ...flattenWbs(n.children as never)]);
  const updateItem = (idx: number, field: keyof FormItem, value: string) => setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const onSubmit = () => {
    const validItems = items.filter((i) => i.description.trim()).map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity) || 1, unit: i.unit || 'EA', estimatedUnitPrice: i.estimatedUnitPrice ? Number(i.estimatedUnitPrice) : undefined }));
    if (!projectId || !requestedBy || validItems.length === 0) return;
    create.mutate({ projectId, wbsItemId: wbsItemId || undefined, requestedBy, items: validItems }, { onSuccess: () => { setItems([{ description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }]); setRequestedBy(''); onDone(); } });
  };
  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-3 gap-4">
        <div><Label htmlFor="pr-project">Project</Label><select id="pr-project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setWbsItemId(''); }} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body"><option value="">Pilih project...</option>{(projects.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select></div>
        <div><Label htmlFor="pr-wbs">WBS (opsional)</Label><select id="pr-wbs" value={wbsItemId} onChange={(e) => setWbsItemId(e.target.value)} className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body" disabled={!projectId}><option value="">-</option>{flattenWbs(wbsTree ?? []).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}</select></div>
        <div><Label htmlFor="pr-requested">Diminta Oleh</Label><Input id="pr-requested" placeholder="Nama pemohon" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} /></div>
      </div>
      <div className="mt-4"><div className="mb-2 text-body-sm font-medium text-neutral-700">Item</div>{items.map((item, idx) => <div key={idx} className="mb-2 grid grid-cols-12 gap-2"><Input className="col-span-5" placeholder="Deskripsi item" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} /><Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /><Input className="col-span-2" placeholder="Unit" value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} /><Input className="col-span-2" type="number" placeholder="Est. harga" value={item.estimatedUnitPrice} onChange={(e) => updateItem(idx, 'estimatedUnitPrice', e.target.value)} /><Button className="col-span-1" variant="ghost" size="icon" aria-label="Hapus item" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div>)}<Button type="button" variant="secondary" size="sm" onClick={() => setItems((p) => [...p, { description: '', quantity: '1', unit: 'EA', estimatedUnitPrice: '' }])}><Plus className="h-4 w-4" aria-hidden="true" /> Tambah Item</Button></div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Simpan PR</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat PR.</p>}
    </div>
  );
}
