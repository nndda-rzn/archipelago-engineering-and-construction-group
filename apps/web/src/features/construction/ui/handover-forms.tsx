import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useCreateHandover, useSubmitHandover, useVerifyHandoverItem, useApproveHandover } from '../model/work-package.api';
import { statusLabel } from './handover-grid';
export function HandoverForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const create = useCreateHandover(projectId);
  const [title, setTitle] = useState('');
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [checklist, setChecklist] = useState('');
  const [docNames, setDocNames] = useState<string[]>(['As-Built Drawing', 'Test Certificate']);
  const submit = () => {
    if (!title.trim()) return;
    create.mutate({ title, handoverDate, checklist: checklist || undefined, items: docNames.map((documentName) => ({ documentName })) }, { onSuccess: () => { setTitle(''); setDocNames(['As-Built Drawing', 'Test Certificate']); onDone(); } });
  };
  return (
    <div className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Handover Area A" /></div>
        <div><Label>Tanggal</Label><Input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} /></div>
        <div><Label>Checklist</Label><Input value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder="Opsional" /></div>
      </div>
      <div className="space-y-2"><Label>Dokumen</Label>{docNames.map((doc, i) => <div key={i} className="flex gap-2"><Input value={doc} onChange={(e) => setDocNames(docNames.map((x, idx) => idx === i ? e.target.value : x))} /><Button size="sm" variant="secondary" onClick={() => setDocNames(docNames.filter((_, idx) => idx !== i))}>Hapus</Button></div>)}<Button size="sm" variant="secondary" onClick={() => setDocNames([...docNames, ''])}>+ Dokumen</Button></div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={onDone}>Batal</Button><Button size="sm" onClick={submit} disabled={create.isPending || !title.trim()}>{create.isPending ? 'Menyimpan...' : 'Buat Handover'}</Button></div>
    </div>
  );
}

export function HandoverDetail({ selected, projectId }: { selected: { id: string; title: string; hoNumber: string; status: string; items: Array<{ id: string; documentName: string; isMandatory: boolean; status: string }> }; projectId: string }) {
  const submit = useSubmitHandover(projectId);
  const verify = useVerifyHandoverItem(projectId);
  const approve = useApproveHandover(projectId);
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between"><div><h2 className="text-h3 text-neutral-800">{selected.title}</h2><p className="font-mono text-caption text-neutral-500">{selected.hoNumber} · {statusLabel[selected.status] ?? selected.status}</p></div><div className="flex gap-2">{selected.status === 'DRAFT' && <Button size="sm" onClick={() => submit.mutate(selected.id)} disabled={submit.isPending}>Submit</Button>}{selected.status === 'SUBMITTED' && <Button size="sm" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending || selected.items.some((i) => i.status !== 'VERIFIED')}>Approve</Button>}</div></div>
      <div className="mt-4 space-y-2">{selected.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2"><div><span className="text-body-sm text-neutral-800">{item.documentName}</span>{item.isMandatory && <Badge variant="warning" className="ml-2">Mandatory</Badge>}<Badge variant={item.status === 'VERIFIED' ? 'success' : 'default'} className="ml-2">{item.status}</Badge></div>{item.status !== 'VERIFIED' && <Button size="sm" variant="secondary" onClick={() => verify.mutate({ id: selected.id, itemId: item.id })} disabled={verify.isPending}>Verifikasi</Button>}</div>)}</div>
      {approve.isError && <p className="mt-2 text-body-sm text-destructive-600">Semua dokumen harus VERIFIED sebelum approve.</p>}
    </div>
  );
}

