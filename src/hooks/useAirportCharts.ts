import { useCallback, useEffect, useState } from 'react';
import { getChartsForAirport as getBundledCharts } from '../utils/acars';
import {
  fetchCelesbitCharts,
  fetchCephieCharts,
  type CelesbitChartIndex,
  type CephieChartIndex,
} from '../utils/fetch/charts';
import { useChartSources } from './useChartSources';
import {
  fetchOpenChartsIndex,
  type OpenChartsIndex,
} from '../utils/fetch/openCharts';
import {
  openChartsByAirport,
  fromBundled,
  fromCelesbit,
  fromCephie,
  type ChartEntry,
} from '../utils/chartCatalog';

function cachedLoader<T>(load: () => Promise<T | null>) {
  let promise: Promise<T | null> | null = null;
  return () => {
    if (!promise) {
      promise = load().then((result) => {
        if (!result) promise = null;
        return result;
      });
    }
    return promise;
  };
}

const loadIndex = cachedLoader<CelesbitChartIndex>(fetchCelesbitCharts);
const loadCephieIndex = cachedLoader<CephieChartIndex>(fetchCephieCharts);
const loadOpenCharts = cachedLoader<OpenChartsIndex>(fetchOpenChartsIndex);

export function useAirportCharts() {
  const [index, setIndex] = useState<CelesbitChartIndex | null>(null);
  const [cephieIndex, setCephieIndex] = useState<CephieChartIndex | null>(null);
  const [openCharts, setOpenCharts] = useState<Record<
    string,
    ChartEntry[]
  > | null>(null);
  const sources = useChartSources();

  useEffect(() => {
    let cancelled = false;
    loadOpenCharts().then((result) => {
      if (!cancelled && result) setOpenCharts(openChartsByAirport(result));
    });
    // Cephie and Celesbit charts are off in StripLink (openCharts only), so
    // their indexes are only fetched if those sources are ever switched back on.
    if (sources?.cephie)
      loadCephieIndex().then((result) => {
        if (!cancelled) setCephieIndex(result);
      });
    if (sources?.celesbit)
      loadIndex().then((result) => {
        if (!cancelled) setIndex(result);
      });
    return () => {
      cancelled = true;
    };
  }, [sources?.cephie, sources?.celesbit]);

  const getLocalCharts = useCallback(
    (icao: string): ChartEntry[] => {
      if (!sources) return [];
      const code = icao.toUpperCase();
      return [
        ...((sources.opencharts && openCharts?.[code]) || []),
        ...(sources.pfatc ? getBundledCharts(code) : []).map((chart) =>
          fromBundled(code, chart)
        ),
        ...((sources.cephie && cephieIndex?.[code]) || []).map((chart) =>
          fromCephie(code, chart)
        ),
        ...((sources.celesbit && index?.[code]) || []).map((plate) =>
          fromCelesbit(code, plate)
        ),
      ];
    },
    [index, cephieIndex, openCharts, sources]
  );

  return { getLocalCharts };
}
