import {
  Bar,
  BarChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  Typography,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { GapTimeStats } from '@/types/metrics';
import { formatDuration } from '@/utils/formatDuration';

interface GapDistributionChartProps {
  data?: GapTimeStats | null;
  title?: string;
  height?: number;
  series?: Array<{
    key: string;
    name: string;
    color: string;
    stats: GapTimeStats | null;
  }>;
}

interface ChartRow {
  bucketKey: string;
  label: string;
  count: number;
  isOpenEnded: boolean;
  min: number;
  changeNumbers: number[];
  changePatchsets: Array<{ change_number: number; patchset_number: number }>;
  value?: number;
  [key: string]: number | string | boolean | number[] | Array<{ change_number: number; patchset_number: number }> | undefined;
}

const getBucketKey = (min: number, max: number | null): string =>
  `${min}:${max ?? 'inf'}`;

const getBucketLabel = (min: number, max: number | null): string => {
  if (max === null) {
    return `> ${formatDuration(min)}`;
  }

  return `${formatDuration(min)} – ${formatDuration(max)}`;
};

const getChangeNumbers = (
  bucket: { change_numbers?: number[] } | null | undefined,
): number[] =>
  Array.isArray(bucket?.change_numbers)
    ? bucket.change_numbers.filter((value) => Number.isFinite(value))
    : [];

const getChangePatchsets = (
  bucket: { change_patchsets?: Array<{ change_number: number; patchset_number: number }> } | null | undefined,
): Array<{ change_number: number; patchset_number: number }> =>
  Array.isArray(bucket?.change_patchsets)
    ? bucket.change_patchsets.filter(
        (value) =>
          Number.isFinite(value.change_number) &&
          Number.isFinite(value.patchset_number),
      )
    : [];

const sortBuckets = <T extends { min: number; max: number | null; count: number }>(
  buckets: T[],
): T[] =>
  [...buckets]
    .filter((bucket) => bucket.count > 0)
    .sort((left, right) => {
      if (left.max === null && right.max !== null) {
        return 1;
      }

      if (left.max !== null && right.max === null) {
        return -1;
      }

      return left.min - right.min;
    });

const formatTooltipContent = (row: ChartRow | undefined) => {
  if (!row) {
    return null;
  }

  return (
    <Box sx={{ p: 1, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">
        {row.label}
      </Typography>
      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
        Count: {row.count}
      </Typography>
      {row.changeNumbers.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Click to expand
        </Typography>
      ) : null}
    </Box>
  );
};

export const GapDistributionChart = ({
  data,
  title = 'Gap time distribution',
  height = 260,
  series,
}: GapDistributionChartProps) => {
  const theme = useTheme();
  const [expandedBucketKey, setExpandedBucketKey] = useState<string | null>(null);

  const chartSeries = series && series.length > 0
    ? series.filter((entry) => entry.stats && entry.stats.distribution.length > 0)
    : data && data.distribution.length > 0
      ? [{ key: 'selected', name: 'Selected developers', color: theme.palette.primary.main, stats: data }]
      : [];

  const rows = useMemo<ChartRow[]>(() => {
    if (chartSeries.length === 0) {
      return [];
    }

    if (chartSeries.length === 1) {
      return sortBuckets(chartSeries[0].stats?.distribution ?? []).map((bucket) => ({
        bucketKey: getBucketKey(bucket.min, bucket.max),
        label: getBucketLabel(bucket.min, bucket.max),
        count: bucket.count,
        value: bucket.count,
        isOpenEnded: bucket.max === null,
        min: bucket.min,
        changeNumbers: getChangeNumbers(bucket),
        changePatchsets: getChangePatchsets(bucket),
      }));
    }

    const bucketMap = new Map<string, { min: number; max: number | null; count: number; changeNumbers: number[]; changePatchsets: Array<{ change_number: number; patchset_number: number }> }>();

    chartSeries.forEach(({ stats }) => {
      if (!stats) {
        return;
      }

      stats.distribution.forEach((bucket) => {
        const key = getBucketKey(bucket.min, bucket.max);
        const existing = bucketMap.get(key);
        const changeNumbers = getChangeNumbers(bucket);
        const changePatchsets = getChangePatchsets(bucket);

        if (existing) {
          existing.count += bucket.count;
          existing.changeNumbers = Array.from(new Set([...existing.changeNumbers, ...changeNumbers]));
          existing.changePatchsets = Array.from(
            new Map(
              [...existing.changePatchsets, ...changePatchsets].map((patchset) => [
                `${patchset.change_number}:${patchset.patchset_number}`,
                patchset,
              ]),
            ).values(),
          );
          return;
        }

        bucketMap.set(key, {
          min: bucket.min,
          max: bucket.max,
          count: bucket.count,
          changeNumbers,
          changePatchsets,
        });
      });
    });

    return Array.from(bucketMap.values())
      .map((bucket) => ({
        bucketKey: getBucketKey(bucket.min, bucket.max),
        label: getBucketLabel(bucket.min, bucket.max),
        count: bucket.count,
        isOpenEnded: bucket.max === null,
        min: bucket.min,
        changeNumbers: bucket.changeNumbers,
        changePatchsets: bucket.changePatchsets,
      }))
      .filter((row) => row.count > 0)
      .sort((left, right) => {
        if (left.isOpenEnded && !right.isOpenEnded) {
          return 1;
        }

        if (!left.isOpenEnded && right.isOpenEnded) {
          return -1;
        }

        return left.min - right.min;
      });
  }, [chartSeries]);

  const expandedRow = rows.find((row) => row.bucketKey === expandedBucketKey) ?? null;

  if (chartSeries.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Not enough data to show a distribution.
        </Typography>
      </Box>
    );
  }

  const renderBarCell = (row: ChartRow, color: string) => (
    <Cell
      key={`${row.bucketKey}-${color}`}
      fill={row.isOpenEnded ? theme.palette.warning.main : color}
      fillOpacity={row.isOpenEnded ? 0.7 : 1}
      style={{ cursor: row.changeNumbers.length > 0 ? 'pointer' : 'default' }}
      onClick={() => {
        if (row.changeNumbers.length > 0) {
          setExpandedBucketKey(row.bucketKey);
        }
      }}
    />
  );

  const renderDialog = () => (
    <Dialog open={Boolean(expandedRow)} onClose={() => setExpandedBucketKey(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{expandedRow ? expandedRow.label : 'Change numbers'}</DialogTitle>
      <DialogContent>
        {expandedRow && expandedRow.changePatchsets.length > 0 ? (
          <List dense>
            {expandedRow.changePatchsets.map(({ change_number: changeNumber, patchset_number: patchsetNumber }) => (
              <ListItem key={`${changeNumber}-${patchsetNumber}`} disableGutters>
                <Typography component="span" sx={{ mr: 1 }}>
                  Patchset {patchsetNumber}:
                </Typography>
                <Link
                  href={`https://gerrit.sinacomsys.local/${changeNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                >
                  {changeNumber}
                </Link>
              </ListItem>
            ))}
          </List>
        ) : expandedRow && expandedRow.changeNumbers.length > 0 ? (
          <List dense>
            {expandedRow.changeNumbers.map((changeNumber) => (
              <ListItem key={changeNumber} disableGutters>
                <Link
                  href={`https://gerrit.sinacomsys.local/${changeNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                >
                  {changeNumber}
                </Link>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No change numbers available for this bucket.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );

  if (chartSeries.length === 1) {
    return (
      <>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            {title}
          </Typography>

          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  return formatTooltipContent(payload[0].payload as ChartRow);
                }}
              />
              {chartSeries.length > 1 ? <Legend wrapperStyle={{ paddingTop: 8 }} /> : null}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {rows.map((row) => renderBarCell(row, chartSeries[0].color))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
        {renderDialog()}
      </>
    );
  }

  const aggregatedRows = Array.from(
    new Map(
      chartSeries.flatMap(({ stats }) =>
        (stats?.distribution ?? []).map((bucket) => {
          const key = getBucketKey(bucket.min, bucket.max);
          return [key, {
            bucketKey: key,
            label: getBucketLabel(bucket.min, bucket.max),
            count: 0,
            isOpenEnded: bucket.max === null,
            min: bucket.min,
            changeNumbers: getChangeNumbers(bucket),
            changePatchsets: getChangePatchsets(bucket),
          } as ChartRow];
        }),
      ),
    ).values(),
  )
    .map((row) => {
      const aggregated: ChartRow = {
        ...row,
        count: 0,
        changeNumbers: [...row.changeNumbers],
        changePatchsets: [...(row.changePatchsets ?? [])],
      };

      chartSeries.forEach(({ key: seriesKey, stats }) => {
        const bucket = stats?.distribution.find(
          (entry) => getBucketKey(entry.min, entry.max) === row.bucketKey,
        );

        const value = bucket?.count ?? 0;
        aggregated[seriesKey] = value;
        aggregated.count += value;
        aggregated.changeNumbers = Array.from(
          new Set([...aggregated.changeNumbers, ...getChangeNumbers(bucket)]),
        );
        aggregated.changePatchsets = Array.from(
          new Map(
            [...aggregated.changePatchsets, ...getChangePatchsets(bucket)].map((patchset) => [
              `${patchset.change_number}:${patchset.patchset_number}`,
              patchset,
            ]),
          ).values(),
        );
      });

      return aggregated;
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => left.min - right.min);

  return (
    <>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          {title}
        </Typography>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={aggregatedRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={40} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return formatTooltipContent(payload[0].payload as ChartRow);
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 8 }} />
            {chartSeries.map(({ key, name, color }) => (
              <Bar key={key} dataKey={key} name={name} fill={color} radius={[4, 4, 0, 0]}>
                {aggregatedRows.map((row) => renderBarCell(row, color))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {renderDialog()}
    </>
  );
};