import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaBadge } from '@aec/ui';

describe('DeltaBadge', () => {
  it('renders an up delta with an accessible direction label', () => {
    render(<DeltaBadge pct={12.4} direction="up" />);
    expect(screen.getByText(/\+12\.4%/)).toBeTruthy();
    expect(screen.getByLabelText('up')).toBeTruthy();
  });

  it('renders a down delta', () => {
    render(<DeltaBadge pct={-3} direction="down" />);
    expect(screen.getByText(/-3%/)).toBeTruthy();
  });

  it('renders an em dash when pct is null', () => {
    render(<DeltaBadge pct={null} direction="flat" />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
