import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
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
  label: string;
  count: number;
  isOpenEnded: boolean;
  [key: string]: number | string | boolean;
}

const getBucketLabel = (min: number, max: number | null): string => {
  if (max === null) {
    return `> ${formatDuration(min)}`;
  }

  return `${formatDuration(min)} – ${formatDuration(max)}`;
};

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

const buildBucketMap = (stats: GapTimeStats | null) => {
  if (!stats) {
    return new Map<string, { min: number; max: number | null; count: number }>();
  }

  return new Map(
    sortBuckets(stats.distribution).map((bucket) => [
      `${bucket.min}:${bucket.max ?? 'inf'}`,
      {
        min: bucket.min,
        max: bucket.max,
        count: bucket.count,
      },
    ]),
  );
};

export const GapDistributionChart = ({
  data,
  title = 'Gap time distribution',
  height = 260,
  series,
}: GapDistributionChartProps) => {
  const theme = useTheme();

  const chartSeries = series && series.length > 0
    ? series.filter((entry) => entry.stats && entry.stats.distribution.length > 0)
    : data && data.distribution.length > 0
      ? [{ key: 'selected', name: 'Selected developers', color: theme.palette.primary.main, stats: data }]
      : [];

  if (chartSeries.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Not enough data to show a distribution.
        </Typography>
      </Box>
    );
  }

  if (chartSeries.length === 1) {
    const stats = chartSeries[0].stats;
    const rows: ChartRow[] = sortBuckets(stats?.distribution ?? []).map((bucket) => {
      const isOpenEnded = bucket.max === null;
      return {
        label: getBucketLabel(bucket.min, bucket.max),
        count: bucket.count,
        value: bucket.count,
        isOpenEnded,
      };
    });

    return (
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: 'text.secondary' }}
        >
          {title}
        </Typography>

        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={rows}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const row = item.payload as ChartRow;
                return [
                  `${row.count}`,
                  row.isOpenEnded ? 'count (open-ended)' : 'count',
                ];
              }}
              labelFormatter={(label) => label as string}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {rows.map((row, index) => (
                <Cell
                  key={index}
                  fill={
                    row.isOpenEnded
                      ? theme.palette.warning.main
                      : chartSeries[0].color
                  }
                  fillOpacity={row.isOpenEnded ? 0.7 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }

  const bucketMap = new Map<string, { min: number; max: number | null }>();

  chartSeries.forEach(({ stats }) => {
    if (!stats) {
      return;
    }

    stats.distribution.forEach((bucket) => {
      const key = `${bucket.min}:${bucket.max ?? 'inf'}`;
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { min: bucket.min, max: bucket.max });
      }
    });
  });

  const rows: ChartRow[] = Array.from(bucketMap.entries())
    .map(([key, bucket]) => {
      const row: ChartRow = {
        label: getBucketLabel(bucket.min, bucket.max),
        count: 0,
        isOpenEnded: bucket.max === null,
      };

      chartSeries.forEach(({ key: seriesKey, stats }) => {
        const value = stats?.distribution.find(
          (entry) => `${entry.min}:${entry.max ?? 'inf'}` === key,
        );

        row[seriesKey] = value?.count ?? 0;
        row.count += value?.count ?? 0;
      });

      return row;
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => {
      const leftMin = Number(left.label.split(' – ')[0]?.replace(/[^\d.]/g, '') ?? 0);
      const rightMin = Number(right.label.split(' – ')[0]?.replace(/[^\d.]/g, '') ?? 0);

      if (left.isOpenEnded && !right.isOpenEnded) {
        return 1;
      }

      if (!left.isOpenEnded && right.isOpenEnded) {
        return -1;
      }

      return leftMin - rightMin;
    });

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, color: 'text.secondary' }}
      >
        {title}
      </Typography>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => [
              `${value}`,
              name,
            ]}
            labelFormatter={(label) => label as string}
          />
          {chartSeries.map(({ key, name, color }) => (
            <Bar
              key={key}
              dataKey={key}
              name={name}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};