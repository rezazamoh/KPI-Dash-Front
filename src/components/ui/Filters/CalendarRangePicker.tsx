import {
  Box,
  IconButton,
  Paper,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useRef, useState } from 'react';

interface CalendarRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string | null, end: string | null) => void;
  otherRanges?: Array<{ start: string | null; end: string | null }>;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toLocalDate = (iso: string): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBetween = (date: Date, start: Date, end: Date) => {
  const t = date.getTime();
  return t > start.getTime() && t < end.getTime();
};

const formatDisplay = (iso: string): string => {
  const date = toLocalDate(iso);
  if (!date) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const CalendarRangePicker: React.FC<CalendarRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  otherRanges = [],
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const committedStart = toLocalDate(startDate);
  const committedEnd = toLocalDate(endDate);

  const parsedOtherRanges = otherRanges
    .map((r) => ({ start: toLocalDate(r.start ?? ''), end: toLocalDate(r.end ?? '') }))
    .filter((r) => r.start && r.end) as Array<{ start: Date; end: Date }>;

  const [viewDate, setViewDate] = useState(
    () => committedStart ?? new Date(),
  );

  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navigate = (dir: number) => {
    setViewDate(new Date(year, month + dir, 1));
  };

  const handleOpen = () => {
    setPendingStart(null);
    setHoverDate(null);
    if (committedStart) {
      setViewDate(committedStart);
    }
    setOpen(true);
  };

  const handleDayClick = (day: number) => {
    const clicked = new Date(year, month, day);

    if (!pendingStart) {
      setPendingStart(clicked);
    } else {
      const earlier = clicked < pendingStart ? clicked : pendingStart;
      const later = clicked < pendingStart ? pendingStart : clicked;
      onChange(toISODate(earlier), toISODate(later));
      setPendingStart(null);
      setHoverDate(null);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null, null);
    setPendingStart(null);
    setHoverDate(null);
  };

  const displayStart = pendingStart ?? committedStart;
  const displayEnd = pendingStart ? hoverDate : committedEnd;

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          ref={anchorRef}
          onClick={handleOpen}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            minWidth: 220,
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <CalendarTodayIcon fontSize="small" color="action" />
          <Typography variant="body2" noWrap>
            {startDate && endDate
              ? `${formatDisplay(startDate)} – ${formatDisplay(endDate)}`
              : startDate
                ? `${formatDisplay(startDate)} – …`
                : 'Select date range'}
          </Typography>
        </Box>

        {(startDate || endDate) && (
          <IconButton size="small" onClick={handleClear}>
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => {
          setPendingStart(null);
          setHoverDate(null);
          setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Paper sx={{ p: 2, userSelect: 'none' }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <IconButton size="small" onClick={() => navigate(-1)}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="subtitle2">
                {viewDate.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </Typography>
              <IconButton size="small" onClick={() => navigate(1)}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                textAlign: 'center',
              }}
            >
              {WEEKDAYS.map((d) => (
                <Typography
                  key={d}
                  variant="caption"
                  color="text.secondary"
                  sx={{ py: 0.5, fontWeight: 600 }}
                >
                  {d}
                </Typography>
              ))}

              {cells.map((day, i) => {
                if (day === null) {
                  return <Box key={`empty-${i}`} />;
                }

                const date = new Date(year, month, day);
                const isPendingStart =
                  pendingStart && isSameDay(date, pendingStart);
                const isCommittedStart =
                  committedStart && isSameDay(date, committedStart);
                const isCommittedEnd =
                  committedEnd && isSameDay(date, committedEnd);

                const effectiveEnd = pendingStart
                  ? hoverDate
                  : committedEnd;
                const isEffectiveEnd =
                  effectiveEnd && isSameDay(date, effectiveEnd);

                const isStart = isPendingStart || isCommittedStart;
                const isEnd = isEffectiveEnd && !isStart;
                const inRange =
                  displayStart &&
                  displayEnd &&
                  isBetween(date, displayStart, displayEnd);
                const isToday = isSameDay(date, new Date());

                const inOtherRange = parsedOtherRanges.some(
                  (r) => date >= r.start && date <= r.end,
                );

                return (
                  <Box
                    key={day}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => {
                      if (pendingStart) setHoverDate(date);
                    }}
                    onMouseLeave={() => {
                      if (pendingStart) setHoverDate(null);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      position: 'relative',
                      mx: 'auto',
                      fontSize: '0.8rem',
                      bgcolor:
                        isStart || isEnd
                          ? 'primary.main'
                          : inRange
                            ? 'primary.dark'
                            : inOtherRange
                              ? 'rgba(255,255,255,0.12)'
                              : 'transparent',
                      color:
                        isStart || isEnd
                          ? 'primary.contrastText'
                          : inOtherRange
                            ? 'text.secondary'
                            : 'text.primary',
                      fontWeight: isStart || isEnd ? 700 : 400,
                      '&:hover': {
                        bgcolor:
                          isStart || isEnd
                            ? 'primary.dark'
                            : 'action.hover',
                      },
                      ...(isToday && !isStart && !isEnd
                        ? {
                            border: '1px solid',
                            borderColor: 'primary.main',
                          }
                        : {}),
                    }}
                  >
                    {day}
                  </Box>
                );
              })}
            </Box>

            {pendingStart && (
              <Typography
                variant="caption"
                color="text.secondary"
                textAlign="center"
              >
                Now select end date
              </Typography>
            )}
          </Stack>
        </Paper>
      </Popover>
    </>
  );
};

export default CalendarRangePicker;
