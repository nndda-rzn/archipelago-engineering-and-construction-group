import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const auth = vi.hoisted(() => ({ login: vi.fn(), isError: false }));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/auth', () => ({
  useLogin: () => ({
    mutate: auth.login,
    isPending: false,
    isError: auth.isError,
    error: auth.isError ? new Error('Incorrect email or password') : null,
  }),
}));

import { LoginPage } from './login.page';

describe('LoginPage: struktur & aksesibilitas', () => {
  it('uses the same brand as the sidebar: white logo mark + "AEC" wordmark', () => {
    const { container } = renderWithProviders(<LoginPage />);
    const light = container.querySelectorAll('img[src="/logo-mark-light.png"]');
    expect(light.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AEC').length).toBeGreaterThanOrEqual(1);
    // Brand lama ("AEC ERP" + tile merah) tidak boleh tersisa di halaman login.
    expect(screen.queryByText('AEC ERP')).toBeNull();
  });

  it('gives every input an associated visible label', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/^Email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Password$/i)).toBeTruthy();
  });

  it('exposes the password visibility toggle as a pressed-state button', () => {
    renderWithProviders(<LoginPage />);
    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    const after = screen.getByRole('button', { name: /hide password/i });
    expect(after.getAttribute('aria-pressed')).toBe('true');
  });

  it('changes the password field type when toggled', () => {
    renderWithProviders(<LoginPage />);
    const pw = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(pw.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect((screen.getByLabelText(/^Password$/i) as HTMLInputElement).type).toBe('text');
  });

  it('shows validation errors programmatically linked to their field', async () => {
    renderWithProviders(<LoginPage />);
    // Pengguna nyata menekan "Sign in" dengan isian tidak valid.
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const invalid = await screen.findByLabelText(/^Email$/i);
    expect(invalid.getAttribute('aria-invalid')).toBe('true');
    const describedBy = invalid.getAttribute('aria-describedby');
    expect(describedBy).toBe('email-error');
    // `aria-describedby` harus menunjuk elemen yang benar-benar ada dan berisi pesan.
    const message = document.getElementById(describedBy!);
    expect(message).not.toBeNull();
    expect(message?.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it('autofills email and password from a demo chip', () => {
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect((screen.getByLabelText(/^Email$/i) as HTMLInputElement).value).toBe('admin@aec.local');
    expect((screen.getByLabelText(/^Password$/i) as HTMLInputElement).value).toBe('Admin123!');
  });

  it('drops internal jargon from the copy', () => {
    const { container } = renderWithProviders(<LoginPage />);
    expect(container.textContent).not.toMatch(/golden flow/i);
    expect(container.textContent).not.toMatch(/operating system/i);
  });

  it('has a single h1 ("Sign in") so mobile keeps a top-level heading', () => {
    renderWithProviders(<LoginPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toBe('Sign in');
  });

  it('renders the login background as decorative (alt="", aria-hidden)', () => {
    const { container } = renderWithProviders(<LoginPage />);
    const bg = container.querySelector('img[src="/bg-login.webp"]');
    expect(bg).not.toBeNull();
    expect(bg!.getAttribute('alt')).toBe('');
    expect(bg!.getAttribute('aria-hidden')).toBe('true');
  });

  it('announces a failed sign-in to assistive tech (role=alert)', () => {
    auth.isError = true;
    try {
      renderWithProviders(<LoginPage />);
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toMatch(/incorrect email or password/i);
    } finally {
      auth.isError = false;
    }
  });
});
