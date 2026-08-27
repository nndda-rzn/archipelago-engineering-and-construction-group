import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import {
  useCreatePoChange,
  useCreateVendorRating,
} from '@/features/procurement';
import { useProjects } from '@/entities/project';
import { useVendors } from '@/features/master-data';

// ── PO Change Form ──────────────────────────────────────────────────────────

export function PoChangeForm({ poId }: { poId: string }) {
  const [newTotal, setNewTotal] = useState('');
  const [reason, setReason] = useState('');
  const create = useCreatePoChange(poId);

  const onSubmit = () => {
    const parsed = Number(newTotal);
    if (!parsed || !reason) return;
    create.mutate(
      { newTotal: parsed, reason },
      { onSuccess: () => { setNewTotal(''); setReason(''); } },
    );
  };

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Ajukan PO Change</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="pc-total">Total Baru (IDR)</Label>
          <Input
            id="pc-total"
            type="number"
            placeholder="0"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="pc-reason">Alasan</Label>
          <Input
            id="pc-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>
          Ajukan
        </Button>
      </div>
      {create.isError && (
        <p className="mt-2 text-caption text-destructive-600">Gagal mengajukan PO Change.</p>
      )}
    </div>
  );
}

// ── Vendor Rating Form ──────────────────────────────────────────────────────

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
      {
        vendorId,
        projectId: projectId || undefined,
        category,
        score: Number(score),
        remark: remark || undefined,
      },
      { onSuccess: () => { setVendorId(''); setRemark(''); } },
    );
  };

  const selectCls =
    'flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body';

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-h3 text-neutral-900">Beri Rating Vendor</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="vr-vendor">Vendor</Label>
          <select
            id="vr-vendor"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className={selectCls}
          >
            <option value="">Pilih vendor…</option>
            {(vendors.data?.items ?? []).map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-project">Project (opsional)</Label>
          <select
            id="vr-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={selectCls}
          >
            <option value="">Semua</option>
            {(projects.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-category">Kategori</Label>
          <select
            id="vr-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="vr-score">Skor</Label>
          <select
            id="vr-score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={selectCls}
          >
            <option value="">-</option>
            {['1', '2', '3', '4', '5'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="vr-remark">Catatan</Label>
          <Input
            id="vr-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>
          Beri Rating
        </Button>
      </div>
      {create.isError && (
        <p className="mt-2 text-caption text-destructive-600">Gagal memberi rating.</p>
      )}
    </div>
  );
}
