import { Autocomplete, TextField } from '@mui/material';

interface DeveloperSelectorProps {
  developers: string[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiple?: boolean;
}

const DeveloperSelector: React.FC<DeveloperSelectorProps> = ({ developers, value, onChange, multiple = false }) => (
  <Autocomplete
    multiple={multiple}
    value={value as never}
    options={developers}
    onChange={(_, nextValue) => onChange(nextValue)}
    renderInput={(params) => <TextField {...params} label={multiple ? 'Developers' : 'Developer'} size="small" />}
    disableClearable={!multiple}
    sx={{ minWidth: multiple ? 280 : 220 }}
  />
);

export default DeveloperSelector;
