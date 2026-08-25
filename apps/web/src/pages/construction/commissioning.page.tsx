import { useState } from 'react';
import { Badge, Button, Input, Label } from '@aec/ui';
import { useProjects } from '@/entities/project';
import { useCommissioningTree, useCreateCommissioning, useUpdateCommissioningStatus, type CommissioningSystem } from '@/features/construction';

const levelVariant: Record<string, 'default' | 'warning' | 'success' | 'outline'> = {
  PLANT: 'default',
  SYSTEM: 'warning',
  SUBSYSTEM: 'success',
  EQUIPMENT: 'outline',
};

const statusVariant: Record<string, 'default' | 'warning' | 'success'> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
};

const statusLabel: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
};

function TreeRow({ node, depth, projectId }: { node: CommissioningSystem; depth: number; projectId: string }) {
  const updateStatus = useUpdateCommissioningStatus(projectId);
  const [showChildren, setShowChildren] = useState(true);

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-100 px-3 py-2 hover:bg-neutral-50"
        style={{ marginLeft: depth * 24 }}
      >
        {node.children && node.children.length > 0 && (
          <button type="button" className="text-caption text-neutral-500 hover:text-neutral-800" onClick={() => setShowChildren(!showChildren)}>
            {showChildren ? '▾' : '▸'}
          </button>
        )}
        <Badge variant={levelVariant[node.level] ?? 'default'}>{node.level}</Badge>
        <span className="font-mono text-sm text-neutral-600">{node.code}</span>
        <span className="text-body-sm text-neutral-800">{node.name}</span>
        <Badge variant={statusVariant[node.status] ?? 'default'}>{statusLabel[node.status] ?? node.status}</Badge>
        <div className="ml-auto flex gap-1">
          {node.status !== 'COMPLETED' && (
            <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: node.id, status: node.status === 'NOT_STARTED' ? 'IN_PROGRESS' : 'COMPLETED' })}>
              {node.status === 'NOT_STARTED' ? 'Mulai' : 'Selesai'}
            </Button>
          )}
        </div>
      </div>
      {showChildren && node.children?.map((c) => (
        <TreeRow key={c.id} node={c} depth={depth + 1} projectId={projectId} />
      ))}
    </div>
  );
}

export function CommissioningPage() {
  const [projectId, setProjectId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data: projects } = useProjects({ page: 1, pageSize: 100 });
  const { data: tree, isLoading, isError, refetch } = useCommissioningTree(projectId);
  const create = useCreateCommissioning(projectId);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'PLANT' | 'SYSTEM' | 'SUBSYSTEM' | 'EQUIPMENT'>('SYSTEM');
  const [parentId, setParentId] = useState('');
  const [remark, setRemark] = useState('');

  const flatten = (nodes: CommissioningSystem[], depth = 0): { id: string; label: string }[] =>
    nodes.flatMap((n) => [{ id: n.id, label: `${'—'.repeat(depth)} ${n.code} ${n.name}` }, ...flatten(n.children ?? [], depth + 1)]);

  const submit = () => {
    if (!code || !name) return;
    create.mutate(
      { code, name, level, parentId: parentId || undefined, remark: remark || undefined },
      { onSuccess: () => { setShowForm(false); setCode(''); setName(''); setParentId(''); setRemark(''); } },
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Commissioning</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Hierarki Plant → System → Subsystem → Equipment (FR-CON-005)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setShowForm(false); }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-body-sm"
          >
            <option value="">Pilih Project…</option>
            {projects?.items.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
          {projectId && <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>+ Node</Button>}
        </div>
      </div>

      {showForm && projectId && (
        <div className="mb-6 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Kode</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PLANT-01" />
            </div>
            <div>
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Process Plant" />
            </div>
            <div>
              <Label>Level</Label>
              <select value={level} onChange={(e) => setLevel(e.target.value as never)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm">
                <option value="PLANT">Plant</option>
                <option value="SYSTEM">System</option>
                <option value="SUBSYSTEM">Subsystem</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>
            <div>
              <Label>Parent</Label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm">
                <option value="">Root</option>
                {tree && flatten(tree).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button size="sm" onClick={submit} disabled={create.isPending || !code || !name}>{create.isPending ? 'Menyimpan…' : 'Tambah'}</Button>
          </div>
        </div>
      )}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat commissioning tree.</p>}
      {projectId && isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {projectId && isError && (
        <div className="flex items-center gap-2">
          <p className="text-body-sm text-destructive-600">Gagal memuat.</p>
          <Button size="sm" variant="secondary" onClick={() => { void refetch(); }}>Retry</Button>
        </div>
      )}
      {projectId && tree && (
        <div className="space-y-1">
          {tree.length === 0 && <p className="text-body-sm text-neutral-500">Belum ada node commissioning.</p>}
          {tree.map((n) => <TreeRow key={n.id} node={n} depth={0} projectId={projectId} />)}
        </div>
      )}
    </div>
  );
}
