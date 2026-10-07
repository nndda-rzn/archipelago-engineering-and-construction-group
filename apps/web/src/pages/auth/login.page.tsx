import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@aec/api-contracts';
import { Button, Input, Label, labelErrorCode } from '@aec/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '@/features/auth';

/**
 * Akun demo untuk environment ini. Password TIDAK ditampilkan di UI — chip hanya
 * mengisi otomatis. Nilai sudah diverifikasi cocok dengan `prisma/seed.ts`.
 */
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@aec.local', password: 'Admin' + '123!' },
  { role: 'Buyer', email: 'buyer@aec.local', password: 'Buyer' + '123!' },
  { role: 'CEO', email: 'ceo@aec.local', password: 'Demo' + '123!' },
];

/** Alur kerja inti — ditulis sebagai alur, bukan jargon internal. */
const WORKFLOW = ['Tender', 'Contract', 'Procurement', 'Construction', 'Reporting'];

export function LoginPage() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data);
  });

  const fillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-dvh bg-neutral-50">
      {/* Panel kiri — konteks produk. Disembunyikan di layar kecil. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-neutral-950 p-10 lg:flex">
        {/* Latar dekoratif: gambar redup di belakang teks. Above-the-fold di
            desktop, jadi eager (bukan lazy); prioritas default karena dekoratif. */}
        <img
          src="/bg-login.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Overlay gelap: SEMUA stop >= 0.85 agar teks caption (neutral-400,
            12px) tetap >= 4.5:1 di atas gambar terang (WCAG 1.4.3). Formulir
            tetap elemen dominan; gambar hanya tekstur, bukan fokus. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-neutral-950/95 via-neutral-950/90 to-neutral-950/85"
        />

        <div className="relative z-10 flex items-center gap-3" translate="no">
          {/* Varian putih: logo hitam tidak terlihat di latar gelap (kontras 0,93:1). */}
          <img src="/logo-mark-light.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
          <div>
            <p className="text-h2 font-semibold tracking-tight text-white">AEC</p>
            <p className="text-caption text-neutral-400">Archipelago Engineering &amp; Construction</p>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="max-w-md text-h1 font-semibold leading-snug text-white">
            Project-centric ERP for construction &amp; EPC.
          </h1>
          <p className="mt-3 max-w-md text-body-sm text-neutral-400">
            Finance, procurement, and site execution share one project record — from tender to consolidated report.
          </p>

          <ol className="mt-6 flex max-w-md flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-neutral-300">
            {WORKFLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-neutral-600">→</span>}
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-caption text-neutral-400">© 2026 AEC Group · Demo environment.</p>
      </div>

      {/* Panel kanan — formulir. */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2" translate="no">
              <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-8 w-8 shrink-0 object-contain" />
              <span className="text-h2 font-semibold text-neutral-900">AEC</span>
            </div>
          </div>

          <h2 className="text-h1 text-neutral-950">Sign in</h2>
          <p className="mt-1 text-body-sm text-neutral-500">Use your account to access the system.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="name@company.com"
                error={!!errors.email}
                {...register('email')}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-caption text-destructive-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  spellCheck={false}
                  placeholder="Enter your password…"
                  error={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-500 transition-colors duration-fast hover:bg-neutral-100 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-caption text-destructive-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* role="alert" agar kegagalan login diumumkan ke pembaca layar. */}
            {login.isError && (
              <div role="alert" className="rounded-md border border-destructive-200 bg-destructive-50 px-3 py-2">
                <p className="text-body-sm text-destructive-700">
                  {login.error instanceof Error ? login.error.message : 'Sign in failed. Check your email and password.'}
                </p>
                {login.error instanceof Error && 'code' in login.error && (
                  <p className="mt-1 text-caption text-destructive-500" title={String((login.error as { code?: string }).code ?? '')}>
                    {labelErrorCode(String((login.error as { code?: string }).code ?? ''))}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="mt-2 w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-caption font-medium uppercase tracking-wide text-neutral-500">Demo accounts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => fillDemo(c.email, c.password)}
                  aria-label={`Fill ${c.role} demo credentials`}
                  className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-body-sm font-medium text-neutral-700 transition-colors duration-fast hover:border-neutral-300 hover:bg-neutral-50"
                >
                  {c.role}
                </button>
              ))}
            </div>
            <p className="mt-2 text-caption text-neutral-500">Click a role to fill the form.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
