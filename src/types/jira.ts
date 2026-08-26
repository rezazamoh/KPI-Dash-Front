export interface JiraProject {
  key: string;
  name: string;
}

export interface JiraProjectsResponse {
  live: boolean;
  projects: JiraProject[];
}

export interface JiraBoard {
  id: number;
  name: string;
}

export interface JiraBoardsResponse {
  project: string;
  live: boolean;
  boards: JiraBoard[];
}

export interface JiraPerformanceMetrics {
  total_issues: number;
  completed: number;
  open: number;
  completion_rate: number;
  bugs: number;
  bug_rate: number;
  average_issue_age: number | null;
  average_resolution_time: number | null;
  by_status: Record<string, number>;
  by_issue_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_assignee: Record<string, number>;
  by_reporter: Record<string, number>;
  by_component: Record<string, number>;
  by_label: Record<string, number>;
  by_fix_version: Record<string, number>;
}

export interface JiraPerformanceResponse {
  project: string;
  snapshot_time: string;
  live: boolean;
  filters: {
    boards: string[] | null;
    start_date: string | null;
    end_date: string | null;
  };
  performance: JiraPerformanceMetrics;
}

export interface JiraIssuesResponse {
  snapshot_time: string;
  live: boolean;
  filters: {
    project: string[] | null;
    boards: string[] | null;
    start_date: string | null;
    end_date: string | null;
  };
  count: number;
  issues: Array<Record<string, unknown>>;
}

export interface JiraIssueResponse {
  issue: string;
  snapshot_time: string;
  live: boolean;
  performance: JiraPerformanceMetrics;
}