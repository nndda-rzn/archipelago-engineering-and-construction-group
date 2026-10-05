import { useState } from 'react';
import { Button, DataGrid, Input, Label } from '@aec/ui';
import { useCreateFinding } from '../model/governance.api';
import type { AuditEngagement } from '@aec/api-contracts';
import { findingColumns } from './finding-grid';

export function AuditDetail({ audit }: { audit: AuditEngagement }) {
  const [title, setTitle] = useState('');
  const create = useCreateFinding();
  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <h2 className="text-h2 text-neutral-950">{audit.auditNumber} · {audit.title}</h2>
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
          Add Finding
        </Button>
      </div>
      <div className="mt-4">
        <DataGrid columns={findingColumns} data={audit.findings ?? []} emptyMessage="No findings yet" />
      </div>
    </div>
  );
}
