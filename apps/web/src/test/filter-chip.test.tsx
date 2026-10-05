import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilterChip } from '@aec/ui';

describe('FilterChip', () => {
  it('renders the label and calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<FilterChip label="Health: Critical" onRemove={onRemove} />);
    expect(screen.getByText('Health: Critical')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /remove health: critical/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
