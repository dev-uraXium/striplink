import { mainDb } from './connection.js';

export const CHART_SOURCES = [
  'opencharts',
  'pfatc',
  'cephie',
  'celesbit',
  'chartfox',
] as const;
export type ChartSource = (typeof CHART_SOURCES)[number];
export type ChartSourceState = Record<ChartSource, boolean>;

export function isChartSource(value: unknown): value is ChartSource {
  return CHART_SOURCES.includes(value as ChartSource);
}

const SOURCE_CACHE_MS = 30_000;
let sourceCache: { state: ChartSourceState; at: number } | null = null;

export async function getChartSources(): Promise<ChartSourceState> {
  if (sourceCache && Date.now() - sourceCache.at < SOURCE_CACHE_MS) {
    return sourceCache.state;
  }
  const state = Object.fromEntries(
    CHART_SOURCES.map((source) => [source, true])
  ) as ChartSourceState;
  try {
    const rows = await mainDb
      .selectFrom('chart_source_settings')
      .select(['source', 'enabled'])
      .execute();
    for (const row of rows) {
      if (isChartSource(row.source)) state[row.source] = row.enabled;
    }
  } catch (error) {
    // Fail open: a settings outage shouldn't take every chart offline.
    console.error('[Charts] Could not read chart sources:', error);
    return state;
  }
  sourceCache = { state, at: Date.now() };
  return state;
}

export async function isChartSourceEnabled(source: ChartSource) {
  return (await getChartSources())[source];
}

export async function setChartSource(
  source: ChartSource,
  enabled: boolean,
  updatedBy: string
): Promise<ChartSourceState> {
  await mainDb
    .insertInto('chart_source_settings')
    .values({ source, enabled, updated_by: updatedBy })
    .onConflict((oc) =>
      oc
        .column('source')
        .doUpdateSet({ enabled, updated_by: updatedBy, updated_at: new Date() })
    )
    .execute();
  sourceCache = null;
  return getChartSources();
}
