import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react';
import { AuthProvider } from './hooks/auth/AuthProvider.tsx';
import { DataProvider } from './hooks/data/DataProvider.tsx';
import { SettingsProvider } from './hooks/settings/SettingsProvider.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import PostHogErrorFallback from './components/PostHogErrorFallback.tsx';

const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-01-30',
  persistence: 'memory' as const,
  errorTracking: {
    autocaptureExceptions: true,
  },
} as const;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;

const app = (
  <PostHogErrorBoundary fallback={PostHogErrorFallback}>
    <AuthProvider>
      <DataProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </DataProvider>
    </AuthProvider>
    <Toaster position="top-right" />
  </PostHogErrorBoundary>
);

// StripLink: analytics only when you configure your own PostHog project
createRoot(document.getElementById('root')!).render(
  posthogKey ? (
    <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
      {app}
    </PostHogProvider>
  ) : (
    app
  )
);
