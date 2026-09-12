import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSettings,
  updateSettings,
  DurationWindow,
  PatchsetWindow,
} from '@/api/settings';
import ErrorPanel from '@/components/ui/ErrorPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SectionCard from '@/components/ui/SectionCard';

const emptyWindow = (): DurationWindow => ({ min: null, max: null });
const emptyPatchsetWindow = (): PatchsetWindow => ({ min: 0, max: null });

const DURATION_UNITS = [
  { label: 'Minutes', value: 60 },
  { label: 'Hours', value: 60 * 60 },
  { label: 'Days', value: 24 * 60 * 60 },
] as const;

const getDurationParts = (seconds: number) => {
  const unit = [...DURATION_UNITS]
    .reverse()
    .find((candidate) => seconds >= candidate.value && seconds % candidate.value === 0)
    ?? DURATION_UNITS[0];

  return { amount: seconds / unit.value, unit: unit.value };
};

const DurationSelector: React.FC<{
  label: string;
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}> = ({ label, value, disabled = false, onChange }) => {
  const [unit, setUnit] = useState(getDurationParts(value ?? 0).unit);
  const [amount, setAmount] = useState(value == null ? '' : String(getDurationParts(value).amount));

  useEffect(() => {
    if (value == null || Number.isNaN(value)) {
      setAmount('');
      return;
    }

    const parts = getDurationParts(value);
    setAmount(String(parts.amount));
    setUnit(parts.unit);
  }, [value]);

  if (disabled) {
    return (
      <TextField
        label={label}
        value={label === 'Minimum' ? 'No lower bound' : 'No upper bound'}
        size="small"
        disabled
        sx={{ flex: 1 }}
      />
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
      <TextField
        label={label}
        type="number"
        value={amount}
        onChange={(event) => {
          const nextAmount = event.target.value;
          setAmount(nextAmount);
          onChange(nextAmount === '' ? (label === 'Maximum' ? null : Number.NaN) : Number(nextAmount) * unit);
        }}
        inputProps={{ min: 0, step: 0.01 }}
        size="small"
        sx={{ flex: 1, minWidth: 90 }}
      />
      <Select
        value={unit}
        size="small"
        aria-label={`${label} unit`}
        onChange={(event) => {
          const nextUnit = Number(event.target.value);
          setUnit(nextUnit);
          if (amount !== '') {
            onChange(Number(amount) * nextUnit);
          }
        }}
        sx={{ minWidth: 110 }}
      >
        {DURATION_UNITS.map((unit) => (
          <MenuItem key={unit.value} value={unit.value}>
            {unit.label}
          </MenuItem>
        ))}
      </Select>
    </Stack>
  );
};

const normalizeWindows = (durationWindows: DurationWindow[]): DurationWindow[] =>
  durationWindows.map((window, index) => ({
    ...window,
    min: index === 0 ? null : window.min,
    max: index === durationWindows.length - 1 ? null : window.max,
  }));

const normalizePatchsetWindows = (patchsetWindows: PatchsetWindow[]): PatchsetWindow[] =>
  patchsetWindows.map((window, index) => ({
    min: index === 0 ? 0 : window.min,
    max: index === patchsetWindows.length - 1 ? null : window.max,
  }));

const NumericWindowSelector: React.FC<{
  label: string;
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}> = ({ label, value, disabled = false, onChange }) => (
  <TextField
    label={label}
    type="number"
    value={value ?? ''}
    disabled={disabled}
    onChange={(event) => {
      const nextValue = event.target.value;
      onChange(nextValue === '' ? null : Math.max(0, Number(nextValue)));
    }}
    inputProps={{ min: 0, step: 1 }}
    size="small"
    sx={{ flex: 1, minWidth: 120 }}
  />
);

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [windows, setWindows] = useState<DurationWindow[]>([]);
  const [useDurationWindows, setUseDurationWindows] = useState(true);
  const [patchsetWindows, setPatchsetWindows] = useState<PatchsetWindow[]>([]);
  const [usePatchsetWindows, setUsePatchsetWindows] = useState(true);
  const [saved, setSaved] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setWindows(normalizeWindows(settingsQuery.data.duration_windows ?? []));
      setUseDurationWindows(settingsQuery.data.use_duration_windows);
      setPatchsetWindows(normalizePatchsetWindows(settingsQuery.data.patchset_windows ?? []));
      setUsePatchsetWindows(settingsQuery.data.use_patchset_windows);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setWindows(normalizeWindows(data.duration_windows ?? windows));
      setUseDurationWindows(data.use_duration_windows);
      setPatchsetWindows(normalizePatchsetWindows(data.patchset_windows ?? patchsetWindows));
      setUsePatchsetWindows(data.use_patchset_windows);
      setSaved(true);
    },
  });

  const updateWindow = (index: number, changes: Partial<DurationWindow>) => {
    setSaved(false);
    setWindows((current) => current.map((window, windowIndex) =>
      windowIndex === index ? { ...window, ...changes } : window,
    ));
  };

  const addWindow = () => {
    setSaved(false);
    setWindows((current) => {
      if (current.length === 0) {
        return [emptyWindow()];
      }

      const lastWindow = current[current.length - 1];
      const nextMin = lastWindow.max ?? (lastWindow.min && lastWindow.min > 0 ? lastWindow.min * 2 : 60);
      const nextWindows = [...current];
      nextWindows[nextWindows.length - 1] = { ...lastWindow, max: nextMin };

      return [...nextWindows, { min: nextMin, max: null }];
    });
  };

  const removeWindow = (index: number) => {
    setSaved(false);
    setWindows((current) => normalizeWindows(
      current.filter((_, windowIndex) => windowIndex !== index),
    ));
  };

  const updatePatchsetWindow = (index: number, changes: Partial<PatchsetWindow>) => {
    setSaved(false);
    setPatchsetWindows((current) => current.map((window, windowIndex) =>
      windowIndex === index ? { ...window, ...changes } : window,
    ));
  };

  const addPatchsetWindow = () => {
    setSaved(false);
    setPatchsetWindows((current) => {
      if (current.length === 0) {
        return [emptyPatchsetWindow()];
      }

      const lastWindow = current[current.length - 1];
      const nextMin = lastWindow.max ?? lastWindow.min + 1;
      const nextWindows = [...current];
      nextWindows[nextWindows.length - 1] = { ...lastWindow, max: nextMin };

      return [...nextWindows, { min: nextMin, max: null }];
    });
  };

  const removePatchsetWindow = (index: number) => {
    setSaved(false);
    setPatchsetWindows((current) => normalizePatchsetWindows(
      current.filter((_, windowIndex) => windowIndex !== index),
    ));
  };

  const windowsForSave = normalizeWindows(windows);
  const patchsetWindowsForSave = normalizePatchsetWindows(patchsetWindows);

  if (settingsQuery.isLoading) {
    return <LoadingSpinner label="Loading settings" />;
  }

  if (settingsQuery.isError) {
    return <ErrorPanel message="Unable to load settings." />;
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Settings</Typography>
          <Typography color="text.secondary">
            Configure the duration windows used by gap distribution charts. Durations are converted to seconds when saved.
          </Typography>
        </Stack>

        <SectionCard title="Gap distribution windows">
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={useDurationWindows}
                  onChange={(event) => {
                    setUseDurationWindows(event.target.checked);
                    setSaved(false);
                  }}
                />
              }
              label="Use custom duration windows"
            />
            <Typography variant="body2" color="text.secondary">
              Turn this off to keep these windows saved but use the system default windows instead.
            </Typography>
            {windows.length === 0 ? (
              <Typography color="text.secondary">No custom duration windows configured. Saving will restore the system defaults.</Typography>
            ) : null}

            {windows.map((window, index) => {
              const isFirst = index === 0;
              const isLast = index === windows.length - 1;
              return (
                <Stack
                  key={index}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <DurationSelector
                    label="Minimum"
                    value={window.min}
                    disabled={isFirst}
                    onChange={(value) => updateWindow(index, { min: value })}
                  />
                  <DurationSelector
                    label="Maximum"
                    value={window.max}
                    disabled={isLast}
                    onChange={(value) => updateWindow(index, { max: value })}
                  />
                  <Tooltip title="Remove window">
                    <IconButton
                      aria-label="Remove duration window"
                      onClick={() => removeWindow(index)}
                      color="error"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })}

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={addWindow}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add window
            </Button>

            {updateMutation.isError ? (
              <Alert severity="error">{getSaveErrorMessage(updateMutation.error)}</Alert>
            ) : null}
            {saved ? <Alert severity="success">Settings saved.</Alert> : null}

            <Button
              variant="contained"
              onClick={() => updateMutation.mutate({
                use_duration_windows: windowsForSave.length > 0 && useDurationWindows,
                duration_windows: windowsForSave,
                use_patchset_windows: patchsetWindowsForSave.length > 0 && usePatchsetWindows,
                patchset_windows: patchsetWindowsForSave,
              })}
              disabled={updateMutation.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Patchsets per change distribution windows">
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={usePatchsetWindows}
                  onChange={(event) => {
                    setUsePatchsetWindows(event.target.checked);
                    setSaved(false);
                  }}
                />
              }
              label="Use custom patchset windows"
            />
            <Typography variant="body2" color="text.secondary">
              Configure the patchset-count ranges used by the patchsets per change graph.
            </Typography>
            {patchsetWindows.length === 0 ? (
              <Typography color="text.secondary">No custom patchset windows configured.</Typography>
            ) : null}

            {patchsetWindows.map((window, index) => {
              const isFirst = index === 0;
              const isLast = index === patchsetWindows.length - 1;

              return (
                <Stack
                  key={index}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <NumericWindowSelector
                    label="Minimum patchsets"
                    value={window.min}
                    disabled={isFirst}
                    onChange={(value) => updatePatchsetWindow(index, { min: value ?? 0 })}
                  />
                  <NumericWindowSelector
                    label="Maximum patchsets"
                    value={window.max}
                    disabled={isLast}
                    onChange={(value) => updatePatchsetWindow(index, { max: value })}
                  />
                  <Tooltip title="Remove patchset window">
                    <IconButton
                      aria-label="Remove patchset window"
                      onClick={() => removePatchsetWindow(index)}
                      color="error"
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })}

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={addPatchsetWindow}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add patchset window
            </Button>

            <Button
              variant="contained"
              onClick={() => updateMutation.mutate({
                use_duration_windows: windowsForSave.length > 0 && useDurationWindows,
                duration_windows: windowsForSave,
                use_patchset_windows: patchsetWindowsForSave.length > 0 && usePatchsetWindows,
                patchset_windows: patchsetWindowsForSave,
              })}
              disabled={updateMutation.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save patchset settings'}
            </Button>
          </Stack>
        </SectionCard>
      </Stack>
    </Box>
  );
};

const getSaveErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Unable to save duration windows.';
  }

  const responseData = error.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const detail = (responseData as { detail?: unknown; message?: unknown; error?: unknown }).detail
      ?? (responseData as { message?: unknown }).message
      ?? (responseData as { error?: unknown }).error;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }

  return error.message || 'Unable to save duration windows.';
};
export default SettingsPage;
