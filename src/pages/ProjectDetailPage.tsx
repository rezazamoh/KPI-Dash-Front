import { Box, Grid, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProject, fetchProjectDevelopers, fetchProjectTopics } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import ComparisonTable from '@/components/ui/ComparisonTable';
import ChartCard from '@/components/ui/ChartCard';
import RelationshipGraph from '@/components/ui/RelationshipGraph';
import { ProjectDetailResponse } from '@/types/projects';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildProjectRelationshipGraph } from '@/utils/relationshipGraph';

const ProjectDetailPage: React.FC = () => {
  const { project } = useParams<{ project: string }>();
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [live, setLive] = useState(true);

  const projectName = project ?? '';

  const detailQuery = useQuery<ProjectDetailResponse | undefined>({
    queryKey: ['project-detail', projectName, selectedDevelopers, selectedTopics, startDate, endDate, live],
    queryFn: async () => {
      if (!projectName) return undefined;

      const params: Record<string, unknown> = {};
      if (selectedDevelopers.length > 0) {
        params.username = selectedDevelopers;
      }
      if (selectedTopics.length > 0) {
        params.topic = selectedTopics;
      }
      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }
      params.live = live;

      return fetchProject(projectName, params);
    },
    enabled: Boolean(projectName),
  });

  const developersQuery = useQuery<string[]>({
    queryKey: ['project-developers', projectName],
    queryFn: async () => {
      if (!projectName) {
        return [];
      }
      return fetchProjectDevelopers(projectName);
    },
    enabled: Boolean(projectName),
  });

  const topicsQuery = useQuery<string[]>({
    queryKey: ['project-topics', projectName, selectedDevelopers],
    queryFn: async () => {
      if (!projectName || selectedDevelopers.length === 0) {
        return [];
      }
      return fetchProjectTopics(projectName, selectedDevelopers);
    },
    enabled: Boolean(projectName) && selectedDevelopers.length > 0,
  });

  const developerOptions = developersQuery.data ?? [];
  const topicOptions = topicsQuery.data ?? [];
  const relationshipGraph = useMemo(() => {
    if (!detailQuery.data) {
      return { nodes: [], edges: [] };
    }
    return buildProjectRelationshipGraph(detailQuery.data);
  }, [detailQuery.data]);

  if (detailQuery.isLoading || developersQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (detailQuery.error) {
    return <ErrorPanel message="Unable to load project details." />;
  }

  if (!detailQuery.data) {
    return <ErrorPanel message="Project not found or no project data available." />;
  }

  const data = detailQuery.data;
  const developerRows = Object.entries(data.developers ?? {}).map(([username, metrics]) => ({
    username,
    changes: metrics?.change_count ?? 0,
    patchsets: metrics?.average_patchsets ?? 0,
    failureRate: metrics?.build_failure_rate?.overall_failure_rate ?? 0,
  }));

  const chartRows = Object.entries(data.developers ?? {}).map(([username, metrics]) => ({
    name: username,
    changes: metrics?.change_count ?? 0,
    failureRate: metrics?.build_failure_rate?.overall_failure_rate ?? 0,
  }));

  return (
    <Box>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4">Project: {projectName}</Typography>
          <Typography color="text.secondary">Developer metrics for selected project.</Typography>
        </Stack>

        <FilterBar
          developerOptions={developerOptions}
          repositoryOptions={[projectName]}
          topicOptions={topicOptions}
          selectedDeveloper={selectedDevelopers}
          selectedRepositories={[]}
          selectedTopics={selectedTopics}
          startDate={startDate}
          endDate={endDate}
          live={live}
          showRepositorySelector={false}
          showTopicSelector
          topicDisabled={selectedDevelopers.length === 0}
          developerMultiple
          onDeveloperChange={(value) => {
            const nextDevelopers = Array.isArray(value) ? value : value ? [value] : [];
            setSelectedDevelopers(nextDevelopers);
            setSelectedTopics([]);
          }}
          onRepositoryChange={() => undefined}
          onTopicChange={setSelectedTopics}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLiveChange={setLive}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard title="Developers returned" value={developerRows.length} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Active developers" value={data.filters.developers?.length ?? developerRows.length} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Live mode" value={live ? 'Enabled' : 'Disabled'} />
          </Grid>
        </Grid>

        <SectionCard title="Developer collaboration graph">
          <RelationshipGraph
            title="Project collaboration network"
            subtitle="Each node is a developer in this project; edge thickness reflects combined review and comment interactions."
            nodes={relationshipGraph.nodes}
            edges={relationshipGraph.edges}
          />
        </SectionCard>

        <SectionCard title="Developer comparison">
          <ComparisonTable
            columns={[
              { key: 'username', label: 'Developer' },
              { key: 'changes', label: 'Change count' },
              { key: 'patchsets', label: 'Avg patchsets' },
              { key: 'failureRate', label: 'Failure rate (%)' },
            ]}
            rows={developerRows}
          />
        </SectionCard>

        <ChartCard title="Developer comparison charts">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartRows} margin={{ left: 0, right: 0, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="#cfd8fc" />
              <YAxis stroke="#cfd8fc" />
              <Tooltip />
              <Bar dataKey="changes" fill="#00bcd4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Stack>
    </Box>
  );
};

export default ProjectDetailPage;
