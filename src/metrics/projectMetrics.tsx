import { Chip, Link, Stack } from '@mui/material';
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

const reviewCount = (metrics: ProjectMetric): number =>
  countPeople(metrics.review_requests_sent?.people) +
  countPeople(metrics.review_requests_received?.people);

const commentCount = (metrics: ProjectMetric): number =>
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
): MetricDefinition<ProjectMetric> => ({
  key,
  label,
  detail: true,
  value: (metrics) => metrics.lead_time?.[field] ?? null,
  render: (_, value) => {
    const leadTime = value as LeadTimeValue | null;

    if (!leadTime) {
      return '—' as DisplayValue;
    }

    const text = formatDuration(leadTime.duration);

    return leadTime.url ? (
      <Link
        href={leadTime.url}
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
): MetricDefinition<ProjectMetric> => ({
  key,
  label,
  detail: true,
  value: (metrics) => metrics.patchset_gap_time?.[field] ?? null,
  render: (_, value) => {
    const gapTime = value as LeadTimeValue | null;

    if (!gapTime) {
      return '—' as DisplayValue;
    }

    const text = formatDuration(gapTime.duration);

    return gapTime.url ? (
      <Link
        href={gapTime.url}
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

interface FailureLabelStats {
  failed: number;
  total: number;
  failure_rate: number;
}

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
    key: 'leadTime',
    label: 'Lead time (avg)',
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
    label: 'Patchset gap time (avg)',
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
    key: 'reviews',
    label: 'Reviews',
    snapshot: true,
    value: (metrics) => reviewCount(metrics),
    format: (value) => String(value ?? 0),
    comparison: {
      label: 'Reviews',
      color: '#2196f3',
      chart: false,
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'comments',
    label: 'Comments',
    snapshot: true,
    value: (metrics) => commentCount(metrics),
    format: (value) => String(value ?? 0),
    comparison: {
      label: 'Comments',
      color: '#4caf50',
      chart: false,
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'reviewRequestsSent',
    label: 'Reviews sent',
    value: (metrics) => countPeople(metrics.review_requests_sent?.people),
    comparison: {
      label: 'Sent',
      color: '#2196f3',
      chart: true,
      chartGroup: 'Reviews',
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'reviewRequestsReceived',
    label: 'Reviews received',
    value: (metrics) => countPeople(metrics.review_requests_received?.people),
    comparison: {
      label: 'Received',
      color: '#90caf9',
      chart: true,
      chartGroup: 'Reviews',
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'commentsSent',
    label: 'Comments sent',
    value: (metrics) => countPeople(metrics.comments_sent?.people),
    comparison: {
      label: 'Sent',
      color: '#4caf50',
      chart: true,
      chartGroup: 'Comments',
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
  {
    key: 'commentsReceived',
    label: 'Comments received',
    value: (metrics) => countPeople(metrics.comments_received?.people),
    comparison: {
      label: 'Received',
      color: '#a5d6a7',
      chart: true,
      chartGroup: 'Comments',
      format: (value) => String(value ?? 0),
      aggregate: (_, values) => sumDefined(values as number[]),
    },
  },
];

export const projectMetricDetailDefs: readonly MetricDefinition<ProjectMetric>[] = [
    {
    key: 'changesFailureSummary',
    label: 'Changes with failures',
    detail: true,
    value: (metrics) => ({
      count: metrics.build_failure_rate?.changes_with_failures ?? 0,
      rate: metrics.build_failure_rate?.changes_failure_rate ?? null,
    } satisfies ChangesFailureSummary),
    render: (_, value) => {
      const summary = value as ChangesFailureSummary;

      return `${summary.count} (${formatPercent(summary.rate, 1)})`;
    },
  },
  {
    key: 'failureByLabel',
    label: 'Failure by label',
    detail: true,
    value: (metrics) =>
      metrics.build_failure_rate?.by_label ?? {},
    render: (_, value) => {
      const labels = value as Record<string, FailureLabelStats>;

      if (!Object.keys(labels).length) {
        return '—';
      }

      return (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ minWidth: 260 }}
        >
          {Object.entries(labels).map(([label, stats]) => (
            <Chip
              key={label}
              size="small"
              variant="outlined"
              label={`${label}: ${stats.failed}/${stats.total} (${formatPercent(stats.failure_rate, 1)})`}
            />
          ))}
        </Stack>
      );
    },
  },
  leadTimeDef('leadTimeMin', 'Lead time (fastest)', 'min'),
  leadTimeDef('leadTimeMax', 'Lead time (slowest)', 'max'),
  gapTimeDef('gapTimeMin', 'Gap time (fastest)', 'min'),
  gapTimeDef('gapTimeMax', 'Gap time (slowest)', 'max'),

];