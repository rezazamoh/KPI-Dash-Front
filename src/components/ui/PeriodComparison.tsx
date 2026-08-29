import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import MetricsTable from '@/components/ui/MetricsTable';
import {
  formatPeriodLabel,
  formatPeriodLabelShort,
} from '@/utils/formatPeriodLabel';
import {
  buildComparisonRows,
  comparisonDefinitions,
} from '@/metrics/types';
import type { MetricDefinition } from '@/metrics/types';
import type { Period, PeriodResponse } from '@/types/periods';

interface PeriodComparisonProps<T, M> {
  periodResults: PeriodResponse<T>[];
  periods: Period[];
  selectMetrics: (metrics: T) => M[];
  metrics: readonly MetricDefinition<M>[];
  description?: string;
}

function PeriodComparison<T, M>({
  periodResults,
  periods,
  selectMetrics,
  metrics,
  description = 'Compare the selected periods or choose one period to inspect in detail.',
}: PeriodComparisonProps<T, M>) {
  const [view, setView] = useState<'table' | 'chart'>('chart');
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');

  const comparisonMetrics = useMemo(
    () => comparisonDefinitions(metrics),
    [metrics],
  );

  const chartMetrics = comparisonMetrics.filter(
    (metric) => metric.comparison?.chart,
  );

  const rows = useMemo(
    () =>
      buildComparisonRows(
        periodResults,
        periods,
        selectMetrics,
        metrics,
      ),
    [periodResults, periods, selectMetrics, metrics],
  );

  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        period: formatPeriodLabelShort(row.period, row.index),
        ...Object.fromEntries(
          chartMetrics.map((metric) => [
            metric.key,
            (row.values[metric.key] as number | null) ?? 0,
          ]),
        ),
      })),
    [rows, chartMetrics],
  );

  const columns = [
    { key: 'period', label: 'Period' },
    ...comparisonMetrics.map((metric) => ({
      key: metric.key,
      label: metric.comparison?.label ?? metric.label,
    })),
  ];

  const tableRows = rows.map((row) => ({
    period: formatPeriodLabel(row.period, row.index),
    ...Object.fromEntries(
      comparisonMetrics.map((metric) => [
        metric.key,
        metric.comparison?.format?.(row.values[metric.key]) ?? '—',
      ]),
    ),
  }));

  return (
    <SectionCard title="Period comparison">
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          spacing={1}
        >
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {description}
          </Typography>

          <ButtonGroup size="small" variant="outlined">
            <Button
              startIcon={<TableChartIcon />}
              color={
                view === 'table' ? 'primary' : 'inherit'
              }
              onClick={() => setView('table')}
            >
              Table
            </Button>
            <Button
              startIcon={<BarChartIcon />}
              color={
                view === 'chart' ? 'primary' : 'inherit'
              }
              onClick={() => setView('chart')}
            >
              Chart
            </Button>
          </ButtonGroup>
        </Stack>

        {view === 'table' ? (
          <MetricsTable
            columns={columns}
            rows={tableRows}
          />
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="flex-end">
              <ButtonGroup size="small" variant="outlined">
                <Button
                  color={
                    chartType === 'bar'
                      ? 'primary'
                      : 'inherit'
                  }
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </Button>
                <Button
                  color={
                    chartType === 'line'
                      ? 'primary'
                      : 'inherit'
                  }
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
              </ButtonGroup>
            </Stack>

            <Grid container spacing={2}>
              {chartMetrics.map((metric) => (
                <Grid
                  item
                  xs={12}
                  md={6}
                  key={metric.key}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                    >
                      {metric.comparison?.label ?? metric.label}
                    </Typography>

                    <ResponsiveContainer
                      width="100%"
                      height={200}
                    >
                      {chartType === 'bar' ? (
                        <BarChart
                          data={chartData}
                          margin={{
                            top: 10,
                            right: 20,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <XAxis
                            dataKey="period"
                            stroke="#cfd8fc"
                            tick={{ fontSize: 11 }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            stroke="#cfd8fc"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey={metric.key}
                            fill={metric.comparison?.color}
                            name={metric.comparison?.label ?? metric.label}
                          />
                        </BarChart>
                      ) : (
                        <LineChart
                          data={chartData}
                          margin={{
                            top: 10,
                            right: 20,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.08)"
                          />
                          <XAxis
                            dataKey="period"
                            stroke="#cfd8fc"
                            tick={{ fontSize: 11 }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            stroke="#cfd8fc"
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey={metric.key}
                            stroke={metric.comparison?.color}
                            name={metric.comparison?.label ?? metric.label}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}

export default PeriodComparison;