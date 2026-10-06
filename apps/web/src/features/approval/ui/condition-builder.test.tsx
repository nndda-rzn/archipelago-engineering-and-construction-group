import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ConditionGroup } from '@aec/api-contracts';
import { ConditionBuilder } from './condition-builder';

/**
 * Catatan metode: jsdom tidak punya layout engine, jadi test ini **tidak bisa**
 * mengukur wrap. Yang dikunci adalah **struktur** yang membuat wrap mustahil —
 * sama seperti pengunci `border-l` sebelumnya. Angka lebarnya diverifikasi
 * secara aritmetika (lihat komentar di komponen), bukan di sini.
 */

function renderBuilder(overrides: Partial<React.ComponentProps<typeof ConditionBuilder>> = {}) {
  const onChange = vi.fn();
  const value: ConditionGroup = {
    combinator: 'AND',
    conditions: [{ field: 'totalAmount', op: '>', value: 5_000_000 }],
  };
  const result = render(
    <ConditionBuilder
      transactionType="PurchaseOrder"
      value={value}
      onChange={onChange}
      idPrefix="cond"
      {...overrides}
    />,
  );
  return { ...result, onChange };
}

describe('ConditionBuilder: tata letak tidak memaksa label wrap', () => {
  it('renders the three fields with their labels', () => {
    renderBuilder();
    expect(screen.getByText('Field')).toBeTruthy();
    expect(screen.getByText('Operator')).toBeTruthy();
    expect(screen.getByText('Amount (IDR)')).toBeTruthy();
  });

  it('puts the field on its own row, above operator and amount', () => {
    const { container } = renderBuilder();
    const fieldRow = container.querySelector('[data-slot="rule-row-field"]');
    const opAmountRow = container.querySelector('[data-slot="rule-row-operator-amount"]');
    expect(fieldRow).toBeTruthy();
    expect(opAmountRow).toBeTruthy();
    // Baris berbeda: operator TIDAK berada di baris yang sama dengan field.
    expect(fieldRow).not.toBe(opAmountRow);
    expect(fieldRow!.contains(opAmountRow!)).toBe(false);
  });

  it('keeps operator and amount together on one row', () => {
    const { container } = renderBuilder();
    const row = container.querySelector('[data-slot="rule-row-operator-amount"]')!;
    expect(row.querySelector('[data-slot="rule-operator"]')).toBeTruthy();
    expect(row.querySelector('[data-slot="rule-amount"]')).toBeTruthy();
  });

  it('puts the field control inside the field row, not the operator row', () => {
    const { container } = renderBuilder();
    const fieldRow = container.querySelector('[data-slot="rule-row-field"]')!;
    const opRow = container.querySelector('[data-slot="rule-row-operator-amount"]')!;
    expect(fieldRow.querySelector('[data-slot="rule-field"]')).toBeTruthy();
    expect(opRow.querySelector('[data-slot="rule-field"]')).toBeNull();
  });

  it('does not squeeze the field into a four-column grid', () => {
    const { container } = renderBuilder();
    const rule = container.querySelector('[data-slot="condition-rule"]')!;
    // Grid 4 kolom dalam wadah ~303px menyisakan ~68px per kolom; label
    // "Estimated total" (~104px) tidak muat dan pecah dua baris. Struktur itu
    // tidak boleh kembali.
    const className = rule.className;
    expect(className).not.toMatch(/sm:grid-cols-\[minmax\(0,1fr\)_minmax\(0,7rem\)/);
    expect(className).not.toContain('grid-cols-[minmax(0,1fr)_minmax(0,7rem)_minmax(0,1fr)_auto]');
  });

  it('gives the field row a two-column template: field plus the remove slot', () => {
    const { container } = renderBuilder();
    const fieldRow = container.querySelector('[data-slot="rule-row-field"]')!;
    expect(fieldRow.className).toContain('grid');
    // Dua kolom: field (fleksibel) + slot tombol hapus (auto).
    expect(fieldRow.className).toMatch(/grid-cols-\[minmax\(0,1fr\)_auto\]/);
  });

  it('reserves the remove slot even with a single rule, so nothing shifts', () => {
    const { container } = renderBuilder();
    // Satu aturan → tombol hapus tidak dirender, tapi ruangnya tetap ada.
    const slot = container.querySelector('[data-slot="rule-remove-slot"]');
    expect(slot).toBeTruthy();
    expect(slot!.className).toMatch(/w-\d/);
  });
});

describe('ConditionBuilder: tombol hapus berada di baris field', () => {
  it('places the remove button in the field row, not beside the amount', () => {
    const { container } = renderBuilder({
      value: {
        combinator: 'AND',
        conditions: [
          { field: 'totalAmount', op: '>', value: 5_000_000 },
          { field: 'totalAmount', op: '<=', value: 50_000_000 },
        ],
      },
    });
    const fieldRow = container.querySelector('[data-slot="rule-row-field"]')!;
    const buttons = screen.getAllByRole('button', { name: /Remove rule/i });
    expect(fieldRow.contains(buttons[0]!)).toBe(true);
  });

  it('removes the correct rule', () => {
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        transactionType="PurchaseOrder"
        value={{
          combinator: 'AND',
          conditions: [
            { field: 'totalAmount', op: '>', value: 5_000_000 },
            { field: 'totalAmount', op: '<=', value: 50_000_000 },
          ],
        }}
        onChange={onChange}
        idPrefix="cond"
      />,
    );
    screen.getByRole('button', { name: /Remove rule 2/i }).click();
    expect(onChange).toHaveBeenCalledWith({
      combinator: 'AND',
      conditions: [{ field: 'totalAmount', op: '>', value: 5_000_000 }],
    });
  });
});
