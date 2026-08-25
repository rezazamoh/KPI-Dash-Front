import { Button, FormControlLabel, Stack, Switch } from '@mui/material';
import RepositorySelector from './RepositorySelector';
import TopicSelector from './TopicSelector';
import DeveloperSelector from './DeveloperSelector';
import { Period } from '@/api/queryParams';
import PeriodSelector from '@/components/ui/Filters/PeriodSelector';

interface FilterBarProps {
  developerOptions: string[];
  repositoryOptions: string[];
  topicOptions: string[];
  selectedDeveloper: string | string[] | null;
  selectedRepositories: string[];
  selectedTopics: string[];
  periods: Period[];
  live: boolean;
  topicDisabled?: boolean;
  showRepositorySelector?: boolean;
  showTopicSelector?: boolean;
  showDeveloperSelector?: boolean;
  developerMultiple?: boolean;
  draftDeveloper: string | string[] | null;
  draftRepositories: string[];
  draftTopics: string[];
  draftPeriods: Period[];
  draftLive: boolean;
  onDeveloperChange: (value: string | string[] | null) => void;
  onRepositoryChange: (value: string[]) => void;
  onTopicChange: (value: string[]) => void;
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
  selectedDeveloper,
  selectedRepositories,
  selectedTopics,
  periods,
  live,
  topicDisabled = false,
  showRepositorySelector = true,
  showTopicSelector = true,
  showDeveloperSelector = true,
  developerMultiple = false,
  draftDeveloper,
  draftRepositories,
  draftTopics,
  draftPeriods,
  draftLive,
  onDeveloperChange,
  onRepositoryChange,
  onTopicChange,
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
      <Stack direction="row" spacing={1}>
        <PeriodSelector
          periods={draftPeriods}
          onChange={onPeriodsChange}
        />

        {/*<FormControlLabel
          control={
            <Switch
              checked={draftLive}
              onChange={(event) => onLiveChange(event.target.checked)}
            />
          }
          label="Live only"
        />*/}

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
