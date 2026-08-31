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
  data: GapTimeStats | null;
  title?: string;
  height?: number;
}

interface ChartRow {
  label: string;
  value: number;
  count: number;
  isOpenEnded: boolean;
}

/**
 * Renders a density histogram for patchset/lead-time gap distributions.
 * Bar height uses `density` (count normalized by bucket width) so that
 * the unequal, log-spaced bucket widths don't visually mislead - a wide
 * bucket sweeping up more raw gaps won't look artificially "busier" than
 * a narrow one. The final, open-ended bucket has no finite width, so it
 * falls back to raw `count` and is visually distinguished from the rest.
 */
export const GapDistributionChart = ({
  data,
  title = 'Gap time distribution',
  height = 260,
}: GapDistributionChartProps) => {
  const theme = useTheme();

  if (!data || data.distribution.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Not enough data to show a distribution.
        </Typography>
      </Box>
    );
  }

  const rows: ChartRow[] = data.distribution.map((bucket) => {
    const isOpenEnded = bucket.max === null;
    return {
      label: isOpenEnded
        ? `> ${formatDuration(bucket.min)}`
        : `${formatDuration(bucket.min)} – ${formatDuration(bucket.max as number)}`,
      value: isOpenEnded ? bucket.count : (bucket.density ?? 0),
      count: bucket.count,
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
            allowDecimals
            width={40}
          />
          <Tooltip
            formatter={(_value, _name, item) => {
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
                    : theme.palette.primary.main
                }
                fillOpacity={row.isOpenEnded ? 0.6 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {
        /*
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.5 }}
      >
        Bar height = gap density (count ÷ bucket width). The last bar
        (amber) is open-ended and shown by raw count instead.
      </Typography>
        */
      }
    </Box>
  );
};