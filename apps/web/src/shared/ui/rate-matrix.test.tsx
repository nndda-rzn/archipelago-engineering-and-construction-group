import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RateMatrix } from '@aec/ui';

describe('RateMatrix', () => {
  it('renders a cell per pair with a full-value title', () => {
    render(<RateMatrix rows={['IDR']} cols={['USD']} value={() => 15000} format={(n) => `Rp ${n}`} />);
    expect(screen.getByTitle('Rp 15000')).toBeTruthy();
  });

  it('renders an em dash for a missing pair', () => {
    render(<RateMatrix rows={['IDR']} cols={['USD']} value={() => null} format={(n) => `Rp ${n}`} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
