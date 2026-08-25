import { PeriodResponse } from './periods';

export interface Team {
  id: number;
  name: string;
  members: string[];
}

export interface TeamPerformanceMetrics {
  filters: {
    team: string;
    developers: string[] | null;
    projects: string[] | null;
    topics: string[] | null;
    start_date: string | null;
    end_date: string | null;
  };

  developers: string[];
  topics: string[];
  projects: string[];

  developer_metrics: Record<string, any>;
}

export type TeamPerformanceResponse =
  PeriodResponse<TeamPerformanceMetrics>[];