import { Box, FormControlLabel, Switch, Stack } from '@mui/material';
import DateRangePicker from './DateRangePicker';
import RepositorySelector from './RepositorySelector';
import TopicSelector from './TopicSelector';
import DeveloperSelector from './DeveloperSelector';

interface FilterBarProps {
  developerOptions: string[];
  repositoryOptions: string[];
  topicOptions: string[];
  selectedDeveloper: string | null;
  selectedRepositories: string[];
  selectedTopics: string[];
  startDate: string;
  endDate: string;
  live: boolean;
  onDeveloperChange: (value: string | null) => void;
  onRepositoryChange: (value: string[]) => void;
  onTopicChange: (value: string[]) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onLiveChange: (value: boolean) => void;
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
  onDeveloperChange,
  onRepositoryChange,
  onTopicChange,
  onStartDateChange,
  onEndDateChange,
  onLiveChange,
}) => (
  <Stack spacing={3} sx={{ mb: 4 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" justifyContent="space-between">
      <DeveloperSelector developers={developerOptions} value={selectedDeveloper} onChange={onDeveloperChange} />
      <RepositorySelector repositories={repositoryOptions} value={selectedRepositories} onChange={onRepositoryChange} />
      <TopicSelector topics={topicOptions} value={selectedTopics} onChange={onTopicChange} />
      <FormControlLabel
        control={<Switch checked={live} onChange={(event) => onLiveChange(event.target.checked)} />}
        label="Live only"
      />
    </Stack>
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
    />
  </Stack>
);

export default FilterBar;
