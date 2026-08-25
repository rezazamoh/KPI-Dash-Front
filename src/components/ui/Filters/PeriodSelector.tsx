import {
  Button,
  IconButton,
  Stack,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Period } from '@/types/periods';
import CalendarRangePicker from './CalendarRangePicker';

interface PeriodSelectorProps {
  periods: Period[];
  onChange: (periods: Period[]) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  onChange,
}) => {
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
    onChange([
      ...periods,
      { start: null, end: null },
    ]);
  };

  return (
    <Stack spacing={1}>
      {periods.map((period, index) => (
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

      <Button
        size="small"
        variant="outlined"
        onClick={addPeriod}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add period
      </Button>
    </Stack>
  );
};

export default PeriodSelector;