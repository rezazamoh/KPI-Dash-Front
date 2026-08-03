import { Autocomplete, TextField } from '@mui/material';

interface TopicSelectorProps {
  topics: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, value, onChange, disabled = false, onOpenChange }) => (
  <Autocomplete
    multiple
    value={value}
    options={topics}
    disableCloseOnSelect
    filterSelectedOptions={false}
    onChange={(_, nextValue) => onChange(nextValue)}
    onOpen={() => onOpenChange?.(true)}
    onClose={() => onOpenChange?.(false)}
    renderInput={(params) => <TextField {...params} label="Topics" size="small" />}
    disabled={disabled}
    sx={{ minWidth: 240, maxWidth: 420 }}
  />
);

export default TopicSelector;
