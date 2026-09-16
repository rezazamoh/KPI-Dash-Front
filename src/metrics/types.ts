import type { ReactNode } from 'react';
import type { Period, PeriodResponse } from '@/types/periods';

export type DisplayValue = string | number | null | ReactNode;

/**
 * Presentation options for the cross-period comparison view.
 * `aggregate` combines the per-row values extracted from each item
 * (used when a period contains a collection, e.g. project developers).
 * When omitted, the first item's value is used (single-metric periods).
 */
export interface ComparisonOptions<M, V = unknown> {
  label?: string;
  color: string;
  chart?: boolean;
  chartGroup?: string;
  labelBreakdown?: boolean;
  format: (value: unknown | null) => string;
  aggregate?: (items: M[], values: V[]) => V | null;
}

/**
 * The single source of truth for a metric. Registering a metric here
 * makes it appear automatically wherever the matching target flag is set:
 *
 *  - `card`       -> header metric card row (auto-sized)
 *  - `snapshot`   -> main per-item metrics table
 *  - `detail`     -> detailed metrics table
 *  - `comparison` -> period comparison table + charts
 */
export interface MetricDefinition<M, V = unknown> {
  key: string;
  label: string;
  value: (metrics: M) => V;
  format?: (value: V) => DisplayValue;
  render?: (metrics: M, value: V) => DisplayValue;
  card?: {
    subtitle?: (metrics: M) => string | undefined;
    accent?: string;
  };
  snapshot?: boolean;
  detail?: boolean;
  comparison?: ComparisonOptions<M, V>;
}

export const cardDefinitions = <M,>(
  defs: readonly MetricDefinition<M>[],
): MetricDefinition<M>[] => defs.filter((def) => def.card);

export const comparisonDefinitions = <M,>(
  defs: readonly MetricDefinition<M>[],
): MetricDefinition<M>[] => defs.filter((def) => def.comparison);

export const snapshotDefinitions = <M,>(
  defs: readonly MetricDefinition<M>[],
): MetricDefinition<M>[] => defs.filter((def) => def.snapshot);

export const detailDefinitions = <M,>(
  defs: readonly MetricDefinition<M>[],
): MetricDefinition<M>[] => defs.filter((def) => def.detail);

export const metricColumns = <M,>(
  defs: readonly MetricDefinition<M>[],
): Array<{ key: string; label: string }> =>
  defs.map((def) => ({ key: def.key, label: def.label }));

export const buildMetricRow = <M,>(
  metrics: M,
  defs: readonly MetricDefinition<M>[],
): Record<string, DisplayValue> => {
  const row: Record<string, DisplayValue> = {};

  defs.forEach((def) => {
    const value = def.value(metrics);

    row[def.key] = def.render
      ? def.render(metrics, value)
      : def.format
        ? def.format(value)
        : ((value as unknown as DisplayValue) ?? null);
  });

  return row;
};

export interface ComparisonRow {
  period: { start: string | null; end: string | null } | null;
  index: number;
  values: Record<string, unknown | null>;
}

export const buildComparisonRows = <T, M>(
  periodResults: PeriodResponse<T>[],
  periods: Period[],
  selectMetrics: (metrics: T) => M[],
  defs: readonly MetricDefinition<M>[],
): ComparisonRow[] =>
  periodResults.map((result, index) => {
    const items = selectMetrics(result.metrics);

    const values: Record<string, unknown | null> = {};

    defs.forEach((def) => {
      if (!def.comparison) {
        return;
      }

      if (def.comparison.aggregate) {
        const extracted = items.map((item) =>
          def.value(item),
        );

        values[def.key] = def.comparison.aggregate(
          items,
          extracted,
        );
      } else {
        values[def.key] =
          items.length > 0
            ? def.value(items[0])
            : null;
      }
    });

    const period = result.start || result.end
      ? result
      : periods[index] ?? null;

    return { period, index, values };
  });

export const formatPercent = (
  value: number | null | undefined,
  decimals = 1,
): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(decimals)}%`;
};

export const sumDefined = (
  values: Array<number | null | undefined>,
): number => values.reduce((sum, value) => sum + (value ?? 0), 0);

export const meanDefined = (
  values: Array<number | null | undefined>,
): number | null => {
  const present = values.filter(
    (value): value is number => typeof value === 'number',
  );

  if (!present.length) {
    return null;
  }

  return present.reduce((sum, value) => sum + value, 0) / present.length;
};