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

interface VoteStats {
  total: number;
  rate: number;
  value_rate: number;
}

interface LabelStats {
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
}

const RelationshipTable: React.FC<RelationshipTableProps> = ({
  rows,
  maxHeight,
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
                Reviews sent
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
                Reviews received
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
                Comments sent
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
                Comments received
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
                onToggle={() =>
                  toggleExpanded(row.username)
                }
              />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// NOTE: this helper references `getOverallTotal`, which isn't defined
// anywhere in the file. It's not called by anything below, so it doesn't
// break compilation, but it will throw a ReferenceError if you ever call
// `recalculateLabelStats` at runtime. Flagging it since it looked like
// dead/unfinished code — let me know if you want this fleshed out.
const mergeLabelStats = (
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
          values: { ...stats.values },
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
            existingVote.rate = 0;
            existingVote.value_rate = 0;
          }
        },
      );
    },
  );
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
        Review breakdown
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
  breakdowns: RelationshipRow['breakdowns'];
}> = ({ breakdowns }) => {
  const sections = [
    {
      key: 'reviewSent',
      label: 'Reviews sent',
      breakdown: breakdowns.reviewSent,
    },
    {
      key: 'reviewReceived',
      label: 'Reviews received',
      breakdown: breakdowns.reviewReceived,
    },
    {
      key: 'commentsSent',
      label: 'Comments sent',
      breakdown: breakdowns.commentsSent,
    },
    {
      key: 'commentsReceived',
      label: 'Comments received',
      breakdown: breakdowns.commentsReceived,
    },
  ] as const;

  const availableSections = sections.filter(
    ({ breakdown }) =>
      breakdown &&
      Object.keys(breakdown).length > 0,
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
          ({ key, label, breakdown }) => (
            <Box key={key}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ mb: 1 }}
              >
                {label}
              </Typography>

              <ReviewBreakdown
                breakdown={breakdown!}
              />
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
}

const RelationshipRows: React.FC<
  RelationshipRowsProps
> = ({
  row,
  isExpanded,
  onToggle,
}) => {
  const hasBreakdown =
    Object.values(row.breakdowns).some(
      (breakdown) =>
        breakdown &&
        Object.keys(breakdown).length > 0,
    );

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
              breakdowns={row.breakdowns}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default RelationshipTable;