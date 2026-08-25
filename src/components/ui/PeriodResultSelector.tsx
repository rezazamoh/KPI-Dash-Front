// src/components/ui/PeriodResultSelector.tsx

import { Chip, Stack } from '@mui/material';
import { Period } from '@/types/periods';

interface PeriodResultSelectorProps {
  periods: Period[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const formatPeriod = (period: Period) => {
  if (!period.start && !period.end) {
    return 'Any time';
  }

  return `${period.start ?? '…'} – ${period.end ?? '…'}`;
};

const PeriodResultSelector: React.FC<PeriodResultSelectorProps> = ({
  periods,
  selectedIndex,
  onChange,
}) => {
  if (periods.length <= 1) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {periods.map((period, index) => (
        <Chip
          key={`${period.start}-${period.end}-${index}`}
          label={formatPeriod(period)}
          color={index === selectedIndex ? 'primary' : 'default'}
          onClick={() => onChange(index)}
        />
      ))}
    </Stack>
  );
};

export default PeriodResultSelector;