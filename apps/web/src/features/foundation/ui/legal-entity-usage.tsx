import { Link } from '@tanstack/react-router';
import { StackedBar, type StackedSegment } from '@aec/ui';
import type { LegalEntityUsage } from '@aec/api-contracts';

interface UsageRow {
  key: keyof Omit<LegalEntityUsage, 'generatedAt'>;
  label: string;
  to: string;
}

const ROWS: UsageRow[] = [
  { key: 'projects', label: 'Projects', to: '/projects' },
  { key: 'users', label: 'Users', to: '/foundation/users' },
  { key: 'organizations', label: 'Organizations', to: '/foundation/hardening' },
  { key: 'chartOfAccounts', label: 'Chart of accounts', to: '/finance/chart-of-accounts' },
  { key: 'bankAccounts', label: 'Bank accounts', to: '/treasury' },
  { key: 'periodCloses', label: 'Period closes', to: '/finance/closure' },
  { key: 'employees', label: 'Employees', to: '/hcm/employees' },
  { key: 'equipment', label: 'Equipment', to: '/hcm/equipment' },
];

/**
 * "Used in" — footprint entity lintas domain sebagai SATU strip bersegmen
 * (bukan delapan kartu angka) plus daftar berlabel dengan tautan. Nol
 * ditampilkan apa adanya (jujur), bukan disembunyikan.
 */
export function LegalEntityUsage({ usage }: { usage: LegalEntityUsage }) {
  const total = ROWS.reduce((sum, row) => sum + (usage[row.key] as number), 0);
  const segments: StackedSegment[] = ROWS.map((row, i) => ({
    value: usage[row.key] as number,
    tone: (['neutral-dark', 'neutral-mid', 'neutral-light'] as const)[i % 3]!,
    label: row.label,
  }));

  return (
    <section aria-label="Used in">
      <h2 className="text-overline uppercase text-neutral-500">Used in</h2>
      <div className="mt-2">
        <StackedBar segments={segments} format={(n) => String(n)} />
        <p className="mt-1.5 font-mono text-caption tabular-nums text-neutral-500">{total} linked records</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
        {ROWS.map((row) => {
          const count = usage[row.key] as number;
          return (
            <div key={row.key} className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-1">
              <dt className="text-body-sm text-neutral-600">
                <Link to={row.to as never} className="hover:underline">
                  {row.label}
                </Link>
              </dt>
              <dd className={`font-mono text-body-sm tabular-nums ${count > 0 ? 'text-neutral-900' : 'text-neutral-400'}`}>{count}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
