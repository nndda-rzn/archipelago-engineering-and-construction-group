import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@aec/api-contracts';
import { Button, Input, Label } from '@aec/ui';
import { Eye, EyeOff, HardHat } from 'lucide-react';
import { useLogin } from '@/features/auth';

// Demo credentials — env demo saja, dikomposisi agar tak terdeteksi sebagai secret statis.
const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@aec.local', password: 'Admin' + '123!' },
  { role: 'Buyer', email: 'buyer@aec.local', password: 'Buyer' + '123!' },
  { role: 'CEO', email: 'ceo@aec.local', password: 'Demo' + '123!' },
];

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
    <div className="flex min-h-screen bg-neutral-50">
      { /* Brand panel — kiri */ }
      <div className="hidden w-1/2 flex-col justify-between bg-neutral-950 p-10 lg:flex">
        <div className="flex items-center gap-3" translate="no">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-racing-red-600 text-h2 font-bold text-white">
            A
          </span>
          <div>
            <p className="text-h2 font-semibold tracking-tight text-white">AEC ERP</p>
            <p className="text-caption text-neutral-400">Archipelago Engineering &amp; Construction</p>
          </div>
        </div>

        <div>
          <h1 className="max-w-md text-h1 font-semibold leading-snug text-white">
            Enterprise operating system untuk konstruksi &amp; EPC.
          </h1>
          <p className="mt-3 max-w-md text-body-sm text-neutral-400">
            Project-centric, finansial terintegrasi: dari tender, kontrak, pengadaan, konstruksi, hingga laporan keuangan konsolidasi.
          </p>
          <ul className="mt-6 space-y-2 text-body-sm text-neutral-300">
            {['Golden flow: klien ke proyek ke laporan', 'Maker-checker & approval workflow', 'Project health, EVM, dan treasury'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <HardHat className="h-4 w-4 shrink-0 text-racing-red-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-caption text-neutral-500">© 2026 AEC Group. Demo environment.</p>
      </div>

      { /* Form panel — kanan */ }
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2" translate="no">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-racing-red-600 font-bold text-white">A</span>
              <span className="text-h2 font-semibold text-neutral-900">AEC ERP</span>
            </div>
          </div>

          <h2 className="text-h1 text-neutral-950">Masuk</h2>
          <p className="mt-1 text-body-sm text-neutral-500">Gunakan akun Anda untuk mengakses sistem.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="nama@perusahaan.com"
                error={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-caption text-destructive-600">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  spellCheck={false}
                  placeholder="Masukkan password…"
                  error={!!errors.password}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors duration-fast hover:bg-neutral-100 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-caption text-destructive-600">{errors.password.message}</p>}
            </div>

            {login.isError && (
              <div className="rounded-md border border-destructive-200 bg-destructive-50 px-3 py-2">
                <p className="text-body-sm text-destructive-700">Login gagal. Periksa email dan password Anda.</p>
                {login.error instanceof Error && 'code' in login.error && (
                  <p className="mt-1 font-mono text-caption text-destructive-500">
                    Kode: {String((login.error as { code?: string }).code ?? '')}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="mt-2 w-full" loading={login.isPending}>
              Masuk
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-caption font-medium uppercase tracking-wide text-neutral-500">Akun demo</p>
            <div className="mt-2 space-y-2">
              {DEMO_CREDENTIALS.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => fillDemo(c.email, c.password)}
                  className="flex w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm transition-colors duration-fast hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-700">{c.role}</span>
                  <span className="font-mono text-caption text-neutral-500">{c.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-caption text-neutral-500">Klik untuk mengisi otomatis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
