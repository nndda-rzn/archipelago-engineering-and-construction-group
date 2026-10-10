import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { EntityAvatar, ErrorState, Skeleton, StatusBadge } from '@aec/ui';
import { useLegalEntity, useLegalEntityUsage } from '@/entities/legal-entity';
import { LegalEntityForm, LegalEntityLifecycle, LegalEntityProfile, LegalEntityUsage } from '@/features/foundation/ui';

/**
 * Detail legal entity: header (identitas + status + lifecycle), profil,
 * "Used in" (footprint lintas domain), dan readiness strip. Semua keadaan
 * (loading/error/empty) ditangani sebelum merender data.
 */
export function LegalEntityDetailPage() {
  const { entityId } = useParams({ strict: false }) as { entityId: string };
  const entity = useLegalEntity(entityId);
  const usage = useLegalEntityUsage(entityId);
  const [editing, setEditing] = useState(false);

  if (entity.isLoading) {
    return (
      <div aria-label="Loading legal entity" className="mx-auto max-w-[1200px] space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (entity.isError || !entity.data) {
    return (
      <div role="alert" className="mx-auto max-w-[1200px]">
        <ErrorState message="The legal entity could not be loaded." onRetry={() => entity.refetch()} />
      </div>
    );
  }

  const e = entity.data;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <div>
        <Link to="/foundation/legal-entities" className="inline-flex items-center gap-1 text-body-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Legal entities
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-start gap-3">
          <EntityAvatar name={e.legalName} size="lg" />
          <div>
            <h1 className="text-h1 text-neutral-950">{e.legalName}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-body-sm text-neutral-500">{e.code}</span>
              <StatusBadge status={e.status} />
              <span className="text-body-sm text-neutral-500">{e.country} · {e.functionalCurrency}</span>
            </div>
          </div>
        </div>
        <LegalEntityLifecycle entity={e} onEdit={() => setEditing((v) => !v)} />
      </header>

      {editing && <LegalEntityForm mode="edit" entity={e} onDone={() => setEditing(false)} />}

      <LegalEntityProfile entity={e} />

      {usage.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : usage.isError || !usage.data ? (
        <div role="alert">
          <ErrorState message="Usage could not be loaded." onRetry={() => usage.refetch()} />
        </div>
      ) : (
        <LegalEntityUsage usage={usage.data} />
      )}
    </div>
  );
}
