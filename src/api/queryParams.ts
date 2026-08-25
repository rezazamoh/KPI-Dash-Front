// api/queryParams.ts

export interface Period {
  start: string | null;
  end: string | null;
}

export const buildQueryString = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (key === 'periods' && Array.isArray(value)) {
      value.forEach((period) => {
        const { start, end } = period as Period;

        // Ignore incomplete periods if that is your intended behavior
        if (start && end) {
          searchParams.append('periods', `${start},${end}`);
        }
      });

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
};