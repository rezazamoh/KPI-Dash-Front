import {
  Button,
  IconButton,
  Stack,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Period } from '@/types/periods';
import DateRangePicker from './DateRangePicker';

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
    field: keyof Period,
    value: string,
  ) => {
    onChange(
      periods.map((period, currentIndex) =>
        currentIndex === index
          ? { ...period, [field]: value || null }
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
          <DateRangePicker
            startDate={period.start ?? ''}
            endDate={period.end ?? ''}
            onStartDateChange={(value) =>
              updatePeriod(index, 'start', value)
            }
            onEndDateChange={(value) =>
              updatePeriod(index, 'end', value)
            }
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