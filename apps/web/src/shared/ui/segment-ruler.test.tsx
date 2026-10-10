import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SegmentRuler } from '@aec/ui';

describe('SegmentRuler', () => {
  it('exposes an accessible label listing every segment', () => {
    render(
      <SegmentRuler
        domain={[0, 1000]}
        segments={[
          { id: 'a', label: 'L2', from: 0, to: 100 },
          { id: 'b', label: 'L3', from: 500, to: null },
        ]}
        markers={[]}
      />,
    );
    expect(screen.getByRole('img', { name: /L2.*L3/i })).toBeTruthy();
  });

  it('renders safely when there are no segments', () => {
    render(<SegmentRuler domain={[0, 100]} segments={[]} markers={[]} />);
    expect(screen.getByRole('img')).toBeTruthy();
  });
});
