import { Link } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { EmptyState } from '@aec/ui';
import { useUrlFilter } from '@/shared/lib/use-url-state';

/**
 * Halaman yang muncul saat pengguna membuka route tanpa permission (dijaga
 * `requirePermission`). Sengaja **bukan** redirect senyap ke Dashboard: tanpa
 * umpan balik, pengguna bingung kenapa tiba-tiba berpindah. Di sini ia diberi
 * tahu halaman mana yang ditolak dan jalan kembali.
 */
export function AccessDeniedPage() {
  const [from] = useUrlFilter('from');

  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        icon={<Lock className="h-5 w-5" aria-hidden="true" />}
        title="Access denied"
        description={
          from
            ? `You don't have permission to view ${from}. Ask an administrator if you need access.`
            : "You don't have permission to view this page. Ask an administrator if you need access."
        }
        action={
          <Link
            to="/"
            className="mt-1 inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-body-sm font-medium text-neutral-700 transition-colors duration-fast hover:border-neutral-300 hover:bg-neutral-50"
          >
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}

