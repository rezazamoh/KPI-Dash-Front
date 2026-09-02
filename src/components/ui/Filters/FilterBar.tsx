import { Button, Checkbox, FormControlLabel, FormGroup, Paper, Stack } from '@mui/material';
import RepositorySelector from './RepositorySelector';
import TopicSelector from './TopicSelector';
import DeveloperSelector from './DeveloperSelector';
import { Period } from '@/api/queryParams';
import PeriodSelector from '@/components/ui/Filters/PeriodSelector';

interface FilterBarProps {
  developerOptions: string[];
  repositoryOptions: string[];
  topicOptions: string[];
  statusOptions?: string[];
  selectedDeveloper: string | string[] | null;
  selectedRepositories: string[];
  selectedTopics: string[];
  selectedStatus?: string[];
  periods: Period[];
  live: boolean;
  topicDisabled?: boolean;
  showRepositorySelector?: boolean;
  showTopicSelector?: boolean;
  showDeveloperSelector?: boolean;
  showStatusSelector?: boolean;
  developerMultiple?: boolean;
  draftDeveloper: string | string[] | null;
  draftRepositories: string[];
  draftTopics: string[];
  draftStatus?: string[];
  draftPeriods: Period[];
  draftLive: boolean;
  onDeveloperChange: (value: string | string[] | null) => void;
  onRepositoryChange: (value: string[]) => void;
  onTopicChange: (value: string[]) => void;
  onStatusChange?: (value: string[]) => void;
  onPeriodsChange: (periods: Period[]) => void;
  onLiveChange: (value: boolean) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onTopicMenuOpenChange: (open: boolean) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  developerOptions,
  repositoryOptions,
  topicOptions,
  statusOptions = ['NEW', 'ABANDONED', 'MERGED'],
  selectedDeveloper,
  selectedRepositories,
  selectedTopics,
  selectedStatus = statusOptions,
  periods,
  live,
  topicDisabled = false,
  showRepositorySelector = true,
  showTopicSelector = true,
  showDeveloperSelector = true,
  showStatusSelector = true,
  developerMultiple = false,
  draftDeveloper,
  draftRepositories,
  draftTopics,
  draftStatus = selectedStatus,
  draftPeriods,
  draftLive,
  onDeveloperChange,
  onRepositoryChange,
  onTopicChange,
  onStatusChange,
  onPeriodsChange,
  onLiveChange,
  onApplyFilters,
  onResetFilters,
  onTopicMenuOpenChange,
}) => (
  <Stack spacing={3} sx={{ mb: 4 }}>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      flexWrap="wrap"
      alignItems={{ xs: 'stretch', md: 'center' }}
    >
      {showDeveloperSelector ? (
        <DeveloperSelector
          developers={developerOptions}
          value={draftDeveloper ?? selectedDeveloper}
          onChange={onDeveloperChange}
          multiple={developerMultiple}
        />
      ) : null}
      {showRepositorySelector ? (
        <RepositorySelector repositories={repositoryOptions} value={draftRepositories} onChange={onRepositoryChange} />
      ) : null}
      {showTopicSelector ? (
        <TopicSelector
          topics={topicOptions}
          value={draftTopics}
          onChange={onTopicChange}
          disabled={topicDisabled}
          onOpenChange={onTopicMenuOpenChange}
        />
      ) : null}
      {showStatusSelector ? (
        <Paper variant="outlined" sx={{ px: 1, py: 0.25 }}>
          <FormGroup row>
            {statusOptions.map((status) => {
              const checked = (draftStatus ?? selectedStatus ?? statusOptions).includes(status);
              return (
                <FormControlLabel
                  key={status}
                  sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(event) => {
                        const current = draftStatus ?? selectedStatus ?? statusOptions;
                        onStatusChange?.(
                          event.target.checked
                            ? [...current, status]
                            : current.filter((item) => item !== status),
                        );
                      }}
                    />
                  }
                  label={status}
                />
              );
            })}
          </FormGroup>
        </Paper>
      ) : null}
      <Stack direction="row" spacing={1}>
        <PeriodSelector
          periods={draftPeriods}
          onChange={onPeriodsChange}
        />
      </Stack>
      <Button
        variant="outlined"
        size="small"
        onClick={onResetFilters}
      >
        Reset
      </Button>

      <Button
        variant="contained"
        size="small"
        onClick={onApplyFilters}
      >
        Apply
      </Button>
    </Stack>
  </Stack>
);

export default FilterBar;
