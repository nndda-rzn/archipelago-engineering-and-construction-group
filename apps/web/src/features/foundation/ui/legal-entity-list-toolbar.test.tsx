import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalEntityListToolbarView } from './legal-entity-list-toolbar';

describe('LegalEntityListToolbarView', () => {
  it('renders search, a status filter, and one primary add action', () => {
    render(
      <LegalEntityListToolbarView
        search=""
        onSearchChange={() => {}}
        status=""
        onStatusChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByRole('searchbox')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: /status/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /add entity/i })).toBeTruthy();
  });
});
