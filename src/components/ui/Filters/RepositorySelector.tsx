import { Autocomplete, TextField } from '@mui/material';

interface RepositorySelectorProps {
  repositories: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ repositories, value, onChange }) => (
  <Autocomplete
    multiple
    value={value}
    options={repositories}
    disableCloseOnSelect
    filterSelectedOptions={false}
    onChange={(_, nextValue) => onChange(nextValue)}
    renderInput={(params) => <TextField {...params} label="Repositories" size="small" />}
    sx={{ minWidth: 240, maxWidth: 420 }}
  />
);

export default RepositorySelector;
