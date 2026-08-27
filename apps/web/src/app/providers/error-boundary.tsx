import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Label fallback (mis. nama route). */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/**
 * Error boundary — cegah satu error komponen mematikan seluruh halaman.
 * Tampilkan fallback + tombol reload. Mount sekali di app root.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive-50">
          <AlertTriangle className="h-6 w-6 text-destructive-500" aria-hidden="true" />
        </div>
        <div>
          <p className="text-body font-medium text-neutral-900">Terjadi kesalahan tak terduga{this.props.label ? ` di ${this.props.label}` : ''}</p>
          {this.state.message && <p className="mt-1 max-w-md text-body-sm text-neutral-500">{this.state.message}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            this.setState({ hasError: false, message: undefined });
          }}
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-body-sm font-medium text-neutral-700 transition-colors duration-fast hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Coba lagi
        </button>
      </div>
    );
  }
}
