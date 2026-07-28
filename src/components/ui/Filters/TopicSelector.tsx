import { Autocomplete, TextField } from '@mui/material';

interface TopicSelectorProps {
  topics: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, value, onChange }) => (
  <Autocomplete
    multiple
    value={value}
    options={topics}
    onChange={(_, nextValue) => onChange(nextValue)}
    renderInput={(params) => <TextField {...params} label="Topics" size="small" />}
    sx={{ minWidth: 240, maxWidth: 420 }}
  />
);

export default TopicSelector;
