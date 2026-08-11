export interface ProjectListResponse {
  filters: {
    start_date: string | null;
    end_date: string | null;
    live: boolean | null;
  };
  projects: string[];
}

export interface ProjectDeveloperMetrics {
  [developer: string]: {
    change_count: number;
    changes_by_status_per_repo: Record<string, Record<string, number>>;
    average_patchsets: number;
    review_requests_received: {
      people: Array<{ username: string; count: number }>;
      stats: {
        per_person: { min: number; mean: number; max: number };
        per_change?: { min: number; mean: number; max: number } | null;
      } | null;
    };
    review_requests_sent: {
      people: Array<{ username: string; count: number }>;
      stats: {
        per_person: { min: number; mean: number; max: number };
        per_change?: { min: number; mean: number; max: number } | null;
      } | null;
    };
    comments_received: {
      people: Array<{ username: string; count: number }>;
      stats: {
        per_person: { min: number; mean: number; max: number };
        per_change?: { min: number; mean: number; max: number } | null;
      } | null;
    };
    comments_sent: {
      people: Array<{ username: string; count: number }>;
      stats: {
        per_person: { min: number; mean: number; max: number };
        per_change?: { min: number; mean: number; max: number } | null;
      } | null;
    };
    lead_time: {
      min: { hours: number; url?: string; change_number?: number };
      mean: number;
      max: { hours: number; url?: string; change_number?: number };
    } | null;
    reviewer_response_time: {
      min_hours: number;
      mean_hours: number;
      max_hours: number;
    } | null;
    build_failure_rate: {
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
    } | null;
  };
}

export interface ProjectDetailResponse {
  filters: {
    project: string;
    developers: string[] | null;
    topics: string[] | null;
    start_date: string | null;
    end_date: string | null;
    live: boolean;
  };
  developers: string[];
  topics: string[];
  developer_metrics: ProjectDeveloperMetrics;
}
