import { PeriodResponse } from './periods';
export interface DeveloperListResponse {
  filters: {
    start_date: string | null;
    end_date: string | null;
    live: boolean | null;
  };
  developers: string[];
}

export interface LeadTimeValue {
  duration: number;
  url?: string;
  change_number?: number;
}

export interface FailureRateDetail {
  total_changes_with_builds: number;
  total_outcomes: number;
  failed_outcomes: number;
  overall_failure_rate: number;
  changes_with_failures: number;
  changes_failure_rate: number;
  by_label: Record<string, {
    total: number;
    failed: number;
    failure_rate: number;
  }>;
}

export interface PeopleStats {
  people: Array<{ username: string; count: number }>;
  stats: {
    per_person: { min: number; mean: number; max: number };
    per_change?: { min: number; mean: number; max: number } | null;
  } | null;
}

export interface DeveloperSnapshotMetrics {
  change_count: number;
  projects: Array<{ project: string; changes: number }>;
  changes_by_status_per_repo: Record<string, Record<string, number>>;
  average_patchsets: number;
  review_requests_received: PeopleStats;
  review_requests_sent: PeopleStats;
  comments_received: PeopleStats;
  comments_sent: PeopleStats;
  lead_time: {
    min: LeadTimeValue;
    mean: number;
    max: LeadTimeValue;
  } | null;
  reviewer_response_time: {
    min: number;
    mean: number;
    max: number;
  } | null;
  build_failure_rate: FailureRateDetail | null;
  patchset_gap_time: {
    min: LeadTimeValue;
    mean: number;
    max: LeadTimeValue;
  } | null;
}

export interface DeveloperPerformanceMetrics  {
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

export type DeveloperDetailResponse =
  PeriodResponse<DeveloperPerformanceMetrics>[];