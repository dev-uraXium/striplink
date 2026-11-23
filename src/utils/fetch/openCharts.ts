// openCharts (Coral Reef Studios) chart images, served by the StripLink Cloudflare
// Worker from cloudflare/public/charts/opencharts (rendered from the openCharts export).
export interface OpenChart {
  id: string;
  kind: 'area' | 'ground' | 'SID' | 'STAR' | string;
  icao?: string;
  region?: string;
  rw?: string;
  label: string;
  title: string;
}

export interface OpenChartsIndex {
  charts: OpenChart[];
  meta?: { regions?: { id: string; name: string }[] };
}

const BASE = '/charts/opencharts';

export function openChartUrl(id: string, size: 'full' | 'preview' = 'full') {
  return `${BASE}/${encodeURIComponent(id)}${size === 'preview' ? '.preview' : ''}.webp`;
}

export async function fetchOpenChartsIndex(): Promise<OpenChartsIndex | null> {
  try {
    const res = await fetch(`${BASE}/index.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as OpenChartsIndex;
    return Array.isArray(data.charts) ? data : null;
  } catch {
    return null;
  }
}
