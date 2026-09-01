import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@aec/ui';
import { useMe, useLogout } from '@/features/auth';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: me } = useMe();
  const logout = useLogout();

  const displayName = me?.displayName ?? me?.email?.split('@')[0] ?? 'Pengguna';
  const initial = (displayName.charAt(0) ?? '?').toUpperCase();

  return (
    <div className={cn('relative flex items-center', className)}>
      <button
        type="button"
        onClick={() => setUserMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={userMenuOpen}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors duration-fast hover:bg-neutral-100"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-racing-red-600 text-body-sm font-medium text-white"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="text-body-sm font-medium text-neutral-800">{displayName}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-neutral-400 transition-transform duration-fast', userMenuOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {userMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-dropdown mt-1 w-56 rounded-md border border-neutral-200 bg-white p-1 shadow-md"
        >
          <div className="border-b border-neutral-100 px-3 py-2">
            <p className="text-body-sm font-medium text-neutral-900">{displayName}</p>
            <p className="truncate text-caption text-neutral-500">{me?.email}</p>
          </div>
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {(me?.roles ?? []).map((r) => (
              <span key={r} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-neutral-600">
                {r}
              </span>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-body-sm text-destructive-600 transition-colors duration-fast hover:bg-destructive-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
