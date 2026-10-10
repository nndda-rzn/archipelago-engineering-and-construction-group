import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoaLadder } from './doa-ladder';

describe('DoaLadder', () => {
  it('labels each rule segment with its approver level', () => {
    render(
      <DoaLadder
        transactionType="PurchaseOrder"
        resolvedMarker={null}
        overlaps={[]}
        rules={[
          { id: 'r1', transactionType: 'PurchaseOrder', amountFrom: 0, amountTo: 100, approverLevel: 'L1', riskLevel: null, approverRoleCode: null, status: 'ACTIVE', legalEntityId: null, businessUnit: null, projectId: null, currencyCode: null, approvalMode: 'SEQUENTIAL', priority: 0 },
        ] as never}
      />,
    );
    expect(screen.getByRole('img', { name: /L1/i })).toBeTruthy();
  });

  it('shows an empty message when there are no rules', () => {
    render(<DoaLadder transactionType="PurchaseOrder" resolvedMarker={null} overlaps={[]} rules={[]} />);
    expect(screen.getByText(/no rules/i)).toBeTruthy();
  });
});
