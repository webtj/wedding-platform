type SentryModule = typeof import('@sentry/nextjs');
type SentryOptions = Parameters<SentryModule['init']>[0];

let Sentry: SentryModule | null = null;
let sentryLoadAttempted = false;

async function loadSentry(): Promise<SentryModule | null> {
  if (sentryLoadAttempted) return Sentry;
  sentryLoadAttempted = true;
  try {
    Sentry = await import('@sentry/nextjs');
    return Sentry;
  } catch (err) {
    console.warn(
      '[instrumentation] @sentry/nextjs is not available, skipping Sentry init:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DISABLED) return;

  const sentry = await loadSentry();
  if (!sentry) return;

  const sentryOptions: SentryOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    spotlight: process.env.NODE_ENV === 'development',
    sendDefaultPii: true,
    tracesSampleRate: 1,
    debug: false
  };

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    sentry.init(sentryOptions);
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    sentry.init(sentryOptions);
  }
}
