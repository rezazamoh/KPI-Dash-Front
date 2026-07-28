import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

interface ComparisonTableProps {
  rows: Array<Record<string, string | number | null>>;
  columns: Array<{ key: string; label: string }>;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ rows, columns }) => (
  <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column.key} sx={{ color: 'text.secondary' }}>
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index} hover>
            {columns.map((column) => (
              <TableCell key={column.key}>{row[column.key] ?? '-'}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default ComparisonTable;
