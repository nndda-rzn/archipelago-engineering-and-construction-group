import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityAvatar, initialsFrom } from '@aec/ui';

describe('initialsFrom', () => {
  it('takes the first letter of the first two words of the name', () => {
    expect(initialsFrom('EPC Industrial Processing Facility')).toBe('EI');
    expect(initialsFrom('Alpha EPC')).toBe('AE');
    expect(initialsFrom('Beta Pipeline')).toBe('BP');
  });

  it('uses the first two letters when there is only one word', () => {
    expect(initialsFrom('Alpha')).toBe('AL');
    expect(initialsFrom('A')).toBe('A');
  });

  it('ignores punctuation and extra whitespace', () => {
    expect(initialsFrom('  Beta   Pipeline  ')).toBe('BP');
    expect(initialsFrom('Alpha-EPC')).toBe('AE');
  });

  it('returns a neutral placeholder for an empty name (never crashes)', () => {
    expect(initialsFrom('')).toBe('?');
    expect(initialsFrom('   ')).toBe('?');
  });

  it('uppercases the result', () => {
    expect(initialsFrom('alpha epc')).toBe('AE');
  });
});

describe('EntityAvatar', () => {
  it('renders the initials derived from the name', () => {
    render(<EntityAvatar name="EPC Industrial Processing Facility" />);
    expect(screen.getByText('EI')).toBeTruthy();
  });

  it('is decorative — hidden from assistive tech because the name sits next to it', () => {
    const { container } = render(<EntityAvatar name="Alpha EPC" />);
    const root = container.querySelector('[data-slot="entity-avatar"]');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses a rounded square (entity, not person) with neutral tokens only', () => {
    const { container } = render(<EntityAvatar name="Alpha EPC" />);
    const root = container.querySelector('[data-slot="entity-avatar"]');
    expect(root?.className).toContain('rounded-md');
    expect(root?.className).toContain('bg-neutral-100');
    expect(root?.className).not.toContain('rounded-full');
    // Tanpa warna dekoratif: health pill harus jadi satu-satunya sinyal warna.
    expect(root?.className).not.toMatch(/racing-red|success|warning|destructive|info-/);
  });

  it('supports a larger size for page headers', () => {
    const { container } = render(<EntityAvatar name="Alpha EPC" size="lg" />);
    const root = container.querySelector('[data-slot="entity-avatar"]');
    expect(root?.className).toContain('h-12');
    expect(root?.className).toContain('w-12');
  });
});
