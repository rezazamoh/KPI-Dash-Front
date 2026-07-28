import { Box, TextField } from '@mui/material';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onStartDateChange, onEndDateChange }) => (
  <Box sx={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <TextField
      label="Start date"
      type="date"
      value={startDate}
      onChange={(event) => onStartDateChange(event.target.value)}
      InputLabelProps={{ shrink: true }}
      size="small"
    />
    <TextField
      label="End date"
      type="date"
      value={endDate}
      onChange={(event) => onEndDateChange(event.target.value)}
      InputLabelProps={{ shrink: true }}
      size="small"
    />
  </Box>
);

export default DateRangePicker;
