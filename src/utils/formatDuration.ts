export const formatDuration = (
  seconds: number | null | undefined,
): string => {
  if (
    typeof seconds !== 'number' ||
    Number.isNaN(seconds) ||
    seconds < 0
  ) {
    return '—';
  }

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);

  return parts.length > 0 ? parts.join(' ') : '<1m';
};
