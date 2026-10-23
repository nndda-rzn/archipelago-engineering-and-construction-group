import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntitySelect } from '@aec/ui';

const longLabel = 'PRJ-EPC-2027-014 · EPC Industrial Processing Facility';
const options = [
  { value: 'p1', label: longLabel },
  { value: 'p2', label: 'PRJ-002 · Beta' },
];

describe('EntitySelect variant', () => {
  it('keeps the legacy styling when no variant is given', () => {
    const { container } = render(<EntitySelect value="" onValueChange={() => {}} options={options} />);
    const trigger = container.querySelector('[role="combobox"]');
    expect(trigger!.className).not.toContain('rounded-none');
  });

  it('drops the radius on the editorial trigger', () => {
    const { container } = render(<EntitySelect variant="editorial" value="" onValueChange={() => {}} options={options} />);
    const trigger = container.querySelector('[role="combobox"]');
    expect(trigger!.className).toContain('rounded-none');
  });

  it('uses a neutral focus ring instead of the brand red on editorial', () => {
    const { container } = render(<EntitySelect variant="editorial" value="" onValueChange={() => {}} options={options} />);
    const trigger = container.querySelector('[role="combobox"]');
    expect(trigger!.className).toContain('focus-visible:ring-neutral-900');
    expect(trigger!.className).not.toContain('racing-red');
  });

  it('shows the selected label in the trigger', () => {
    render(<EntitySelect variant="editorial" value="p2" onValueChange={() => {}} options={options} />);
    expect(screen.getByText('PRJ-002 · Beta')).toBeTruthy();
  });

  it('falls back to the placeholder when nothing is selected', () => {
    render(<EntitySelect variant="editorial" value="" onValueChange={() => {}} options={options} placeholder="Pilih proyek…" />);
    expect(screen.getByText('Pilih proyek…')).toBeTruthy();
  });
});

/**
 * Label panjang tidak boleh wrap. Tanpa `white-space: nowrap`, teks 53 karakter
 * turun ke baris kedua di dalam kotak 32px dan meluber — itu bug yang sedang
 * diperbaiki di sini.
 */
describe('EntitySelect never wraps its label', () => {
  it('puts truncate on the value element', () => {
    const { container } = render(
      <EntitySelect variant="editorial" value="p1" onValueChange={() => {}} options={options} />,
    );
    const trigger = container.querySelector('[role="combobox"]');
    const value = trigger!.querySelector('span');
    expect(value!.className).toContain('truncate');
  });

  it('lets the trigger shrink so the value can be truncated', () => {
    const { container } = render(
      <EntitySelect variant="editorial" value="p1" onValueChange={() => {}} options={options} />,
    );
    const trigger = container.querySelector('[role="combobox"]');
    expect(trigger!.className).toContain('min-w-0');
  });

  it('renders the full label in the DOM even when visually truncated', () => {
    render(<EntitySelect variant="editorial" value="p1" onValueChange={() => {}} options={options} />);
    // Truncate memotong secara visual, bukan menghapus teks — pembaca layar
    // dan pencarian browser tetap mendapat label utuh.
    expect(screen.getByText(longLabel)).toBeTruthy();
  });
});
