import { useState } from 'react';
import { Button, Input, Label } from '@aec/ui';
import type { WorkflowDefinition } from '@aec/api-contracts';

/** Nama + deskripsi. Disimpan eksplisit agar tidak menulis pada tiap ketikan. */
export function WorkflowMetadataEditor({
  definition,
  saving,
  onSave,
}: {
  definition: WorkflowDefinition;
  saving: boolean;
  onSave: (input: { name?: string; description?: string | null }) => void;
}) {
  const [name, setName] = useState(definition.name);
  const [description, setDescription] = useState(definition.description ?? '');
  const [editing, setEditing] = useState(false);

  const dirty = name !== definition.name || description !== (definition.description ?? '');
  const valid = name.trim().length >= 2;

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body font-medium text-neutral-900">{definition.name}</p>
          <p className="mt-0.5 text-caption text-neutral-500">{definition.description ?? 'No description.'}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Label htmlFor="wf-meta-name">Name</Label>
        <Input id="wf-meta-name" value={name} onChange={(e) => setName(e.target.value)} error={!valid} />
        {!valid && <p role="alert" className="mt-1 text-caption text-destructive-600">Name must be at least 2 characters.</p>}
      </div>
      <div className="max-w-md">
        <Label htmlFor="wf-meta-desc">Description</Label>
        <Input id="wf-meta-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty || !valid}
          loading={saving}
          onClick={() => onSave({ name: name.trim(), description: description.trim() === '' ? null : description.trim() })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
