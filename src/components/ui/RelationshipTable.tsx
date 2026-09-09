import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';

type SortOrder = 'asc' | 'desc';

export interface VoteStats {
  total: number;
  rate: number;
  value_rate: number;
}

export interface LabelStats {
  total: number;
  positive: number;
  negative: number;
  values: Record<string, VoteStats>;
}

export interface RelationshipPerson {
  username: string;
  count: number;
  by_label?: Record<string, LabelStats>;
}

export interface RelationshipStats {
  per_person?: {
    min: number;
    mean: number;
    max: number;
  };
  per_change?: {
    min: number;
    mean: number;
    max: number;
  };
  by_label?: Record<
    string,
    {
      total: number;
      rate: number;
      values: Record<string, VoteStats>;
    }
  >;
}

export interface RelationshipMetric {
  people: RelationshipPerson[];
  stats: RelationshipStats;
}

export interface RelationshipRow {
  username: string;

  reviewSent: number;
  reviewReceived: number;
  commentsSent: number;
  commentsReceived: number;
  total: number;

  breakdowns: {
    reviewSent?: Record<string, LabelStats>;
    reviewReceived?: Record<string, LabelStats>;
    commentsSent?: Record<string, LabelStats>;
    commentsReceived?: Record<string, LabelStats>;
  };
}

interface RelationshipTableProps {
  rows: RelationshipRow[];
  maxHeight?: number;
  perspective?: 'developer' | 'project';
  focalPerson?: string;
}

const RelationshipTable: React.FC<RelationshipTableProps> = ({
  rows,
  maxHeight,
  perspective = 'project',
  focalPerson,
}) => {
  const [order, setOrder] = useState<SortOrder>('desc');

  const [orderBy, setOrderBy] = useState<keyof RelationshipRow | null>('total');
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSort = (key: keyof RelationshipRow) => {
    const isCurrentlyAsc =
      orderBy === key && order === 'asc';

    setOrder(isCurrentlyAsc ? 'desc' : 'asc');
    setOrderBy(key);
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (
        typeof aValue === 'object' ||
        typeof bValue === 'object'
      ) {
        return 0;
      }

      let comparison = 0;

      if (
        typeof aValue === 'number' &&
        typeof bValue === 'number'
      ) {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(
          String(bValue),
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          },
        );
      }

      return order === 'asc'
        ? comparison
        : -comparison;
    });
  }, [rows, order, orderBy]);

  const toggleExpanded = (username: string) => {
    setExpanded((current) =>
      current === username ? null : username,
    );
  };

  if (!rows.length) {
    return (
      <Typography color="text.secondary">
        No results available.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {perspective === 'developer'
          ? `For ${focalPerson ?? 'this developer'}, sent means activity from the focal developer to the person in the row; received means activity from that person to the focal developer.`
          : 'For each developer in the row, sent means activity they made toward other developers; received means activity they received from other developers.'}
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          bgcolor: 'background.paper',
          maxHeight: maxHeight ?? 400,
        }}
      >
        <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }} />

            <TableCell sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'username'}
                direction={
                  orderBy === 'username' ? order : 'asc'
                }
                onClick={() => handleSort('username')}
              >
                Person
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'reviewSent'}
                direction={
                  orderBy === 'reviewSent' ? order : 'asc'
                }
                onClick={() => handleSort('reviewSent')}
              >
                {perspective === 'developer'
                  ? 'Reviews sent by focal dev'
                  : 'Reviews sent'}
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'reviewReceived'}
                direction={
                  orderBy === 'reviewReceived' ? order : 'asc'
                }
                onClick={() => handleSort('reviewReceived')}
              >
                {perspective === 'developer'
                  ? 'Reviews received from person'
                  : 'Reviews received'}
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'commentsSent'}
                direction={
                  orderBy === 'commentsSent' ? order : 'asc'
                }
                onClick={() => handleSort('commentsSent')}
              >
                {perspective === 'developer'
                  ? 'Comments sent by focal dev'
                  : 'Comments sent'}
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'commentsReceived'}
                direction={
                  orderBy === 'commentsReceived' ? order : 'asc'
                }
                onClick={() => handleSort('commentsReceived')}
              >
                {perspective === 'developer'
                  ? 'Comments received from person'
                  : 'Comments received'}
              </TableSortLabel>
            </TableCell>

            <TableCell align="right" sx={{ color: 'text.secondary' }}>
              <TableSortLabel
                active={orderBy === 'total'}
                direction={
                  orderBy === 'total' ? order : 'asc'
                }
                onClick={() => handleSort('total')}
              >
                Total
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedRows.map((row) => {
            const isExpanded =
              expanded === row.username;

            return (
              <RelationshipRows
                key={row.username}
                row={row}
                isExpanded={isExpanded}
                perspective={perspective}
                onToggle={() =>
                  toggleExpanded(row.username)
                }
              />
            );
          })}
        </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

const getOverallTotal = (
  labels: Record<string, LabelStats>,
) =>
  Object.values(labels).reduce(
    (sum, stats) => sum + (stats.total ?? 0),
    0,
  );

const toVoteCount = (vote: number | VoteStats | undefined): number =>
  typeof vote === 'number'
    ? vote
    : Number(vote?.total ?? 0);

export const normalizeLabelStats = (
  byLabel?: Record<string, unknown> | null,
): Record<string, LabelStats> => {
  const normalized: Record<string, LabelStats> = {};

  Object.entries(byLabel ?? {}).forEach(
    ([label, raw]) => {
      const entry = (raw ?? {}) as {
        total?: number;
        positive?: number;
        negative?: number;
        values?: Record<string, number | VoteStats>;
      };

      const values = entry.values ?? {};
      const normalizedValues = Object.values(values) as Array<number | VoteStats>;

      const stats: LabelStats = {
        total:
          entry.total ??
          normalizedValues.reduce<number>(
            (sum, vote) => sum + toVoteCount(vote),
            0,
          ),
        positive: entry.positive ?? 0,
        negative: entry.negative ?? 0,
        values: {},
      };

      Object.entries(values).forEach(
        ([value, vote]) => {
          stats.values[value] = {
            total: toVoteCount(vote),
            rate: 0,
            value_rate: 0,
          };
        },
      );

      normalized[label] = stats;
    },
  );

  recalculateLabelStats(normalized);

  return normalized;
};

export const mergeLabelStats = (
  target: Record<string, LabelStats>,
  source?: Record<string, LabelStats>,
) => {
  if (!source) return;

  Object.entries(source).forEach(
    ([label, stats]) => {
      const existing = target[label];

      if (!existing) {
        target[label] = {
          total: stats.total,
          positive: stats.positive,
          negative: stats.negative,
          values: Object.fromEntries(
            Object.entries(stats.values).map(
              ([value, vote]) => [value, { ...vote }],
            ),
          ),
        };
        return;
      }

      existing.total += stats.total;
      existing.positive += stats.positive;
      existing.negative += stats.negative;

      Object.entries(stats.values).forEach(
        ([value, vote]) => {
          const existingVote =
            existing.values[value];

          if (!existingVote) {
            existing.values[value] = {
              ...vote,
            };
          } else {
            existingVote.total += vote.total;
          }
        },
      );
    },
  );

  recalculateLabelStats(target);
};

const recalculateLabelStats = (
  labels: Record<string, LabelStats>,
) => {
  Object.values(labels).forEach((stats) => {
    Object.values(stats.values).forEach(
      (vote) => {
        vote.rate =
          stats.total > 0
            ? Number(
                (
                  (vote.total / getOverallTotal(labels)) *
                  100
                ).toFixed(2),
              )
            : 0;

        vote.value_rate =
          stats.total > 0
            ? Number(
                (
                  (vote.total / stats.total) *
                  100
                ).toFixed(2),
              )
            : 0;
      },
    );
  });
};

interface ReviewBreakdownProps {
  breakdown: Record<string, LabelStats>;
}

const ReviewBreakdown: React.FC<ReviewBreakdownProps> = ({
  breakdown,
}) => {
  return (
    <Box sx={{ p: 2, pl: 6 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 2 }}
      >
        Activity breakdown
      </Typography>

      <Stack spacing={2}>
        {Object.entries(breakdown).map(
          ([label, stats]) => (
            <Box key={label}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                >
                  {label}
                </Typography>

                <Chip
                  size="small"
                  label={`${stats.total} votes`}
                />

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {stats.positive} positive ·{' '}
                  {stats.negative} negative
                </Typography>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
              >
                {Object.entries(
                  stats.values,
                ).map(([value, vote]) => (
                  <Chip
                    key={value}
                    size="small"
                    variant="outlined"
                    label={`${value}: ${vote.total} (${vote.value_rate}%)`}
                  />
                ))}
              </Stack>
            </Box>
          ),
        )}
      </Stack>
    </Box>
  );
};

const RelationshipBreakdown: React.FC<{
  row: RelationshipRow;
  breakdowns: RelationshipRow['breakdowns'];
  perspective: 'developer' | 'project';
}> = ({ row, breakdowns, perspective }) => {
  const sentSuffix =
    perspective === 'developer' ? ' to person' : '';
  const receivedSuffix =
    perspective === 'developer' ? ' from person' : '';

  const sections = [
    {
      key: 'reviewSent',
      label: `Reviews sent${sentSuffix}`,
      breakdown: breakdowns.reviewSent,
      count: row.reviewSent,
    },
    {
      key: 'reviewReceived',
      label: `Reviews received${receivedSuffix}`,
      breakdown: breakdowns.reviewReceived,
      count: row.reviewReceived,
    },
    {
      key: 'commentsSent',
      label: `Comments sent${sentSuffix}`,
      breakdown: breakdowns.commentsSent,
      count: row.commentsSent,
    },
    {
      key: 'commentsReceived',
      label: `Comments received${receivedSuffix}`,
      breakdown: breakdowns.commentsReceived,
      count: row.commentsReceived,
    },
  ] as const;

  const availableSections = sections.filter(
    ({ breakdown, count }) =>
      count > 0 ||
      (breakdown && Object.keys(breakdown).length > 0),
  );

  if (!availableSections.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          No detailed relationship data available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pl: 6 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 2 }}
      >
        Relationship breakdown
      </Typography>

      <Stack spacing={3}>
        {availableSections.map(
          ({ key, label, breakdown, count }) => (
            <Box key={key}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ mb: 1 }}
              >
                {label}
              </Typography>

              {breakdown && Object.keys(breakdown).length > 0 ? (
                <ReviewBreakdown
                  breakdown={breakdown}
                />
              ) : null}
            </Box>
          ),
        )}
      </Stack>
    </Box>
  );
};

interface RelationshipRowsProps {
  row: RelationshipRow;
  isExpanded: boolean;
  onToggle: () => void;
  perspective: 'developer' | 'project';
}

const RelationshipRows: React.FC<
  RelationshipRowsProps
> = ({
  row,
  isExpanded,
  onToggle,
  perspective,
}) => {
  const hasBreakdown =
    row.reviewSent > 0 ||
    row.reviewReceived > 0 ||
    row.commentsSent > 0 ||
    row.commentsReceived > 0 ||
    Boolean(row.breakdowns.reviewSent) ||
    Boolean(row.breakdowns.reviewReceived) ||
    Boolean(row.breakdowns.commentsSent) ||
    Boolean(row.breakdowns.commentsReceived);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton
            size="small"
            onClick={onToggle}
            disabled={!hasBreakdown}
          >
            {isExpanded ? (
              <KeyboardArrowUp />
            ) : (
              <KeyboardArrowDown />
            )}
          </IconButton>
        </TableCell>

        <TableCell>{row.username}</TableCell>

        <TableCell align="right">
          {row.reviewSent}
        </TableCell>

        <TableCell align="right">
          {row.reviewReceived}
        </TableCell>

        <TableCell align="right">
          {row.commentsSent}
        </TableCell>

        <TableCell align="right">
          {row.commentsReceived}
        </TableCell>

        <TableCell align="right">
          {row.total}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell
          colSpan={7}
          sx={{
            p: 0,
            borderBottom: isExpanded
              ? undefined
              : 'none',
          }}
        >
          <Collapse
            in={isExpanded}
            timeout="auto"
            unmountOnExit
          >
            <RelationshipBreakdown
              row={row}
              breakdowns={row.breakdowns}
              perspective={perspective}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default RelationshipTable;