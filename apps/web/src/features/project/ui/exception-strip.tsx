import { AlertTriangle } from 'lucide-react';
import type { BudgetStatement } from '@aec/api-contracts';
import { formatIdrCompact } from '@/shared/lib/format';

/**
 * Zona 5 — hal yang perlu tindakan.
 *
 * Dulu peringatan berupa daftar teks polos yang mudah terlewat. Di sini tiap
 * butir adalah baris bertindak: apa yang salah, di mana, seberapa besar.
 *
 * `pvCoverage` hanya memunculkan pesan saat PV = 0. PV di bawah BAC adalah
 * kondisi normal sepanjang proyek berjalan — menandainya sebagai masalah akan
 * membuat strip ini menyala di hampir semua proyek, dan peringatan yang selalu
 * menyala berhenti menjadi peringatan.
 */
export interface ExceptionStripProps {
  warnings: BudgetStatement['warnings'];
  reconciliation: BudgetStatement['reconciliation'];
  /**
   * Apakah proyek punya alokasi sama sekali. Bila tidak, daftar "simpul tanpa
   * budget" tidak ditampilkan: halaman sudah menyatakan keadaan itu di panel
   * utama, dan mengulanginya sebagai peringatan hanya menambah kebisingan.
   */
  hasAllocation?: boolean;
}

export function ExceptionStrip({ warnings, reconciliation, hasAllocation = true }: ExceptionStripProps) {
  const items: Array<{ key: string; text: string }> = [];

  if (reconciliation.doubleCountRisk) {
    items.push({
      key: 'double-count',
      text:
        `Material cost may double count: the stock ledger holds ${formatIdrCompact(reconciliation.ledgerOut)} ` +
        `while expense journals hold another ${formatIdrCompact(reconciliation.journalExpense610)} for the same material.`,
    });
  }

  if (warnings.overContract) {
    items.push({ key: 'over-contract', text: 'Revised total exceeds the contract value.' });
  }

  if (warnings.overCommitted.length > 0) {
    items.push({
      key: 'over-committed',
      text:
        `${warnings.overCommitted.length} node${warnings.overCommitted.length === 1 ? '' : 's'} committed above budget: ` +
        warnings.overCommitted.map((n) => n.code).join(', '),
    });
  }

  if (warnings.noBudget.length > 0 && hasAllocation) {
    items.push({
      key: 'no-budget',
      text:
        `${warnings.noBudget.length} node${warnings.noBudget.length === 1 ? '' : 's'} without budget: ` +
        warnings.noBudget.map((n) => n.code).join(', '),
    });
  }

  if (warnings.pvCoverage.status === 'NO_BASELINE' && hasAllocation) {
    items.push({
      key: 'no-schedule-baseline',
      text: 'No schedule baseline published yet — schedule indices are unavailable.',
    });
  }

  if (warnings.pvCoverage.status === 'PARTIAL') {
    items.push({
      key: 'pv-over-bac',
      text: 'Planned value exceeds the budget — schedule indices derived from it are unreliable.',
    });
  }

  if (items.length === 0) return null;

  return (
    <section aria-label="Needs attention" className="border-l-2 border-warning-500 bg-warning-50 px-4 py-3">
      <h2 className="text-overline uppercase text-warning-800">Needs attention</h2>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-body-sm text-warning-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
