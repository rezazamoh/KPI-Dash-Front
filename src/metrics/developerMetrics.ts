import type { DeveloperSnapshotMetrics } from '@/types/developers';
import { formatDuration } from '@/utils/formatDuration';
import { formatPercent } from './types';
import type { MetricDefinition } from './types';

const repositoryCount = (
  metrics: DeveloperSnapshotMetrics,
): number => {
  const repoSet = new Set<string>();

  (metrics.projects ?? []).forEach((item) =>
    repoSet.add(item.project),
  );

  Object.values(
    metrics.changes_by_status_per_repo ?? {},
  ).forEach((repoMap) => {
    Object.keys(repoMap).forEach((repo) =>
      repoSet.add(repo),
    );
  });

  return repoSet.size;
};

const changeCount = (
  metrics: DeveloperSnapshotMetrics,
): number => (metrics.change_count ?? 0);

const formatCount = (value: number) => String(value ?? 0);

export const developerMetrics: readonly MetricDefinition<DeveloperSnapshotMetrics>[] = [
  {
    key: 'changes',
    label: 'Changes',
    value: changeCount,
    format: formatCount,
    card: {
      subtitle: (metrics) =>
        metrics.change_count
          ? `Across ${repositoryCount(metrics)} repositories`
          : 'No changes in selected scope',
      accent: 'primary.main',
    },
    comparison: {
      label: 'Changes',
      color: '#00bcd4',
      chart: true,
      format: (value) => String(value ?? 0),
    },
  },
  {
    key: 'avgPatchsets',
    label: 'Avg. patchsets',
    value: (metrics) => metrics.average_patchsets,
    format: (value) =>
      value != null ? value.toFixed(2) : '—',
    card: {
      subtitle: () => 'Per change',
      accent: 'secondary.main',
    },
    comparison: {
      label: 'Avg. patchsets',
      color: '#4caf50',
      chart: true,
      format: (value) =>
        value != null ? (value as number).toFixed(2) : '—',
    },
  },
  {
    key: 'patchsetGapTime',
    label: 'Patchset gap time',
    value: (metrics) =>
      metrics.patchset_gap_time?.mean ?? null,
    format: (value) =>
      value != null ? formatDuration(value) : '—',
    card: {
      subtitle: (metrics) =>
        metrics.patchset_gap_time
          ? 'Mean time between patchsets'
          : 'No data available',
      accent: 'success.main',
    },
    comparison: {
      label: 'Patchset gap time',
      color: '#673ab7',
      chart: true,
      format: (value) =>
        typeof value === 'number'
          ? formatDuration(value)
          : '—',
    },
  },
  {
    key: 'reviewResponse',
    label: 'Review response time',
    value: (metrics) =>
      metrics.reviewer_response_time?.mean ?? null,
    format: (value) =>
      value != null ? formatDuration(value) : '—',
    card: {
      subtitle: (metrics) =>
        metrics.reviewer_response_time
          ? 'Avg reviewer response time'
          : 'No data available',
      accent: 'success.main',
    },
    comparison: {
      label: 'Review response',
      color: '#00a000',
      chart: true,
      format: (value) =>
        typeof value === 'number'
          ? formatDuration(value)
          : '—',
    },
  },
  {
    key: 'leadTime',
    label: 'Lead time',
    value: (metrics) => metrics.lead_time?.mean ?? null,
    format: (value) =>
      value != null ? formatDuration(value) : '—',
    card: {
      subtitle: (metrics) =>
        metrics.lead_time ? 'Mean lead time' : 'No data available',
      accent: 'info.main',
    },
    comparison: {
      label: 'Lead time',
      color: '#ff9800',
      chart: true,
      format: (value) =>
        typeof value === 'number'
          ? formatDuration(value)
          : '—',
    },
  },
  {
    key: 'repositories',
    label: 'Repositories',
    value: (metrics) => metrics.projects?.length ?? 0,
    format: formatCount,
    comparison: {
      label: 'Repositories',
      color: '#9c27b0',
      chart: true,
      format: (value) => String(value ?? 0),
    },
  },
  {
    key: 'failureRate',
    label: 'Failure by label',
    value: (metrics) =>
      metrics.build_failure_rate?.by_label ?? {},
    format: (value) => {
      if (typeof value === 'number') return formatPercent(value as number, 2);
      const labels = value as Record<string, unknown>;
      return Object.keys(labels).length ? Object.keys(labels).join(', ') : '—';
    },
    comparison: {
      label: 'Failure by label',
      color: '#f44336',
      chart: true,
      chartGroup: 'Build failures',
      labelBreakdown: true,
      format: (value) => {
        const v = value as Record<string, unknown> | null;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          return Object.entries(v)
            .map(([k, val]) => `${k}: ${String((val as any)?.failed ?? val ?? '—')}`)
            .join(' · ');
        }
        return formatPercent(value as number | null, 2);
      },
    },
  },
  {
    key: 'reviewRequestsSent',
    label: 'Reviews sent',
    value: (metrics) =>
      metrics.review_requests_sent?.people.reduce(
        (sum, person) => sum + person.count,
        0,
      ) ?? 0,
    comparison: {
      label: 'Sent',
      color: '#2196f3',
      chart: true,
      chartGroup: 'Reviews',
      format: (value) => String(value ?? 0),
    },
  },
  {
    key: 'reviewRequestsReceived',
    label: 'Reviews received',
    value: (metrics) =>
      metrics.review_requests_received?.people.reduce(
        (sum, person) => sum + person.count,
        0,
      ) ?? 0,
    comparison: {
      label: 'Received',
      color: '#90caf9',
      chart: true,
      chartGroup: 'Reviews',
      format: (value) => String(value ?? 0),
    },
  },
  {
    key: 'commentsSent',
    label: 'Comments sent',
    value: (metrics) =>
      metrics.comments_sent?.people.reduce(
        (sum, person) => sum + person.count,
        0,
      ) ?? 0,
    comparison: {
      label: 'Sent',
      color: '#4caf50',
      chart: true,
      chartGroup: 'Comments',
      format: (value) => String(value ?? 0),
    },
  },
  {
    key: 'commentsReceived',
    label: 'Comments received',
    value: (metrics) =>
      metrics.comments_received?.people.reduce(
        (sum, person) => sum + person.count,
        0,
      ) ?? 0,
    comparison: {
      label: 'Received',
      color: '#a5d6a7',
      chart: true,
      chartGroup: 'Comments',
      format: (value) => String(value ?? 0),
    },
  },
];