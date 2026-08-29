import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@aec/ui';
import { useCreateVendorRating } from '@/features/procurement';
import { useProjects } from '@/entities/project';
import { useVendors } from '@/features/master-data';

const CATEGORIES = ['DELIVERY', 'QUALITY', 'COMMERCIAL', 'HSE', 'RESPONSIVENESS'] as const;

export function VendorRatingForm() {
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [score, setScore] = useState('');
  const [remark, setRemark] = useState('');

  const vendors = useVendors({ page: 1, pageSize: 100 });
  const projects = useProjects({ page: 1, pageSize: 100 });
  const create = useCreateVendorRating();

  const onSubmit = () => {
    if (!vendorId || !score) return;
    create.mutate(
      { vendorId, projectId: projectId || undefined, category, score: Number(score), remark: remark || undefined },
      { onSuccess: () => { setVendorId(''); setRemark(''); } },
    );
  };

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Beri Rating Vendor</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="vr-vendor">Vendor</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger id="vr-vendor">
              <SelectValue placeholder="Pilih vendor…" />
            </SelectTrigger>
            <SelectContent>
              {(vendors.data?.items ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="vr-project">Project (opsional)</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="vr-project">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              {(projects.data?.items ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="vr-category">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="vr-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="vr-score">Skor</Label>
          <Select value={score} onValueChange={setScore}>
            <SelectTrigger id="vr-score">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              {['1', '2', '3', '4', '5'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="vr-remark">Catatan</Label>
          <Input id="vr-remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Beri Rating</Button>
      </div>
      {create.isError && <p className="mt-2 text-caption text-destructive-600">Gagal memberi rating.</p>}
    </div>
  );
}
