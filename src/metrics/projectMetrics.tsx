import { Link } from '@mui/material';
import type {
  ProjectDeveloperMetrics,
} from '@/types/projects';
import { formatDuration } from '@/utils/formatDuration';
import { formatPercent, meanDefined, sumDefined } from './types';
import type {
  DisplayValue,
  MetricDefinition,
} from './types';

type ProjectMetric = ProjectDeveloperMetrics[string];

const countPeople = (
  people: Array<{
    username: string;
    count: number;
  }> | null | undefined,
): number =>
  people?.reduce((sum, item) => sum + item.count, 0) ?? 0;

const interactionCount = (metrics: ProjectMetric): number =>
  countPeople(metrics.review_requests_sent?.people) +
  countPeople(metrics.review_requests_received?.people) +
  countPeople(metrics.comments_sent?.people) +
  countPeople(metrics.comments_received?.people);

interface LeadTimeValue {
  duration: number;
  url?: string;
  change_number?: number;
}

const leadTimeDef = (
  key: string,
  label: string,
  field: 'min' | 'max',
): MetricDefinition<ProjectMetric, LeadTimeValue | null> => ({
  key,
  label,
  detail: true,
  value: (metrics) => metrics.lead_time?.[field] ?? null,
  render: (_, value) => {
    if (!value) {
      return '—' as DisplayValue;
    }

    const text = formatDuration(value.duration);

    return value.url ? (
      <Link
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
      >
        {text}
      </Link>
    ) : (
      text
    );
  },
});

const gapTimeDef = (
  key: string,
  label: string,
  field: 'min' | 'max',
): MetricDefinition<ProjectMetric, LeadTimeValue | null> => ({
  key,
  label,
  detail: true,
  value: (metrics) => metrics.patchset_gap_time?.[field] ?? null,
  render: (_, value) => {
    if (!value) {
      return '—' as DisplayValue;
    }

    const text = formatDuration(value.duration);

    return value.url ? (
      <Link
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
      >
        {text}
      </Link>
    ) : (
      text
    );
  },
});

const formatDurationDef = (value: unknown): string =>
  typeof value === 'number' ? formatDuration(value) : '—';

/**
 * Single registry for per-developer metrics inside a project/team period.
 * Registering a metric here makes it appear automatically in the snapshot
 * table (`snapshot`), the detailed table (`detail`) and the cross-period
 * comparison (`comparison`).
 */
export const projectMetricDefs: readonly MetricDefinition<ProjectMetric>[] = [
  {
    key: 'changeCount',
    label: 'Changes',
    snapshot: true,
    value: (metrics) => metrics.change_count ?? 0,
    format: (value) => String(value ?? 0),
    comparison: {
      label: 'Changes',
      color: '#00bcd4',
      chart: true,
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'developers',
    label: 'Developers',
    value: () => 1,
    comparison: {
      label: 'Developers',
      color: '#9c27b0',
      chart: true,
      format: (value) => String(value ?? 0),
      aggregate: (items) => items.length,
    },
  },
  {
    key: 'patchsetsRaw',
    label: 'Avg patchsets',
    snapshot: true,
    value: (metrics) => metrics.average_patchsets ?? 0,
    format: (value) =>
      typeof value === 'number' ? value.toFixed(2) : '—',
    comparison: {
      label: 'Avg patchsets per change',
      color: '#4caf50',
      chart: true,
      format: (value) =>
        typeof value === 'number' ? value.toFixed(2) : '—',
      aggregate: (_, values) => meanDefined(values as number[]),
    },
  },
  {
    key: 'failureRateRaw',
    label: 'Failure rate',
    snapshot: true,
    value: (metrics) =>
      metrics.build_failure_rate?.overall_failure_rate ?? null,
    format: (value) => formatPercent(value as number, 1),
    comparison: {
      label: 'Failure rate (%)',
      color: '#f44336',
      chart: true,
      format: (value) => formatPercent(value as number | null, 1),
      aggregate: (_, values) => meanDefined(values as number[]),
    },
  },
  {
    key: 'leadTime',
    label: 'Lead time',
    snapshot: true,
    value: (metrics) => metrics.lead_time?.mean ?? null,
    format: formatDurationDef,
    comparison: {
      label: 'Lead time',
      color: '#ff9800',
      chart: true,
      format: formatDurationDef,
      aggregate: (_, values) => meanDefined(values as number[]),
    },
  },
  {
    key: 'patchsetGapTime',
    label: 'Patchset gap time',
    snapshot: true,
    value: (metrics) => metrics.patchset_gap_time?.mean ?? null,
    format: formatDurationDef,
    comparison: {
      label: 'Patchset gap time',
      color: '#673ab7',
      chart: true,
      format: formatDurationDef,
      aggregate: (_, values) => meanDefined(values as number[]),
    },
  },
  {
    key: 'interactions',
    label: 'Interactions',
    snapshot: true,
    value: (metrics) => interactionCount(metrics),
    format: (value) => String(value ?? 0),
    comparison: {
      label: 'Interactions',
      color: '#e91e63',
      chart: true,
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
];

export const projectMetricDetailDefs: readonly MetricDefinition<ProjectMetric>[] = [
  {
    key: 'changesFailureRate',
    label: 'Changes failure rate',
    detail: true,
    value: (metrics) =>
      metrics.build_failure_rate?.changes_failure_rate ?? null,
    format: (value) => formatPercent(value as number, 1),
  },
  {
    key: 'changesWithFailures',
    label: 'Changes w/ failures',
    detail: true,
    value: (metrics) =>
      metrics.build_failure_rate?.changes_with_failures ?? 0,
  },
  {
    key: 'failedOutcomes',
    label: 'Failed outcomes',
    detail: true,
    value: (metrics) =>
      metrics.build_failure_rate?.failed_outcomes ?? 0,
  },
  {
    key: 'totalOutcomes',
    label: 'Total outcomes',
    detail: true,
    value: (metrics) =>
      metrics.build_failure_rate?.total_outcomes ?? 0,
  },
  leadTimeDef('leadTimeMin', 'Lead time (fastest)', 'min'),
  leadTimeDef('leadTimeMax', 'Lead time (slowest)', 'max'),
  gapTimeDef('gapTimeMin', 'Gap time (fastest)', 'min'),
  gapTimeDef('gapTimeMax', 'Gap time (slowest)', 'max'),

];