import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@aec/ui';

describe('StatusBadge', () => {
  it('render status known dengan label', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('render status unknown dengan label raw', () => {
    render(<StatusBadge status="SOME_CUSTOM" />);
    expect(screen.getByText('SOME_CUSTOM')).toBeTruthy();
  });

  it('override label', () => {
    render(<StatusBadge status="DRAFT" label="Draf" />);
    expect(screen.getByText('Draf')).toBeTruthy();
  });

  it('icon hadir (svg)', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
