import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn, labelRole } from '@aec/ui';
import type { WorkflowTemplate } from '@aec/api-contracts';
import { formatIdr } from '@/shared/lib/format';
import { conditionFieldLabel, opLabel } from './workflow-labels';

export interface WorkflowTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: WorkflowTemplate[];
  loading?: boolean;
  /** Membuat definisi dari template terpilih. */
  onCreate: (args: { template: WorkflowTemplate; code: string; name: string }) => void;
}

/**
 * Mulai dari cetakan, bukan dari nol.
 *
 * Template dipilih dulu (kiri), lalu diberi identitas (kanan). Ringkasan langkah
 * ditampilkan apa adanya — termasuk syaratnya — supaya pengguna tahu persis apa
 * yang akan dibuat sebelum menekan Create. Ini menjawab keluhan "mulai dari
 * kosong" tanpa menyembunyikan isi template di balik nama yang manis.
 */
export function WorkflowTemplateDialog({ open, onOpenChange, templates, loading, onCreate }: WorkflowTemplateDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  const choose = (template: WorkflowTemplate) => {
    setSelectedId(template.id);
    // Isi nama default dari template, biarkan pengguna menyesuaikan.
    if (!name || templates.some((t) => t.name === name)) setName(template.name);
    if (!code) setCode(template.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
  };

  const valid = Boolean(selected) && code.trim().length >= 2 && name.trim().length >= 2;

  const submit = () => {
    if (!selected || !valid) return;
    onCreate({ template: selected, code: code.trim(), name: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" showClose={false}>
        <DialogHeader>
          <DialogTitle>New workflow from a template</DialogTitle>
          <DialogDescription>
            Pick a starting chain, then give it a code and a name. It is created as a draft you can edit.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-body-sm text-neutral-500">Loading templates…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ul aria-label="Templates" className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {templates.map((template) => {
                const active = template.id === selected?.id;
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => choose(template)}
                      aria-pressed={active}
                      className={cn(
                        'w-full rounded-md border px-3 py-2 text-left transition-colors duration-fast',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                        active ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50',
                      )}
                    >
                      <span className="block break-words text-body-sm font-medium text-neutral-900">{template.name}</span>
                      <span className="mt-0.5 block break-words text-caption text-neutral-500">{template.description}</span>
                      <span className="mt-1 block whitespace-nowrap font-mono text-caption tabular-nums text-neutral-500">
                        {template.steps.length} step{template.steps.length === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-4">
              <div>
                <Label htmlFor="wf-tpl-code">Code</Label>
                <Input
                  id="wf-tpl-code"
                  value={code}
                  placeholder="e.g. PR_APPROVAL_V2"
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="wf-tpl-name">Name</Label>
                <Input id="wf-tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {selected && (
                <div>
                  <p className="mb-1.5 text-caption font-medium text-neutral-700">This chain will contain</p>
                  <ol className="space-y-1.5">
                    {selected.steps.map((step, index) => (
                      <li key={`${step.name}-${index}`} className="flex items-start gap-2 text-caption">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-mono tabular-nums text-neutral-600">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words text-neutral-800">{step.name}</span>
                          <span className="block break-words text-neutral-500">
                            {labelRole(step.approverRoleCode)}
                            {step.conditionField && step.conditionValue != null
                              ? <> · only when {conditionFieldLabel(step.conditionField)} {opLabel(step.conditionOp)} <span className="whitespace-nowrap font-mono tabular-nums">{formatIdr(step.conditionValue)}</span></>
                              : ' · always applies'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>Create workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
