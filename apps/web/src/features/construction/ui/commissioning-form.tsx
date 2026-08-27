import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateCommissioning } from '../model/work-package.api';
import type { CommissioningSystem } from '@aec/api-contracts';

const flatten = (nodes: CommissioningSystem[], depth = 0): { id: string; label: string }[] =>
  nodes.flatMap((n) => [{ id: n.id, label: `${'-'.repeat(depth)} ${n.code} ${n.name}` }, ...flatten(n.children ?? [], depth + 1)]);

export function CommissioningForm({ projectId, tree, onDone }: { projectId: string; tree: CommissioningSystem[]; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'PLANT' | 'SYSTEM' | 'SUBSYSTEM' | 'EQUIPMENT'>('SYSTEM');
  const [parentId, setParentId] = useState('');
  const [remark, setRemark] = useState('');
  const create = useCreateCommissioning(projectId);

  const submit = () => {
    if (!code || !name) return;
    create.mutate({ code, name, level, parentId: parentId || undefined, remark: remark || undefined }, { onSuccess: () => { setCode(''); setName(''); setParentId(''); setRemark(''); onDone(); } });
  };

  return (
    <div className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div><Label>Kode</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PLANT-01" /></div>
        <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Process Plant" /></div>
        <div>
          <Label>Level</Label>
          <select value={level} onChange={(e) => setLevel(e.target.value as never)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm"><option value="PLANT">Plant</option><option value="SYSTEM">System</option><option value="SUBSYSTEM">Subsystem</option><option value="EQUIPMENT">Equipment</option></select>
        </div>
        <div>
          <Label>Parent</Label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm"><option value="">Root</option>{flatten(tree).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select>
        </div>
        <div><Label>Catatan</Label><Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Opsional" /></div>
      </div>
      <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={onDone}>Batal</Button><Button size="sm" onClick={submit} disabled={create.isPending || !code || !name}>{create.isPending ? 'Menyimpan...' : 'Tambah'}</Button></div>
    </div>
  );
}
