import { Autocomplete, TextField } from '@mui/material';

interface DeveloperSelectorProps {
  developers: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}

const DeveloperSelector: React.FC<DeveloperSelectorProps> = ({ developers, value, onChange }) => (
  <Autocomplete
    value={value}
    options={developers}
    onChange={(_, nextValue) => onChange(nextValue)}
    renderInput={(params) => <TextField {...params} label="Developer" size="small" />}
    disableClearable
    sx={{ minWidth: 220 }}
  />
);

export default DeveloperSelector;
