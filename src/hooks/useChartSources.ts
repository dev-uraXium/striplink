import { useEffect, useState } from 'react';
import { clientApiUrl } from '../utils/clientApiBase';
import type { ChartSourceState } from '../types/chartSources';

// StripLink only shows openCharts. The other sources stay off whatever the
// admin chart-source switches say.
const ALL_ON: ChartSourceState = {
  opencharts: true,
  pfatc: false,
  cephie: false,
  celesbit: false,
  chartfox: false,
};

let request: Promise<ChartSourceState> | null = null;

function loadSources() {
  request ??= fetch(clientApiUrl('/api/charts/sources'))
    .then((res) => (res.ok ? res.json() : { sources: ALL_ON }))
    .then((data: { sources?: Partial<ChartSourceState> }) => ({
      ...ALL_ON,
      opencharts: data.sources?.opencharts ?? true,
    }))
    .catch(() => {
      request = null;
      return ALL_ON;
    });
  return request;
}

export function useChartSources() {
  const [sources, setSources] = useState<ChartSourceState | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadSources().then((state) => {
      if (!cancelled) setSources(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return sources;
}
