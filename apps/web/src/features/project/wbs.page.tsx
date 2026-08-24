import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWbsItemSchema, type WbsItem } from '@aec/api-contracts';
import { z } from 'zod';
import { ChevronRight, FolderTree } from 'lucide-react';
import { Button, Input, Label } from '@aec/ui';
import { useCreateWbsItem, useWbsTree } from './wbs.api';
import { useProjects } from './project.api';

const PAGE_SIZE = 100;

const formSchema = z.object({
  code: createWbsItemSchema.shape.code,
  name: createWbsItemSchema.shape.name,
});

function WbsRow({ item, depth, onAddChild }: { item: WbsItem; depth: number; onAddChild: (item: WbsItem) => void }) {
  return (
    <>
      <div
        className="flex items-center gap-2 border-b border-neutral-100 py-2 hover:bg-neutral-50"
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
        <span className="font-mono text-body-sm text-neutral-700">{item.code}</span>
        <span className="text-body-sm text-neutral-900">{item.name}</span>
        <button
          type="button"
          className="ml-auto rounded px-2 py-0.5 text-caption text-racing-red-600 hover:bg-racing-red-50"
          onClick={() => onAddChild(item)}
        >
          + Sub
        </button>
      </div>
      {item.children.map((child) => (
        <WbsRow key={child.id} item={child} depth={depth + 1} onAddChild={onAddChild} />
      ))}
    </>
  );
}

export function WbsPage() {
  const [projectId, setProjectId] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const projects = useProjects({ page: 1, pageSize: PAGE_SIZE });
  const { data: tree, isLoading, isError, refetch } = useWbsTree(projectId);
  const create = useCreateWbsItem(projectId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = handleSubmit((input) => {
    create.mutate(
      { ...input, parentId },
      {
        onSuccess: () => {
          reset();
          setParentId(undefined);
          setShowForm(false);
        },
      },
    );
  });

  const selectedProject = (projects.data?.items ?? []).find((p) => p.id === projectId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 text-neutral-950">Work Breakdown Structure</h1>
        <p className="mt-1 text-body-sm text-neutral-500">WBS hirarkis per project (FR-PRJ-002)</p>
      </div>

      <div className="mb-4 w-72">
        <Label htmlFor="project-select">Project</Label>
        <select
          id="project-select"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setShowForm(false);
          }}
          className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 hover:border-neutral-300 focus-visible:border-racing-red-400 focus-visible:ring-2 focus-visible:ring-racing-red-400/20"
        >
          <option value="">Pilih project…</option>
          {(projects.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
      </div>

      {showForm && projectId && (
        <form onSubmit={onSubmit} className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center gap-2 text-body-sm text-neutral-600">
            <FolderTree className="h-4 w-4" aria-hidden="true" />
            {selectedProject?.code}
            {parentId && tree && <span className="text-neutral-400">→ sub dari {findCode(tree, parentId) ?? '…'}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode WBS</Label>
              <Input id="code" placeholder="1.1" spellCheck={false} error={!!errors.code} {...register('code')} />
              {errors.code && <p className="mt-1 text-caption text-destructive-600">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Nama</Label>
              <Input id="name" placeholder="Detail Engineering" error={!!errors.name} {...register('name')} />
              {errors.name && <p className="mt-1 text-caption text-destructive-600">{errors.name.message}</p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button type="submit" loading={create.isPending}>Simpan</Button>
          </div>
          {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal menyimpan. Kode mungkin sudah ada.</p>}
        </form>
      )}

      {!projectId && <p className="text-body-sm text-neutral-500">Pilih project untuk melihat WBS.</p>}
      {isLoading && <p className="text-body-sm text-neutral-500">Memuat…</p>}
      {isError && (
        <p className="text-body-sm text-destructive-600">
          Gagal memuat WBS.{' '}
          <button type="button" className="text-racing-red-600 hover:underline" onClick={() => refetch()}>Coba lagi</button>
        </p>
      )}

      {tree && projectId && (
        <div>
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => { setParentId(undefined); setShowForm(true); }}>
              + Tambah Root
            </Button>
          </div>
          <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
            {tree.length === 0 ? (
              <p className="p-6 text-center text-body-sm text-neutral-500">Belum ada WBS. Tambah root pertama.</p>
            ) : (
              tree.map((item) => (
                <WbsRow
                  key={item.id}
                  item={item}
                  depth={0}
                  onAddChild={(parent) => { setParentId(parent.id); setShowForm(true); }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function findCode(nodes: WbsItem[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.code;
    const found = findCode(node.children, id);
    if (found) return found;
  }
  return undefined;
}
