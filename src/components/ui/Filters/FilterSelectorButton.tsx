import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface FilterSelectorButtonProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FilterSelectorButton: React.FC<FilterSelectorButtonProps> = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  multiple = true,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  const handleOpen = () => {
    setDraft(value);
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const handleApply = () => {
    onChange(draft);
    handleClose();
  };

  const selectedCount = value.length;

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ minWidth: 150, justifyContent: 'space-between' }}
      >
        {label}
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{label}</DialogTitle>

        <DialogContent>
          <Autocomplete
            multiple={multiple}
            fullWidth
            options={options}
            value={multiple ? draft : (draft[0] ?? '')}
            onChange={(_, nextValue) => {
              if (multiple) {
                setDraft(nextValue as string[]);
              } else {
                setDraft(nextValue ? [nextValue as string] : []);
              }
            }}
            disableCloseOnSelect
            renderTags={
              multiple
                ? (tagValue, getTagProps) =>
                    tagValue.map((tag, index) => (
                      <Chip
                        label={tag}
                        size="small"
                        {...getTagProps({ index })}
                        key={tag}
                      />
                    ))
                : undefined
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                size="small"
                placeholder={draft.length ? '' : `Search ${label.toLowerCase()}...`}
              />
            )}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleApply}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FilterSelectorButton;