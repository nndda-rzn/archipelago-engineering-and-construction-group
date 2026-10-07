import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import { PROJECT_STATUSES, type UpdateProject } from '@aec/api-contracts';
import { useUpdateProject } from '@/entities/project';

const STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

/** Form edit metadata proyek. `code` & legal entity TIDAK dapat diubah. */
export function ProjectEditForm({
  projectId,
  initial,
  onDone,
}: {
  projectId: string;
  initial: { name: string; client: string; manager: string | null; director: string | null; location: string | null; status: string; startDate: string | null; completionDate: string | null };
  onDone: () => void;
}) {
  const update = useUpdateProject(projectId);
  const [form, setForm] = useState({
    name: initial.name,
    client: initial.client,
    manager: initial.manager ?? '',
    director: initial.director ?? '',
    location: initial.location ?? '',
    status: initial.status,
    startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
    completionDate: initial.completionDate ? initial.completionDate.slice(0, 10) : '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hanya field yang boleh diubah yang dikirim — tanpa code/legalEntityId.
    const payload: UpdateProject = {
      name: form.name,
      client: form.client,
      manager: form.manager || undefined,
      director: form.director || undefined,
      location: form.location || undefined,
      status: form.status as UpdateProject['status'],
      startDate: form.startDate || '',
      completionDate: form.completionDate || '',
    };
    update.mutate(payload, { onSuccess: onDone });
  };

  const field = (id: string, label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <form onSubmit={submit} className="mb-4 rounded-md border border-neutral-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field('edit-name', 'Project name', 'name')}
        {field('edit-client', 'Client', 'client')}
        {field('edit-manager', 'Manager', 'manager')}
        {field('edit-director', 'Director', 'director')}
        {field('edit-location', 'Location', 'location')}
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-body text-neutral-900 focus-visible:border-racing-red-600 focus-visible:ring-2 focus-visible:ring-racing-red-600/20"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
        </div>
        {field('edit-start', 'Start date', 'startDate', 'date')}
        {field('edit-completion', 'Completion date', 'completionDate', 'date')}
      </div>
      <p className="mt-3 text-caption text-neutral-500">Code and legal entity are fixed — they anchor the project identity and accounting.</p>
      {update.isError && <p role="alert" className="mt-2 text-caption text-destructive-600">Could not save. Check the values and try again.</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={update.isPending}>Save</Button>
      </div>
    </form>
  );
}
