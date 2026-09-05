import {
  Button,
  ButtonGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Period } from '@/types/periods';
import CalendarRangePicker from './CalendarRangePicker';
import { useState } from 'react';

interface PeriodSelectorProps {
  periods: Period[];
  onChange: (periods: Period[]) => void;
}

const isSamePeriod = (left: Period, right: Period) => {
  const normalize = (value: string | null) => value ?? '';
  return (
    normalize(left.start) === normalize(right.start) &&
    normalize(left.end) === normalize(right.end)
  );
};

const sortPeriods = (input: Period[]) => {
  return [...input].sort((left, right) => {
    const leftStart = left.start ? new Date(`${left.start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const rightStart = right.start ? new Date(`${right.start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;

    return leftStart - rightStart;
  });
};

const dedupePeriods = (input: Period[]) => {
  const unique: Period[] = [];

  sortPeriods(input).forEach((period) => {
    if (!unique.some((existing) => isSamePeriod(existing, period))) {
      unique.push(period);
    }
  });

  return unique;
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const addWeeks = (date: Date, amount: number) => {
  return addDays(date, amount * 7);
};

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  onChange,
}) => {
  const [quickAmount, setQuickAmount] = useState<number>(1);
  const [quickUnit, setQuickUnit] = useState<'days' | 'weeks' | 'months'>('months');
  const [quickMonthStartDay, setQuickMonthStartDay] = useState<number>(1);
  const [quickWeekStartDay, setQuickWeekStartDay] = useState<string>('Saturday');
  const [quickMenuAnchor, setQuickMenuAnchor] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const updatePeriod = (
    index: number,
    start: string | null,
    end: string | null,
  ) => {
    onChange(
      periods.map((period, currentIndex) =>
        currentIndex === index
          ? { ...period, start, end }
          : period,
      ),
    );
  };

  const removePeriod = (index: number) => {
    onChange(periods.filter((_, currentIndex) => currentIndex !== index));
  };

  const addPeriod = () => {
    const candidate = { start: null, end: null };
    onChange(dedupePeriods([...periods, candidate]));
  };

  const addQuickRange = () => {
    const amount = Number(quickAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const generated = [] as Period[];

    const isWeekDay = (target: number) => {
      const now = new Date();
      const diff = (((now.getDay() - target) % 7) + 7) % 7;
      return addDays(now, -diff);
    };

    const weekDayToNumber: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    if (quickUnit === 'months') {
      const now = new Date();
      for (let index = amount; index >= 1; index -= 1) {
        const monthOffset = amount - index;
        const start = new Date(
          now.getFullYear(),
          now.getMonth() - monthOffset,
          quickMonthStartDay,
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth() - monthOffset + 1,
          quickMonthStartDay - 1,
        );
        generated.push({ start: toISODate(start), end: toISODate(end) });
      }
    } else if (quickUnit === 'weeks') {
      const startTarget = weekDayToNumber[quickWeekStartDay] ?? 6;
      const weekStart = isWeekDay(startTarget);
      for (let index = amount; index >= 1; index -= 1) {
        const start = addWeeks(weekStart, -(amount - index));
        const end = addDays(start, 6);
        generated.push({ start: toISODate(start), end: toISODate(end) });
      }
    } else {
      const anchor = new Date();
      for (let index = amount; index >= 1; index -= 1) {
        const end = addDays(anchor, -(amount - index));
        const start = addDays(end, -1);
        generated.push({ start: toISODate(start), end: toISODate(end) });
      }
    }

    const uniqueRanges = dedupePeriods([
      ...periods,
      ...generated,
    ]);

    onChange(uniqueRanges);
  };

  const orderedPeriods = sortPeriods(periods);

  const openQuickMenu = (event: React.MouseEvent<HTMLElement>) => {
    setQuickMenuAnchor(event.currentTarget);
  };

  const closeQuickMenu = () => {
    setQuickMenuAnchor(null);
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CalendarMonthIcon fontSize="small" />}
        onClick={() => setDialogOpen(true)}
        sx={{ minWidth: 150 }}
      >
        Periods ({periods.length})
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit periods ({periods.length})</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ pt: 1 }}>
            {orderedPeriods.map((period, index) => (
        <Stack
          key={`${period.start ?? 'empty'}-${period.end ?? 'empty'}-${index}`}
          direction="row"
          spacing={1}
          alignItems="center"
        >
          <CalendarRangePicker
            startDate={period.start ?? ''}
            endDate={period.end ?? ''}
            onChange={(start, end) =>
              updatePeriod(index, start, end)
            }
            otherRanges={periods.filter((_, i) => i !== index)}
          />

          <IconButton
            size="small"
            onClick={() => removePeriod(index)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
            </Stack>
            ))}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ButtonGroup variant="outlined" size="small">
            <Button
              onClick={addQuickRange}
              startIcon={<CalendarMonthIcon fontSize="small" />}
            >
              Add last {quickAmount} {quickUnit}
            </Button>

            <Button
              aria-label="Open quick range options"
              aria-controls={quickMenuAnchor ? 'quick-range-menu' : undefined}
              aria-haspopup="true"
              onClick={openQuickMenu}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </Button>
          </ButtonGroup>

          <Menu
            id="quick-range-menu"
            anchorEl={quickMenuAnchor}
            open={Boolean(quickMenuAnchor)}
            onClose={closeQuickMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Stack spacing={1.5} sx={{ p: 1.5, minWidth: 210 }}>
              <TextField
                size="small"
                type="number"
                label="Amount"
                value={quickAmount}
                onChange={(event) =>
                  setQuickAmount(Math.max(1, Number(event.target.value || 1)))
                }
                inputProps={{ min: 1, step: 1 }}
              />

              <TextField
                select
                size="small"
                label="Unit"
                value={quickUnit}
                onChange={(event) =>
                  setQuickUnit(event.target.value as 'days' | 'weeks' | 'months')
                }
              >
                <MenuItem value="days">days</MenuItem>
                <MenuItem value="weeks">weeks</MenuItem>
                <MenuItem value="months">months</MenuItem>
              </TextField>

              {quickUnit === 'months' ? (
                <TextField
                  select
                  size="small"
                  label="Start day of month"
                  value={quickMonthStartDay}
                  onChange={(event) =>
                    setQuickMonthStartDay(Number(event.target.value))
                  }
                >
                  {Array.from({ length: 28 }, (_, index) => index + 1).map(
                    (day) => (
                      <MenuItem key={day} value={day}>
                        {day}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              ) : null}

              {quickUnit === 'weeks' ? (
                <TextField
                  select
                  size="small"
                  label="Week starts on"
                  value={quickWeekStartDay}
                  onChange={(event) =>
                    setQuickWeekStartDay(event.target.value)
                  }
                >
                  {[
                    'Saturday',
                    'Sunday',
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                  ].map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
            </Stack>
          </Menu>
        </Stack>

        <Button
          size="small"
          variant="outlined"
          onClick={addPeriod}
          startIcon={<AddCircleOutlineIcon fontSize="small" />}
        >
          Manual
        </Button>
      </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PeriodSelector;