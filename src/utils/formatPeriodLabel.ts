export type PeriodLike = {
  start?: string | null;
  end?: string | null;
} | null | undefined;

const formatDate = (value: string | null) => {
  if (!value) {
    return 'Any';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatPeriodLabel = (
  period: PeriodLike,
  index: number,
) => {
  if (!period) {
    return `Period ${index + 1}`;
  }

  const start = period.start ?? null;
  const end = period.end ?? null;

  if (!start && !end) {
    return `Period ${index + 1}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
};

export const formatPeriodLabelShort = (
  period: PeriodLike,
  index: number,
) => {
  if (!period) {
    return `P${index + 1}`;
  }

  const start = period.start ?? null;
  const end = period.end ?? null;

  if (!start && !end) {
    return `P${index + 1}`;
  }

  const formatDateShort = (value: string | null) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return start || end
    ? `${formatDateShort(start)} – ${formatDateShort(end)}`
    : `P${index + 1}`;
};