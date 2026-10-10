import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScopeBarView } from './scope-bar';

describe('ScopeBarView', () => {
  it('renders period, entity, compare toggle and active chips', () => {
    render(
      <ScopeBarView
        preset="YTD"
        onPresetChange={() => {}}
        entityId="LE1"
        onEntityChange={() => {}}
        entities={[{ value: 'LE1', label: 'LE1 · Alpha' }]}
        compare
        onCompareChange={() => {}}
        chips={[{ key: 'entity', label: 'Entity: LE1' }]}
        onClearChip={() => {}}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: /period/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /compare vs previous/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Entity: LE1')).toBeTruthy();
  });

  it('renders no chips when none are active', () => {
    render(
      <ScopeBarView
        preset="MTD"
        onPresetChange={() => {}}
        entityId=""
        onEntityChange={() => {}}
        entities={[]}
        compare={false}
        onCompareChange={() => {}}
        chips={[]}
        onClearChip={() => {}}
      />,
    );
    expect(screen.queryByText(/Entity:/)).toBeNull();
  });
});
