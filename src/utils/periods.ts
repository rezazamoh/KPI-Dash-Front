import type { Period } from '@/types/periods';

export const normalizePeriods = (periods: Period[]) => {
  return periods.map((period) => {
    const value = period as any;

    return {
      start: value.start ?? value.start_date ?? value.from ?? null,
      end: value.end ?? value.end_date ?? value.to ?? null,
    };
  });
};