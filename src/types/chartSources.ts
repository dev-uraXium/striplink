export type ChartSourceKey =
  | 'opencharts'
  | 'pfatc'
  | 'cephie'
  | 'celesbit'
  | 'chartfox';
export type ChartSourceState = Record<ChartSourceKey, boolean>;
