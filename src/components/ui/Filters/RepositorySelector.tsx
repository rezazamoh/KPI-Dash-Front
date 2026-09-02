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
    renderTags={() => `${value.length} selected`}
    renderInput={(params) => <TextField {...params} label="Repositories" size="small" />}
    sx={{ minWidth: 180, maxWidth: 220 }}
  />
);

export default RepositorySelector;
