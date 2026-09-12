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
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { DistributionBucket, GapTimeStats } from '@/types/metrics';
import { formatDuration } from '@/utils/formatDuration';

interface GapDistributionChartProps {
  data?: GapTimeStats | DistributionBucket[] | null;
  title?: string;
  height?: number;
  valueFormat?: 'duration' | 'count';
  series?: Array<{
    key: string;
    name: string;
    color: string;
    stats: GapTimeStats | DistributionBucket[] | null;
  }>;
}

interface ChartRow {
  bucketKey: string;
  label: string;
  count: number;
  isOpenEnded: boolean;
  min: number;
  changeNumbers: number[];
  changeDetails: ChangeDetail[];
  changePatchsets: ChangePatchset[];
  value?: number;
  [key: string]: unknown;
}

type ChangeNumberEntry = number | { change_number: number; title?: string };
type ChangeDetail = { change_number: number; title?: string; developer?: string; color?: string };
type ChangePatchset = { change_number: number; patchset_number: number; title?: string; developer?: string; color?: string };

const getBucketKey = (min: number, max: number | null): string =>
  `${min}:${max ?? 'inf'}`;

const getBucketLabel = (min: number, max: number | null): string => {
  if (max === null) {
    return `> ${formatDuration(min)}`;
  }

  return `${formatDuration(min)} – ${formatDuration(max)}`;
};

const getDistribution = (
  stats: GapTimeStats | DistributionBucket[] | null | undefined,
): DistributionBucket[] => Array.isArray(stats) ? stats : stats?.distribution ?? [];

const getBucketLabelForFormat = (
  min: number,
  max: number | null,
  valueFormat: 'duration' | 'count',
) => valueFormat === 'count'
  ? `${min}${max === null ? '+' : ` – ${max}`}`
  : getBucketLabel(min, max);

const getChangeNumbers = (
  bucket: { change_numbers?: ChangeNumberEntry[] } | null | undefined,
): number[] =>
  Array.isArray(bucket?.change_numbers)
    ? bucket.change_numbers
        .map((value) => (typeof value === 'number' ? value : value.change_number))
        .filter((value) => Number.isFinite(value))
    : [];

const getChangeDetails = (
  bucket: { change_numbers?: ChangeNumberEntry[] } | null | undefined,
  developer?: string,
  color?: string,
): ChangeDetail[] =>
  Array.isArray(bucket?.change_numbers)
    ? bucket.change_numbers
        .map((value) => ({
          ...(typeof value === 'number' ? { change_number: value } : value),
          developer,
          color,
        }))
        .filter((value) => Number.isFinite(value.change_number))
    : [];

const getChangeTitles = (
  bucket: { change_numbers?: ChangeNumberEntry[] } | null | undefined,
): Map<number, string> => {
  const titles = new Map<number, string>();

  if (!Array.isArray(bucket?.change_numbers)) {
    return titles;
  }

  bucket.change_numbers.forEach((value) => {
    if (typeof value !== 'number' && Number.isFinite(value.change_number) && value.title) {
      titles.set(value.change_number, value.title);
    }
  });

  return titles;
};

const getChangePatchsets = (
  bucket: { change_patchsets?: Array<{ change_number: number; patchset_number: number }> } | null | undefined,
  titles: Map<number, string> = new Map(),
  developer?: string,
  color?: string,
): ChangePatchset[] =>
  Array.isArray(bucket?.change_patchsets)
    ? bucket.change_patchsets.filter(
        (value) =>
          Number.isFinite(value.change_number) &&
          Number.isFinite(value.patchset_number),
      ).map((value) => ({
        ...value,
        title: titles.get(value.change_number),
        developer,
        color,
      }))
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
  valueFormat = 'duration',
  series,
}: GapDistributionChartProps) => {
  const theme = useTheme();
  const [expandedBucketKey, setExpandedBucketKey] = useState<string | null>(null);

  const chartSeries = series && series.length > 0
    ? series.filter((entry) => getDistribution(entry.stats).length > 0)
    : getDistribution(data).length > 0
      ? [{ key: 'selected', name: 'Selected developers', color: theme.palette.primary.main, stats: data }]
      : [];

  const rows = useMemo<ChartRow[]>(() => {
    if (chartSeries.length === 0) {
      return [];
    }

    if (chartSeries.length === 1) {
      return sortBuckets(getDistribution(chartSeries[0].stats)).map((bucket) => ({
        bucketKey: getBucketKey(bucket.min, bucket.max),
        label: getBucketLabelForFormat(bucket.min, bucket.max, valueFormat),
        count: bucket.count,
        value: bucket.count,
        isOpenEnded: bucket.max === null,
        min: bucket.min,
        changeNumbers: getChangeNumbers(bucket),
        changeDetails: getChangeDetails(bucket, chartSeries[0].name, chartSeries[0].color),
        changePatchsets: getChangePatchsets(bucket, getChangeTitles(bucket), chartSeries[0].name, chartSeries[0].color),
      }));
    }

    const bucketMap = new Map<string, { min: number; max: number | null; count: number; changeNumbers: number[]; changeDetails: ChangeDetail[]; changePatchsets: ChangePatchset[] }>();

    chartSeries.forEach(({ stats, name, color }) => {
      if (!stats) {
        return;
      }

      getDistribution(stats).forEach((bucket) => {
        const key = getBucketKey(bucket.min, bucket.max);
        const existing = bucketMap.get(key);
        const changeNumbers = getChangeNumbers(bucket);
        const changeDetails = getChangeDetails(bucket, name, color);
        const changePatchsets = getChangePatchsets(bucket, getChangeTitles(bucket), name, color);

        if (existing) {
          existing.count += bucket.count;
          existing.changeNumbers = Array.from(new Set([...existing.changeNumbers, ...changeNumbers]));
          existing.changeDetails = Array.from(
            new Map(
              [...existing.changeDetails, ...changeDetails].map((change) => [`${change.developer ?? ''}:${change.change_number}`, change]),
            ).values(),
          );
          existing.changePatchsets = Array.from(
            new Map(
              [...existing.changePatchsets, ...changePatchsets].map((patchset) => [
                `${patchset.developer ?? ''}:${patchset.change_number}:${patchset.patchset_number}`,
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
          changeDetails,
          changePatchsets,
        });
      });
    });

    return Array.from(bucketMap.values())
      .map((bucket) => ({
        bucketKey: getBucketKey(bucket.min, bucket.max),
        label: getBucketLabelForFormat(bucket.min, bucket.max, valueFormat),
        count: bucket.count,
        isOpenEnded: bucket.max === null,
        min: bucket.min,
        changeNumbers: bucket.changeNumbers,
        changeDetails: bucket.changeDetails,
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
  }, [chartSeries, valueFormat]);

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

  const renderDeveloperMarker = (developer?: string, color?: string) => developer ? (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ ml: 1 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color ?? 'primary.main' }} />
      <Typography variant="body2">{developer}</Typography>
    </Stack>
  ) : null;

  const renderDialog = () => (
    <Dialog open={Boolean(expandedRow)} onClose={() => setExpandedBucketKey(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{expandedRow ? expandedRow.label : 'Change numbers'}</DialogTitle>
      <DialogContent>
        {expandedRow && expandedRow.changePatchsets.length > 0 ? (
          <List dense>
            {expandedRow.changePatchsets.map(({ change_number: changeNumber, patchset_number: patchsetNumber, title: changeTitle, developer, color }) => (
              <ListItem key={`${changeNumber}-${patchsetNumber}`} disableGutters>
                <Typography component="span" sx={{ mr: 1 }}>
                  Patchset {Math.max(1, patchsetNumber - 1)}-{patchsetNumber}:
                </Typography>
                <Link
                  href={`https://gerrit.sinacomsys.local/${changeNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                >
                  {changeTitle ? `Title: ${changeTitle} - ${changeNumber}` : changeNumber}
                </Link>
                {renderDeveloperMarker(developer, color)}
              </ListItem>
            ))}
          </List>
        ) : expandedRow && expandedRow.changeNumbers.length > 0 ? (
          <List dense>
            {expandedRow.changeDetails.map(({ change_number: changeNumber, title: changeTitle, developer, color }) => (
              <ListItem key={changeNumber} disableGutters>
                <Link
                  href={`https://gerrit.sinacomsys.local/${changeNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                >
                  {changeTitle ? `Title: ${changeTitle} - ${changeNumber}` : changeNumber}
                </Link>
                {renderDeveloperMarker(developer, color)}
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
      chartSeries.flatMap(({ stats, name, color }) =>
        getDistribution(stats).map((bucket) => {
          const key = getBucketKey(bucket.min, bucket.max);
          return [key, {
            bucketKey: key,
            label: getBucketLabelForFormat(bucket.min, bucket.max, valueFormat),
            count: 0,
            isOpenEnded: bucket.max === null,
            min: bucket.min,
            changeNumbers: getChangeNumbers(bucket),
            changeDetails: getChangeDetails(bucket, name, color),
            changePatchsets: getChangePatchsets(bucket, getChangeTitles(bucket), name, color),
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
        changeDetails: [...row.changeDetails],
        changePatchsets: [...(row.changePatchsets ?? [])],
      };

      chartSeries.forEach(({ key: seriesKey, stats, name, color }) => {
        const bucket = getDistribution(stats).find(
          (entry) => getBucketKey(entry.min, entry.max) === row.bucketKey,
        );

        const value = bucket?.count ?? 0;
        aggregated[seriesKey] = value;
        aggregated.count += value;
        aggregated.changeNumbers = Array.from(
          new Set([...aggregated.changeNumbers, ...getChangeNumbers(bucket)]),
        );
        aggregated.changeDetails = Array.from(
          new Map(
            [...aggregated.changeDetails, ...getChangeDetails(bucket, name, color)].map((change) => [`${change.developer ?? ''}:${change.change_number}`, change]),
          ).values(),
        );
        aggregated.changePatchsets = Array.from(
          new Map(
            [...aggregated.changePatchsets, ...getChangePatchsets(bucket, getChangeTitles(bucket), name, color)].map((patchset) => [
              `${patchset.developer ?? ''}:${patchset.change_number}:${patchset.patchset_number}`,
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