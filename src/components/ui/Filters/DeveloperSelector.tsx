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
    renderTags={multiple ? () => `${(value as string[] | null)?.length ?? 0} selected` : undefined}
    renderInput={(params) => <TextField {...params} label={multiple ? 'Developers' : 'Developer'} size="small" />}
    disableClearable={!multiple}
    sx={{ minWidth: multiple ? 180 : 220, maxWidth: multiple ? 220 : undefined }}
  />
);

export default DeveloperSelector;
