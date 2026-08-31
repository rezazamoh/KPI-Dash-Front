import { PeriodResponse } from './periods';
import { DateRangeFilters, DeveloperCoreMetrics } from './metrics';

export interface DeveloperListResponse {
  filters: DateRangeFilters;
  developers: string[];
}

export interface DeveloperSnapshotMetrics extends DeveloperCoreMetrics {
  projects: Array<{ project: string; changes: number }>;
}

export interface DeveloperPerformanceMetrics {
  username: string;
  snapshot_time: string;
  live: boolean;
  filters: {
    repo: string[] | null;
    topic: string[] | null;
    start_date: string | null;
    end_date: string | null;
  };
  overall_performance: DeveloperSnapshotMetrics;
  grouped_by_repo?: Record<string, DeveloperSnapshotMetrics>;
  grouped_by_topic?: Record<string, DeveloperSnapshotMetrics>;
}

export type DeveloperDetailResponse = PeriodResponse<DeveloperPerformanceMetrics>[];