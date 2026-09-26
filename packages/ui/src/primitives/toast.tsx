import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

const iconByVariant: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 shrink-0 text-destructive-500" aria-hidden="true" />,
  info: <Info className="h-4 w-4 shrink-0 text-info-500" aria-hidden="true" />,
};

const ToastContext = React.createContext<(opts: ToastOptions) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<(ToastOptions & { id: number })[]>([]);
  const nextId = React.useRef(0);

  const show = React.useCallback((opts: ToastOptions) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), opts.duration ?? 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-toast flex w-full max-w-sm flex-col gap-2 outline-none">
          {toasts.map((t) => (
            <ToastPrimitive.Root
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-md border bg-white p-3 shadow-lg',
                'data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down data-[swipe=end]:animate-slide-down',
                t.variant === 'success' && 'border-success-200',
                t.variant === 'error' && 'border-destructive-200',
                t.variant !== 'success' && t.variant !== 'error' && 'border-neutral-200',
              )}
            >
              <div className="mt-0.5">{iconByVariant[t.variant ?? 'info']}</div>
              <div className="flex-1">
                <ToastPrimitive.Title className="text-body-sm font-medium text-neutral-900">{t.title}</ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-body-sm text-neutral-500">{t.description}</ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                aria-label="Close notification"
                className="rounded p-1 text-neutral-400 transition-colors duration-fast hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          ))}
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export { ToastPrimitive };
