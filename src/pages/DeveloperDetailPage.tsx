import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDeveloper, fetchDevelopers } from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import ChartCard from '@/components/ui/ChartCard';
import MetricsTable from '@/components/ui/MetricsTable';
import { DeveloperDetailResponse } from '@/types/developers';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DeveloperDetailPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers });
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(username ?? null);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [live, setLive] = useState(true);
  const [groupByRepo, setGroupByRepo] = useState(false);
  const [groupByTopic, setGroupByTopic] = useState(false);

  const developerName = selectedDeveloper ?? username;

  const detailQuery = useQuery<DeveloperDetailResponse | undefined>({
    queryKey: ['developer-detail', developerName, selectedRepositories, selectedTopics, startDate, endDate, live, groupByRepo, groupByTopic],
    queryFn: async () => {
      if (!developerName) return undefined;
      return fetchDeveloper(developerName, {
        repo: selectedRepositories,
        topic: selectedTopics,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        group_by_repo: groupByRepo,
        group_by_topic: groupByTopic,
        live,
      });
    },
    enabled: Boolean(developerName),
  });

  const repositories = useMemo(() => [], []);
  const topics = useMemo(() => [], []);

  if (developersQuery.isLoading || detailQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (developersQuery.error || detailQuery.error) {
    return <ErrorPanel message="Unable to load developer details." />;
  }

  if (!developerName || !detailQuery.data) {
    return <ErrorPanel message="Developer is not selected or data is unavailable." />;
  }

  const data = detailQuery.data;
  const metrics = data.overall_performance;

  const leadTimeSeries = metrics.lead_time ? [
    { name: 'Min', value: metrics.lead_time.min?.hours ?? 0 },
    { name: 'Mean', value: metrics.lead_time.mean ?? 0 },
    { name: 'Max', value: metrics.lead_time.max?.hours ?? 0 },
  ] : [];

  const reviewRequestsReceived = metrics.review_requests_received?.people ?? [];
  const reviewRequestsSent = metrics.review_requests_sent?.people ?? [];
  const commentsReceived = metrics.comments_received?.people ?? [];
  const commentsSent = metrics.comments_sent?.people ?? [];

  return (
    <Box>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4">Developer: {developerName}</Typography>
          <Typography color="text.secondary">Performance snapshot for selected filters.</Typography>
        </Stack>

        <FilterBar
          developerOptions={developersQuery.data?.developers ?? []}
          repositoryOptions={repositories}
          topicOptions={topics}
          selectedDeveloper={developerName}
          selectedRepositories={selectedRepositories}
          selectedTopics={selectedTopics}
          startDate={startDate}
          endDate={endDate}
          live={live}
          onDeveloperChange={setSelectedDeveloper}
          onRepositoryChange={setSelectedRepositories}
          onTopicChange={setSelectedTopics}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLiveChange={setLive}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard title="Total changes" value={metrics.change_count} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Average patchsets" value={metrics.average_patchsets} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Build failure rate" value={metrics.build_failure_rate?.overall_failure_rate ?? 0 + '%'} subtitle="Overall failure rate" />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ChartCard title="Lead time hours">
              {leadTimeSeries.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leadTimeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="#cfd8fc" />
                    <YAxis stroke="#cfd8fc" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7c4dff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">Lead time data is unavailable.</Typography>
              )}
            </ChartCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <SectionCard title="Review and comment summary">
              <Stack spacing={2}>
                <Typography color="text.secondary">Review requests received: {reviewRequestsReceived.length}</Typography>
                <Typography color="text.secondary">Review requests sent: {reviewRequestsSent.length}</Typography>
                <Typography color="text.secondary">Comments received: {commentsReceived.length}</Typography>
                <Typography color="text.secondary">Comments sent: {commentsSent.length}</Typography>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <MetricsTable
              columns={[
                { key: 'username', label: 'Reviewer' },
                { key: 'count', label: 'Count' },
              ]}
              rows={reviewRequestsReceived.map((item) => ({ username: item.username, count: item.count }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <MetricsTable
              columns={[
                { key: 'username', label: 'Commenter' },
                { key: 'count', label: 'Count' },
              ]}
              rows={commentsReceived.map((item) => ({ username: item.username, count: item.count }))}
            />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default DeveloperDetailPage;
