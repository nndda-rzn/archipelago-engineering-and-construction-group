import { Archive, Check, Circle, FileEdit } from 'lucide-react';
import { cn } from '@aec/ui';

export type WorkflowLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | string;

export interface WorkflowLifecycleProps {
  status: WorkflowLifecycleStatus;
  /** Aksi publish disisipkan pada node "Publish" bila tersedia (DRAFT). */
  publishAction?: React.ReactNode;
  className?: string;
}

type StageState = 'done' | 'current' | 'upcoming';

/**
 * Jalur hidup definisi sebagai tiga tahap tetap: Draft → Publish → Active.
 *
 * Tujuannya menjelaskan konsep domain yang selama ini hanya tampak sebagai badge:
 * pengguna melihat **di mana posisinya** dan **apa langkah berikutnya**. Aksi
 * Publish menempel pada node-nya sendiri, bukan mengambang di baris tombol, agar
 * aksi dan posisi alur berbicara hal yang sama.
 *
 * `ARCHIVED` bukan tahap keempat di garis, melainkan cabang terminal: versi ini
 * keluar dari jalur. Karena itu ia ditampilkan sebagai penanda terpisah di kanan.
 */
export function WorkflowLifecycle({ status, publishAction, className }: WorkflowLifecycleProps) {
  const archived = status === 'ARCHIVED';
  const stages: { key: string; label: string; state: StageState; icon: React.ReactNode }[] = [
    {
      key: 'draft',
      label: 'Draft',
      state: status === 'DRAFT' ? 'current' : 'done',
      icon: <FileEdit className="h-3 w-3" aria-hidden="true" />,
    },
    {
      key: 'publish',
      label: 'Publish',
      state: status === 'DRAFT' ? 'current' : 'done',
      icon: <Circle className="h-3 w-3" aria-hidden="true" />,
    },
    {
      key: 'active',
      label: 'Active',
      state: archived ? 'upcoming' : status === 'ACTIVE' ? 'current' : 'upcoming',
      icon: <Check className="h-3 w-3" aria-hidden="true" />,
    },
  ];

  const currentIndex = archived ? 2 : status === 'ACTIVE' ? 2 : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <ol className="flex items-center" aria-label="Workflow lifecycle">
        {stages.map((stage, index) => (
          <li key={stage.key} className="flex items-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn('mx-2 h-px w-6', index <= currentIndex ? 'bg-neutral-400' : 'bg-neutral-200')}
              />
            )}
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border',
                  stage.state === 'current' && 'border-neutral-800 bg-neutral-800 text-white',
                  stage.state === 'done' && 'border-neutral-300 bg-neutral-100 text-neutral-600',
                  stage.state === 'upcoming' && 'border-neutral-200 bg-white text-neutral-400',
                )}
              >
                {stage.icon}
              </span>
              <span
                aria-current={stage.state === 'current' ? 'step' : undefined}
                className={cn(
                  'text-body-sm',
                  stage.state === 'current' ? 'font-medium text-neutral-900' : 'text-neutral-500',
                )}
              >
                {stage.label}
              </span>
              {stage.key === 'publish' && publishAction}
            </span>
          </li>
        ))}
      </ol>

      {archived && (
        <span className="flex items-center gap-1.5 text-body-sm text-neutral-500">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400"
          >
            <Archive className="h-3 w-3" />
          </span>
          Archived
        </span>
      )}
    </div>
  );
}
