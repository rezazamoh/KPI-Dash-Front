import { Button, FormControlLabel, Stack, Switch } from '@mui/material';
import DateRangePicker from './DateRangePicker';
import RepositorySelector from './RepositorySelector';
import TopicSelector from './TopicSelector';
import DeveloperSelector from './DeveloperSelector';

interface FilterBarProps {
  developerOptions: string[];
  repositoryOptions: string[];
  topicOptions: string[];
  selectedDeveloper: string | string[] | null;
  selectedRepositories: string[];
  selectedTopics: string[];
  startDate: string;
  endDate: string;
  live: boolean;
  topicDisabled?: boolean;
  showRepositorySelector?: boolean;
  showTopicSelector?: boolean;
  developerMultiple?: boolean;
  draftDeveloper: string | string[] | null;
  draftRepositories: string[];
  draftTopics: string[];
  draftStartDate: string;
  draftEndDate: string;
  draftLive: boolean;
  onDeveloperChange: (value: string | string[] | null) => void;
  onRepositoryChange: (value: string[]) => void;
  onTopicChange: (value: string[]) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onLiveChange: (value: boolean) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onTopicMenuOpenChange: (open: boolean) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  developerOptions,
  repositoryOptions,
  topicOptions,
  selectedDeveloper,
  selectedRepositories,
  selectedTopics,
  startDate,
  endDate,
  live,
  topicDisabled = false,
  showRepositorySelector = true,
  showTopicSelector = true,
  developerMultiple = false,
  draftDeveloper,
  draftRepositories,
  draftTopics,
  draftStartDate,
  draftEndDate,
  draftLive,
  onDeveloperChange,
  onRepositoryChange,
  onTopicChange,
  onStartDateChange,
  onEndDateChange,
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
      <DeveloperSelector
        developers={developerOptions}
        value={draftDeveloper ?? selectedDeveloper}
        onChange={onDeveloperChange}
        multiple={developerMultiple}
      />
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
      <Stack direction="row" spacing={1}>
    <DateRangePicker
      startDate={draftStartDate}
      endDate={draftEndDate}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
    />
      <FormControlLabel
        control={<Switch checked={draftLive} onChange={(event) => onLiveChange(event.target.checked)} />}
        label="Live only"
      />
        <Button variant="outlined" size="small" onClick={onResetFilters}>
          Reset
        </Button>
        <Button variant="contained" size="small" onClick={onApplyFilters}>
          Apply
        </Button>
      </Stack>
    </Stack>
  </Stack>
);

export default FilterBar;
