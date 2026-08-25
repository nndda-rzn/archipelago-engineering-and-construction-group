import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@aec/api-contracts';
import { Button, Input, Label, cn } from '@aec/ui';
import { useLogin } from '@/features/auth';

export function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data);
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-xs">
        <div className="mb-6 text-center">
          <div className="text-h1 font-semibold tracking-tight text-racing-red-600" translate="no">
            AEC ERP
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">Enterprise Construction &amp; EPC Platform</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              spellCheck={false}
              placeholder="Masukkan password…"
              error={!!errors.password}
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-caption text-destructive-600">{errors.password.message}</p>}
          </div>

          {login.isError && (
            <p className="rounded-md border border-destructive-200 bg-destructive-50 px-3 py-2 text-body-sm text-destructive-700">
              Login gagal. Periksa email dan password Anda.
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" loading={login.isPending}>
            Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}
