import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCreateCollection } from '../model/collection.api';
import { useClientInvoices } from '../model/client-invoice.api';

type ColLine = { clientInvoiceId: string; amount: number };

export function CollectionForm({ onDone }: { onDone: () => void }) {
  const [projectId, setProjectId] = useState('');
  const [client, setClient] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<ColLine[]>([]);

  const projects = useProjects({ page: 1, pageSize: 100 });
  const invoices = useClientInvoices({ page: 1, pageSize: 100 });
  const postedInvoices = (invoices.data?.items ?? []).filter((inv) => inv.status === 'POSTED');
  const create = useCreateCollection();

  const addLine = (clientInvoiceId: string) => {
    const invoice = postedInvoices.find((inv) => inv.id === clientInvoiceId);
    setLines((prev) => [...prev, { clientInvoiceId, amount: Number(invoice?.totalAmount ?? 0) }]);
  };

  const updateLine = (index: number, patch: Partial<ColLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onSubmit = () => {
    if (!projectId || !client) return;
    const items = lines.filter((l) => l.amount > 0).map((l) => ({ clientInvoiceId: l.clientInvoiceId, amount: l.amount }));
    if (items.length === 0) return;
    create.mutate(
      { projectId, client, reference: reference || undefined, items },
      { onSuccess: () => { setClient(''); setReference(''); setLines([]); onDone(); } },
    );
  };

  return (
    <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="col-project">Project</Label>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setLines([]); }}>
            <SelectTrigger id="col-project"><SelectValue placeholder="Pilih project…" /></SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="col-client">Klien</Label><Input id="col-client" placeholder="PT Klien Utama" value={client} onChange={(e) => setClient(e.target.value)} /></div>
        <div><Label htmlFor="col-ref">Referensi (opsional)</Label><Input id="col-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-body">
          <thead className="bg-neutral-50 text-caption uppercase tracking-wide text-neutral-500">
            <tr><th className="px-3 py-2">Client Invoice POSTED</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Diterima</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {postedInvoices.map((inv) => {
              const line = lines.find((l) => l.clientInvoiceId === inv.id);
              return (
                <tr key={inv.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono text-neutral-700">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{inv.totalAmount}</td>
                  <td className="px-3 py-2">
                    {line ? <Input type="number" min={0} step={100000} value={line.amount || ''} onChange={(e) => updateLine(lines.indexOf(line), { amount: Number(e.target.value) })} className="h-8 w-32 text-right" /> : <span className="text-caption text-neutral-400">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {line ? <Button type="button" variant="ghost" size="sm" onClick={() => setLines((prev) => prev.filter((_, i) => i !== lines.indexOf(line)))}>Batal</Button> : <Button type="button" variant="secondary" size="sm" onClick={() => addLine(inv.id)}>+ Pilih</Button>}
                  </td>
                </tr>
              );
            })}
            {postedInvoices.length === 0 && <tr><td colSpan={4} className="p-3 text-caption text-neutral-500">Tidak ada client invoice POSTED.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Batal</Button><Button type="button" onClick={onSubmit} loading={create.isPending}>Buat Collection DRAFT</Button></div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal. Jumlah tidak boleh melebihi sisa piutang.</p>}
    </div>
  );
}
