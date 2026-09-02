export interface LeadTimeValue {
  duration: number;
  url?: string;
  change_number?: number;
}

export interface DurationStats {
  min: number;
  mean: number;
  max: number;
}

export interface LeadDistributionBucket {
  min: number;
  max: number | null;
  count: number;
  density: number | null;
  change_numbers?: number[];
}

export interface GapDistributionBucket {
  min: number;
  max: number | null;
  count: number;
  density: number | null;
  change_numbers?: number[];
}

export interface DistributionBucket {
  min: number;
  max: number | null;
  count: number;
  density: number | null;
  change_numbers?: number[];
  change_patchsets?: Array<{
    change_number: number;
    patchset_number: number;
  }>;
}

export interface LeadTimeStats {
  min: LeadTimeValue;
  mean: number;
  max: LeadTimeValue;
  distribution: DistributionBucket[];
}

export interface GapTimeStats {
  min: LeadTimeValue;
  mean: number;
  max: LeadTimeValue;
  distribution: DistributionBucket[];
}

export interface FailureRateDetail {
  total_changes_with_builds: number;
  total_outcomes: number;
  failed_outcomes: number;
  overall_failure_rate: number;
  changes_with_failures: number;
  changes_failure_rate: number;
  by_label: Record
    string,
    {
      total: number;
      failed: number;
      failure_rate: number;
    }
  >;
}

export interface PeopleStats {
  people: Array<{ username: string; count: number }>;
  stats: {
    per_person: { min: number; mean: number; max: number };
    per_change?: { min: number; mean: number; max: number } | null;
  } | null;
}

/**
 * The core set of metrics computed for a developer, whether that's a
 * standalone snapshot (DeveloperSnapshotMetrics) or the per-developer
 * entry inside a project's aggregate view (ProjectDeveloperMetrics).
 */
export interface DeveloperCoreMetrics {
  change_count: number;
  changes_by_status_per_repo: Record<string, Record<string, number>>;
  average_patchsets: number;
  review_requests_received: PeopleStats;
  review_requests_sent: PeopleStats;
  comments_received: PeopleStats;
  comments_sent: PeopleStats;
  lead_time: LeadTimeStats | null;
  reviewer_response_time: DurationStats | null;
  build_failure_rate: FailureRateDetail | null;
  patchset_gap_time: GapTimeStats | null;
}

export interface DateRangeFilters {
  start_date: string | null;
  end_date: string | null;
  live: boolean | null;
}