import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateRfq } from '../model/procurement.api';

type RfqLine = { description: string; quantity: number; unit: string };

export function RfqForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<RfqLine[]>([]);
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateRfq();

  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: 1, unit: 'EA' }]);
  const updateLine = (index: number, patch: Partial<RfqLine>) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = () => {
    if (!projectId || !title) return;
    const items = lines.filter((l) => l.description && l.quantity > 0);
    if (items.length === 0) return;
    create.mutate(
      { projectId, title, dueDate: dueDate || undefined, items },
      { onSuccess: () => { setTitle(''); setDueDate(''); setLines([]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rfq-project">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="rfq-project">
              <SelectValue placeholder="Pilih project…" />
            </SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rfq-title">Judul</Label>
          <Input id="rfq-title" placeholder="Pengadaan material…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <Input value={line.description} placeholder="mis. Baja Profil" onChange={(e) => updateLine(index, { description: e.target.value })} className="h-8 w-full" />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min={0.01} value={line.quantity || ''} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="h-8 w-24 text-right" />
                </td>
                <td className="px-3 py-2">
                  <Input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="h-8 w-20" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length === 0 && <p className="p-3 text-caption text-neutral-500">Belum ada item RFQ.</p>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <Label htmlFor="rfq-due">Batas Penawaran (opsional)</Label>
          <input
            id="rfq-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addLine}>+ Tambah Item</Button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="button" onClick={onSubmit} loading={create.isPending}>Buat RFQ DRAFT</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal membuat RFQ.</p>}
    </div>
  );
}