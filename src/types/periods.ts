export interface Period {
  start: string | null;
  end: string | null;
}

export interface PeriodResponse<T> {
  start: string | null;
  end: string | null;
  change_numbers?: Array<{ change_number: number; title?: string }>;
  metrics: T;
}

export interface PeriodicResponse<T, O = T> {
  periods: PeriodResponse<T>[];
  overall_performance: O;
}