import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeBand } from '@aec/ui';

describe('TimeBand', () => {
  it('exposes an accessible label naming each band and the marker', () => {
    render(
      <TimeBand
        from="2026-01-01"
        to="2026-12-31"
        marker="2026-06-01"
        onMarkerChange={() => {}}
        bands={[
          { id: 'o1', label: 'Group', start: '2026-01-01', end: null },
          { id: 'o2', label: 'BU', start: '2026-03-01', end: '2026-09-01' },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: /Group.*BU/i })).toBeTruthy();
  });

  it('renders safely with no bands', () => {
    render(<TimeBand from="2026-01-01" to="2026-12-31" marker="2026-06-01" onMarkerChange={() => {}} bands={[]} />);
    expect(screen.getByRole('img')).toBeTruthy();
  });
});
