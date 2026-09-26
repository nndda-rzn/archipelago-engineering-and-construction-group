import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ToastProvider } from '@aec/ui';
import { QueryProvider } from '@/app/providers/query-provider';
import { ErrorBoundary } from '@/app/providers/error-boundary';
import { routeTree } from './routeTree';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/700.css';
import './styles/globals.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ErrorBoundary label="aplikasi">
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>,
);
