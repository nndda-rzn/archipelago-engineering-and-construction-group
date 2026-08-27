import { useState } from 'react';
import { Button, DataGrid, Input, Label } from '@aec/ui';
import { useCreateAccessReview, useCreateAudit, useCreateFinding, useCreateLegalCase, useCreateRisk } from '../model/governance.api';
import type { AuditEngagement } from '@aec/api-contracts';
import { findingColumns } from './finding-grid';

export function RiskForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [likelihood, setLikelihood] = useState('3');
  const [impact, setImpact] = useState('3');
  const [owner, setOwner] = useState('');
  const create = useCreateRisk();
  const score = Number(likelihood) * Number(impact);
  const onSubmit = () => {
    if (!title || !owner) return;
    create.mutate(
      { title, category, likelihood: Number(likelihood), impact: Number(impact), owner },
      { onSuccess: () => { setTitle(''); setOwner(''); onDone(); } },
    );
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="risk-title">Risk</Label>
          <Input id="risk-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="risk-cat">Kategori</Label>
          <select id="risk-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['TECHNICAL', 'FINANCIAL', 'SCHEDULE', 'HSE', 'COMMERCIAL', 'OTHER'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="risk-l">Likelihood</Label>
          <Input id="risk-l" type="number" min={1} max={5} value={likelihood} onChange={(e) => setLikelihood(e.target.value)} className="w-16" />
        </div>
        <div>
          <Label htmlFor="risk-i">Impact</Label>
          <Input id="risk-i" type="number" min={1} max={5} value={impact} onChange={(e) => setImpact(e.target.value)} className="w-16" />
        </div>
        <div>
          <Label htmlFor="risk-owner">Owner</Label>
          <Input id="risk-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <div className="pb-2 text-caption text-neutral-500">Skor: <span className="font-mono font-bold">{score}</span></div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Risk</Button>
      </div>
    </div>
  );
}

export function AuditForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const create = useCreateAudit();
  const onSubmit = () => {
    if (!title) return;
    create.mutate({ title, scope: scope || undefined }, { onSuccess: () => { setTitle(''); setScope(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="audit-title">Judul Audit</Label>
          <Input id="audit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex-1">
          <Label htmlFor="audit-scope">Scope</Label>
          <Input id="audit-scope" value={scope} onChange={(e) => setScope(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Audit</Button>
      </div>
    </div>
  );
}

export function LegalForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState('CONTRACT');
  const [counterpart, setCounterpart] = useState('');
  const create = useCreateLegalCase();
  const onSubmit = () => {
    if (!title) return;
    create.mutate({ title, caseType, counterpart: counterpart || undefined }, { onSuccess: () => { setTitle(''); setCounterpart(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="legal-title">Judul Kasus</Label>
          <Input id="legal-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="legal-type">Tipe</Label>
          <select id="legal-type" value={caseType} onChange={(e) => setCaseType(e.target.value)} className="flex h-9 rounded-md border border-neutral-200 bg-white px-3 text-body">
            {['CONTRACT', 'LABOR', 'REGULATORY', 'TAX', 'OTHER'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="legal-cp">Pihak Lawan</Label>
          <Input id="legal-cp" value={counterpart} onChange={(e) => setCounterpart(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Kasus</Button>
      </div>
    </div>
  );
}

export function ReviewForm({ onDone }: { onDone: () => void }) {
  const [period, setPeriod] = useState('');
  const create = useCreateAccessReview();
  const onSubmit = () => {
    if (!period) return;
    create.mutate({ period }, { onSuccess: () => { setPeriod(''); onDone(); } });
  };
  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="flex items-end gap-3">
        <div>
          <Label htmlFor="review-period">Periode (mis. 2026-Q3)</Label>
          <Input id="review-period" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <Button onClick={onSubmit} loading={create.isPending}>Buat Review</Button>
      </div>
    </div>
  );
}

export function AuditDetail({ audit }: { audit: AuditEngagement }) {
  const [title, setTitle] = useState('');
  const create = useCreateFinding();
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 className="text-h2 text-neutral-950">{audit.auditNumber} — {audit.title}</h2>
      <p className="text-caption text-neutral-500">Status {audit.status} · Klik baris lain untuk ganti</p>
      <div className="mt-4 flex items-end gap-2 border-t border-neutral-100 pt-4">
        <div className="flex-1">
          <Label htmlFor="finding-title">Finding Baru</Label>
          <Input id="finding-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button
          disabled={!title}
          loading={create.isPending}
          onClick={() => create.mutate({ auditId: audit.id, title }, { onSuccess: () => setTitle('') })}
        >
          Tambah Finding
        </Button>
      </div>
      <div className="mt-4">
        <DataGrid columns={findingColumns} data={audit.findings ?? []} emptyMessage="Belum ada finding" />
      </div>
    </div>
  );
}
