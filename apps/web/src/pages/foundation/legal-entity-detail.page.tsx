import { useParams } from '@tanstack/react-router';

/**
 * Detail legal entity. Implementasi lengkap (profil, footprint, readiness,
 * lifecycle) ada di Task 11; berkas ini disediakan lebih dulu agar route
 * `/foundation/legal-entities/$entityId` dapat dikompilasi dan dinavigasi.
 */
export function LegalEntityDetailPage() {
  const { entityId } = useParams({ strict: false }) as { entityId: string };
  return <div className="text-body-sm text-neutral-500">Legal entity {entityId}</div>;
}
