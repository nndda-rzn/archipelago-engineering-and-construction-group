import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { bulletWidth, BudgetBullet } from './budget-bullet';

describe('bulletWidth', () => {
  it('is the percentage of actual over budget', () => {
    expect(bulletWidth(82, 100)).toBe(82);
  });
  it('is 0 when budget is 0', () => {
    expect(bulletWidth(50, 0)).toBe(0);
  });
  it('clamps to 100', () => {
    expect(bulletWidth(150, 100)).toBe(100);
  });
});

describe('BudgetBullet', () => {
  it('exposes an accessible label with the percentage', () => {
    render(<BudgetBullet actual={82} budget={100} />);
    expect(screen.getByRole('img', { name: /82%/ })).toBeTruthy();
  });
  it('renders a target marker when a target is given', () => {
    const { container } = render(<BudgetBullet actual={82} budget={100} target={90} />);
    expect(container.querySelector('[data-slot="bullet-target"]')).toBeTruthy();
  });
  it('does not render a target marker without a target', () => {
    const { container } = render(<BudgetBullet actual={82} budget={100} />);
    expect(container.querySelector('[data-slot="bullet-target"]')).toBeNull();
  });
});
