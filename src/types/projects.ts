import { PeriodResponse } from './periods';
import { DateRangeFilters, DeveloperCoreMetrics } from './metrics';

export interface ProjectListResponse {
  filters: DateRangeFilters;
  projects: string[];
}

export interface ProjectDeveloperMetrics {
  [developer: string]: DeveloperCoreMetrics;
}

export interface ProjectPerformanceMetrics {
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

export type ProjectDetailResponse = PeriodResponse<ProjectPerformanceMetrics>[];