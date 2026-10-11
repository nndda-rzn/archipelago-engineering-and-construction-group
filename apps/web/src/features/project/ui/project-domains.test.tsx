import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DomainGroup } from './project-domains';

const items = [
  { id: 'w1', ref: 'WP-1', label: 'Erection Steel Structure', status: 'IN_PROGRESS' },
  { id: 'w2', ref: 'WP-2', label: 'Piping', status: 'COMPLETED', meta: 'CIVIL' },
];

describe('DomainGroup', () => {
  it('lists each item with its ref, label and status', () => {
    render(<DomainGroup title="Work packages" items={items} />);
    expect(screen.getByText('WP-1')).toBeTruthy();
    expect(screen.getByText('Erection Steel Structure')).toBeTruthy();
    expect(screen.getByText('in progress')).toBeTruthy();
  });

  it('shows a meta column when asked', () => {
    render(<DomainGroup title="Drawings" items={items} metaLabel="discipline" />);
    expect(screen.getByText('CIVIL')).toBeTruthy();
  });

  it('renders a progress bar when an item carries a score', () => {
    render(<DomainGroup title="Work packages" items={[{ id: 'w1', ref: 'WP-1', label: 'Erection', status: 'IN_PROGRESS', score: 45 }]} />);
    expect(screen.getByTitle('45%')).toBeTruthy();
  });

  it('shows a calm empty state when there is nothing', () => {
    render(<DomainGroup title="Punch list" items={[]} />);
    expect(screen.getByText('None recorded.')).toBeTruthy();
  });
});
