import type { LegalEntity, LegalEntityUsage } from '@aec/api-contracts';

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Readiness strip — menampilkan CELAH secara jujur, bukan hanya centang. Empat
 * sinyal yang benar-benar dapat diturunkan dari data yang ada (profil + usage);
 * tidak ada nilai yang dikarang. Setiap item selalu menyertakan detail teks,
 * jadi status terbaca tanpa warna.
 */
export function LegalEntityReadiness({ entity, usage }: { entity: LegalEntity; usage: LegalEntityUsage }) {
  const checks: Check[] = [
    { label: 'Chart of accounts', ok: usage.chartOfAccounts > 0, detail: `${usage.chartOfAccounts} accounts` },
    { label: 'Fiscal calendar', ok: !!entity.fiscalCalendar, detail: entity.fiscalCalendar || 'not set' },
    { label: 'Currency linked', ok: !!entity.functionalCurrencyId && !!entity.reportingCurrencyId, detail: `${entity.functionalCurrency} / ${entity.reportingCurrency}` },
    { label: 'Periods tracked', ok: usage.periodCloses > 0, detail: `${usage.periodCloses} closes` },
  ];

  return (
    <section aria-label="Readiness">
      <h2 className="text-overline uppercase text-neutral-500">Readiness</h2>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-body-sm">
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full ${c.ok ? 'bg-success-700' : 'bg-warning-700'}`}
            />
            <span className="text-neutral-700">{c.label}</span>
            <span className={`font-mono text-caption tabular-nums ${c.ok ? 'text-neutral-500' : 'text-warning-700'}`}>{c.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
