import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarStack, PersonAvatar } from '@aec/ui';

describe('PersonAvatar', () => {
  it('is round, unlike EntityAvatar which is square', () => {
    const { container } = render(<PersonAvatar name="AEC Administrator" />);
    const el = container.querySelector('[data-slot="person-avatar"]')!;
    expect(el.className).toContain('rounded-full');
    expect(el.className).not.toContain('rounded-md');
  });

  it('shows initials from the name', () => {
    const { container } = render(<PersonAvatar name="AEC Administrator" />);
    expect(container.textContent).toBe('AA');
  });

  it('is hidden from assistive tech because the name sits next to it', () => {
    const { container } = render(<PersonAvatar name="AEC Administrator" />);
    expect(container.querySelector('[data-slot="person-avatar"]')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('never invents initials for an unknown person: it shows a dashed ring', () => {
    const { container } = render(<PersonAvatar name={null} />);
    const el = container.querySelector('[data-slot="person-avatar"]')!;
    expect(el.textContent).toBe('?');
    expect(el.getAttribute('data-unknown')).toBe('true');
    expect(el.className).toContain('border-dashed');
  });

  it('treats a blank name as unknown, not as a person', () => {
    const { container } = render(<PersonAvatar name="   " />);
    expect(container.querySelector('[data-slot="person-avatar"]')!.getAttribute('data-unknown')).toBe('true');
  });
});

describe('AvatarStack', () => {
  it('labels the stack with every name, including those hidden behind +N', () => {
    render(<AvatarStack names={['A', 'B', 'C', 'D', 'E']} />);
    const stack = screen.getByRole('img');
    expect(stack.getAttribute('aria-label')).toBe('5 approvers: A, B, C, D, E');
  });

  it('shows at most three avatars then an overflow count', () => {
    const { container } = render(<AvatarStack names={['A', 'B', 'C', 'D', 'E']} />);
    expect(container.querySelectorAll('[data-slot="person-avatar"]').length).toBe(3);
    expect(container.querySelector('[data-slot="avatar-overflow"]')!.textContent).toBe('+2');
  });

  it('does not render an overflow marker when everyone fits', () => {
    const { container } = render(<AvatarStack names={['A', 'B']} />);
    expect(container.querySelector('[data-slot="avatar-overflow"]')).toBeNull();
  });

  it('states plainly when nobody holds the role', () => {
    render(<AvatarStack names={[]} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('0 approvers: No one');
  });

  it('uses the singular for exactly one approver', () => {
    render(<AvatarStack names={['AEC Administrator']} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('1 approver: AEC Administrator');
  });
});
