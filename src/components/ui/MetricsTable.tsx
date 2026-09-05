import { ReactNode, useMemo, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';

interface MetricsTableProps {
  rows: Array<Record<string, string | number | null | ReactNode>>;
  columns: Array<{ key: string; label: string }>;
  maxHeight?: number;
}

type SortOrder = 'asc' | 'desc';

const MetricsTable: React.FC<MetricsTableProps> = ({ rows, columns, maxHeight }) => {
  const [order, setOrder] = useState<SortOrder>('asc');
  const [orderBy, setOrderBy] = useState<string | null>(null);

  const handleSort = (key: string) => {
    const isCurrentlyAsc = orderBy === key && order === 'asc';

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

      // Put null values at the end
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Skip sorting for non-primitive values (e.g. ReactNode)
      if (typeof aValue === 'object' || typeof bValue === 'object') return 0;

      let comparison = 0;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }, [rows, order, orderBy]);

  if (!rows.length) {
    return <Typography color="text.secondary">No results available.</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'background.paper', flexGrow: 1, maxHeight: maxHeight ?? 400, overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} sx={{ color: 'text.secondary' }}>
                <TableSortLabel
                  active={orderBy === column.key}
                  direction={orderBy === column.key ? order : 'asc'}
                  onClick={() => handleSort(column.key)}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedRows.map((row, index) => (
            <TableRow key={index} hover>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {row[column.key] ?? '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MetricsTable;