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

export interface RelationshipRow {
  username: string;
  reviews: number;
  comments: number;
  total: number;
  by_label?: Record<string, LabelStats>;
}

interface RelationshipTableProps {
  rows: RelationshipRow[];
  maxHeight?: number;
}

const RelationshipTable: React.FC<RelationshipTableProps> = ({
  rows,
  maxHeight,
}) => {
  const [order, setOrder] = useState<SortOrder>('asc');
  const [orderBy, setOrderBy] = useState<keyof RelationshipRow | null>(
    null,
  );
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
                  orderBy === 'username'
                    ? order
                    : 'asc'
                }
                onClick={() =>
                  handleSort('username')
                }
              >
                Person
              </TableSortLabel>
            </TableCell>

            <TableCell
              align="right"
              sx={{ color: 'text.secondary' }}
            >
              <TableSortLabel
                active={orderBy === 'reviews'}
                direction={
                  orderBy === 'reviews'
                    ? order
                    : 'asc'
                }
                onClick={() =>
                  handleSort('reviews')
                }
              >
                Reviews
              </TableSortLabel>
            </TableCell>

            <TableCell
              align="right"
              sx={{ color: 'text.secondary' }}
            >
              <TableSortLabel
                active={orderBy === 'comments'}
                direction={
                  orderBy === 'comments'
                    ? order
                    : 'asc'
                }
                onClick={() =>
                  handleSort('comments')
                }
              >
                Comments
              </TableSortLabel>
            </TableCell>

            <TableCell
              align="right"
              sx={{ color: 'text.secondary' }}
            >
              <TableSortLabel
                active={orderBy === 'total'}
                direction={
                  orderBy === 'total'
                    ? order
                    : 'asc'
                }
                onClick={() =>
                  handleSort('total')
                }
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
  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton
            size="small"
            onClick={onToggle}
            disabled={
              !row.by_label ||
              Object.keys(row.by_label).length === 0
            }
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
          {row.reviews}
        </TableCell>

        <TableCell align="right">
          {row.comments}
        </TableCell>

        <TableCell align="right">
          {row.total}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell
          colSpan={5}
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
            <ReviewBreakdown
              breakdown={row.by_label}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ReviewBreakdown: React.FC<{
  breakdown?: Record<string, LabelStats>;
}> = ({ breakdown }) => {
  if (
    !breakdown ||
    Object.keys(breakdown).length === 0
  ) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          No detailed review data available.
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

export default RelationshipTable;