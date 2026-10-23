import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntitySelect } from '@aec/ui';

const options = [
  { value: 'p1', label: 'PRJ-001 · Alpha' },
  { value: 'p2', label: 'PRJ-002 · Beta' },
];

describe('EntitySelect variant', () => {
  it('keeps the legacy styling when no variant is given', () => {
    const { container } = render(<EntitySelect value="" onValueChange={() => {}} options={options} />);
    const trigger = container.querySelector('[role="combobox"]');
    expect(trigger).toBeTruthy();
    // Varian default tidak menambahkan rounded-none.
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
