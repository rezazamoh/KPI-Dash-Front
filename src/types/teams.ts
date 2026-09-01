import { PeriodResponse } from './periods';

export interface Team {
  id: number;
  name: string;
  members: string[];
  projects: string[];
  default_teams?: string[];
}

export interface TeamPerformanceTeam {
  id: number;
  name: string;
  members: string[];
  projects: string[] | null;
}

export interface TeamPerformanceMetrics {
  filters: {
    team: TeamPerformanceTeam;
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