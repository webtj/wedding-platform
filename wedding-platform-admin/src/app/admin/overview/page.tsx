'use client';

import { useEffect, useState } from 'react';
import { PlatformOverview } from './_components/platform-overview';
import { getPlatformOverview, type PlatformOverviewSummary } from './_lib/service';

export default function PlatformOverviewPage() {
  const [summary, setSummary] = useState<PlatformOverviewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPlatformOverview();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载失败');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <PlatformOverview summary={summary} error={error} />;
}
