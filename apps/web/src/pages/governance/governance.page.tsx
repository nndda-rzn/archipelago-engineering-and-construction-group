import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, Button, DataGrid, Input, Label } from '@aec/ui';
import {
  useRisks, useCreateRisk, useMitigateRisk,
  useAudits, useCreateAudit, useAdvanceAudit, useCreateFinding, useRespondFinding,
  useLegalCases, useCreateLegalCase, useUpdateLegalCaseStatus,
  useAccessReviews, useCreateAccessReview, useCompleteAccessReview,
  type Risk, type AuditEngagement, type AuditFinding, type LegalCase, type AccessReview,
} from '@/features/governance';

const PAGE_SIZE = 20;

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  OPEN: 'warning',
  MITIGATED: 'default',
  CLOSED: 'success',
  PLANNED: 'default',
  FIELDWORK: 'default',
  FINDINGS: 'warning',
  COMPLETED: 'success',
  SETTLED: 'success',
  WON: 'success',
  LOST: 'warning',
  IN_PROGRESS: 'default',
  SCHEDULED: 'default',
};

const riskHelper = createColumnHelper<Risk>();
const auditHelper = createColumnHelper<AuditEngagement>();
const findingHelper = createColumnHelper<AuditFinding>();
const legalHelper = createColumnHelper<LegalCase>();
const reviewHelper = createColumnHelper<AccessReview>();

const riskColumns = [
  riskHelper.accessor('riskNumber', {
    header: 'No.',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  riskHelper.accessor('title', {
    header: 'Risk',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  riskHelper.accessor('category', {
    header: 'Kategori',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  riskHelper.accessor('likelihood', {
    header: 'L',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span>,
  }),
  riskHelper.accessor('impact', {
    header: 'I',
    cell: (info) => <span className="font-mono tabular-nums text-neutral-600">{info.getValue()}</span>,
  }),
  riskHelper.accessor('score', {
    header: 'Skor',
    cell: (info) => <Badge variant={Number(info.getValue()) >= 12 ? 'warning' : Number(info.getValue()) >= 6 ? 'default' : 'success'}>{info.getValue()}</Badge>,
  }),
  riskHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  riskHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const mitigate = useMitigateRisk();
      if (row.original.status === 'CLOSED' || row.original.status === 'MITIGATED') return null;
      return (
        <Button
          size="sm"
          variant="secondary"
          loading={mitigate.isPending}
          onClick={() => mitigate.mutate({ id: row.original.id, residualLikelihood: 2, residualImpact: 2 })}
        >
          Mitigasi
        </Button>
      );
    },
  }),
];

const auditColumns = [
  auditHelper.accessor('auditNumber', {
    header: 'No. Audit',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  auditHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="text-neutral-800">{info.getValue()}</span>,
  }),
  auditHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  auditHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const advance = useAdvanceAudit();
      const next: Record<string, string> = { PLANNED: 'FIELDWORK', FIELDWORK: 'FINDINGS', FINDINGS: 'CLOSED' };
      const to = next[row.original.status];
      if (!to) return null;
      return (
        <Button size="sm" variant="secondary" loading={advance.isPending} onClick={() => advance.mutate({ id: row.original.id, status: to })}>
          → {to}
        </Button>
      );
    },
  }),
];

const findingColumns = [
  findingHelper.accessor('title', {
    header: 'Finding',
    cell: (info) => <span className="text-neutral-700">{info.getValue()}</span>,
  }),
  findingHelper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <Badge variant={info.getValue() === 'HIGH' ? 'warning' : 'default'}>{info.getValue()}</Badge>,
  }),
  findingHelper.accessor('response', {
    header: 'Respons',
    cell: (info) => <span className="max-w-xs truncate text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  findingHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  findingHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const respond = useRespondFinding();
      if (row.original.status === 'VERIFIED') return null;
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={respond.isPending} onClick={() => respond.mutate({ id: row.original.id, response: 'diterima', status: 'ACCEPTED' })}>
            Terima
          </Button>
          <Button size="sm" variant="ghost" loading={respond.isPending} onClick={() => respond.mutate({ id: row.original.id, status: 'VERIFIED' })}>
            Verified
          </Button>
        </div>
      );
    },
  }),
];

const legalColumns = [
  legalHelper.accessor('caseNumber', {
    header: 'No. Kasus',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  legalHelper.accessor('title', {
    header: 'Judul',
    cell: (info) => <span className="max-w-xs truncate text-neutral-800">{info.getValue()}</span>,
  }),
  legalHelper.accessor('caseType', {
    header: 'Tipe',
    cell: (info) => <Badge variant="default">{info.getValue()}</Badge>,
  }),
  legalHelper.accessor('counterpart', {
    header: 'Pihak Lawan',
    cell: (info) => <span className="text-neutral-600">{info.getValue() ?? '—'}</span>,
  }),
  legalHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  legalHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const update = useUpdateLegalCaseStatus();
      if (['WON', 'LOST', 'SETTLED'].includes(row.original.status)) return null;
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: 'IN_PROGRESS' })}>
            Proses
          </Button>
          <Button size="sm" variant="ghost" loading={update.isPending} onClick={() => update.mutate({ id: row.original.id, status: 'SETTLED' })}>
            Selesai
          </Button>
        </div>
      );
    },
  }),
];

const reviewColumns = [
  reviewHelper.accessor('reviewNumber', {
    header: 'No. Review',
    cell: (info) => <span className="font-mono text-neutral-800">{info.getValue()}</span>,
  }),
  reviewHelper.accessor('period', {
    header: 'Periode',
    cell: (info) => <span className="font-mono text-neutral-600">{info.getValue()}</span>,
  }),
  reviewHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <Badge variant={statusVariant[info.getValue()] ?? 'default'}>{info.getValue()}</Badge>,
  }),
  reviewHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const complete = useCompleteAccessReview();
      if (row.original.status === 'COMPLETED') return null;
      return (
        <Button size="sm" variant="secondary" loading={complete.isPending} onClick={() => complete.mutate({ id: row.original.id })}>
          Selesaikan
        </Button>
      );
    },
  }),
];

function RiskForm({ onDone }: { onDone: () => void }) {
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

function AuditForm({ onDone }: { onDone: () => void }) {
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

function LegalForm({ onDone }: { onDone: () => void }) {
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

function ReviewForm({ onDone }: { onDone: () => void }) {
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

function AuditDetail({ audit }: { audit: AuditEngagement }) {
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

type Tab = 'risks' | 'audits' | 'legal' | 'reviews';

export function GovernancePage() {
  const [tab, setTab] = useState<Tab>('risks');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [showForm, setShowForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditEngagement | null>(null);
  const risks = useRisks({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const audits = useAudits({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const legal = useLegalCases({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });
  const reviews = useAccessReviews({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const gridProps = { pagination, onPaginationChange: setPagination };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-neutral-950">Governance</h1>
          <p className="mt-1 text-body-sm text-neutral-500">Risk register, internal audit, legal case, access review (FR-GOV-001..004)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Tutup' : '+ Buat Baru'}
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['risks', 'audits', 'legal', 'reviews'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowForm(false); setSelectedAudit(null); }}
            className={`rounded-md px-3 py-1.5 text-body-sm font-medium transition-colors ${
              tab === t ? 'bg-racing-red-600 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {t === 'risks' ? `Risk (${risks.data?.total ?? 0})` : t === 'audits' ? `Audit (${audits.data?.total ?? 0})` : t === 'legal' ? `Legal (${legal.data?.total ?? 0})` : `Access Review (${reviews.data?.total ?? 0})`}
          </button>
        ))}
      </div>

      {showForm && tab === 'risks' && <RiskForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'audits' && <AuditForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'legal' && <LegalForm onDone={() => setShowForm(false)} />}
      {showForm && tab === 'reviews' && <ReviewForm onDone={() => setShowForm(false)} />}

      <div className="rounded-md border border-neutral-200 bg-white shadow-xs">
        {tab === 'risks' && (
          <DataGrid columns={riskColumns} data={risks.data?.items ?? []} rowCount={risks.data?.total ?? 0} isLoading={risks.isLoading} isError={risks.isError} onRetry={() => risks.refetch()} emptyMessage="Belum ada risk" {...gridProps} />
        )}
        {tab === 'audits' && (
          <DataGrid columns={auditColumns} data={audits.data?.items ?? []} rowCount={audits.data?.total ?? 0} isLoading={audits.isLoading} isError={audits.isError} onRetry={() => audits.refetch()} onRowClick={(row) => setSelectedAudit(row.original)} emptyMessage="Belum ada audit" {...gridProps} />
        )}
        {tab === 'legal' && (
          <DataGrid columns={legalColumns} data={legal.data?.items ?? []} rowCount={legal.data?.total ?? 0} isLoading={legal.isLoading} isError={legal.isError} onRetry={() => legal.refetch()} emptyMessage="Belum ada kasus legal" {...gridProps} />
        )}
        {tab === 'reviews' && (
          <DataGrid columns={reviewColumns} data={reviews.data?.items ?? []} rowCount={reviews.data?.total ?? 0} isLoading={reviews.isLoading} isError={reviews.isError} onRetry={() => reviews.refetch()} emptyMessage="Belum ada access review" {...gridProps} />
        )}
      </div>

      {selectedAudit && <AuditDetail audit={selectedAudit} />}
    </div>
  );
}
