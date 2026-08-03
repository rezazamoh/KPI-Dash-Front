import { Alert, Box, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDeveloper, fetchDeveloperTopics, fetchDevelopers } from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import ChartCard from '@/components/ui/ChartCard';
import MetricsTable from '@/components/ui/MetricsTable';
import { DeveloperDetailResponse } from '@/types/developers';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(2)}%`;
};

const DeveloperDetailPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers });
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(username ?? null);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [live, setLive] = useState(true);
  const [draftDeveloper, setDraftDeveloper] = useState<string | null>(username ?? null);
  const [draftRepositories, setDraftRepositories] = useState<string[]>([]);
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftLive, setDraftLive] = useState(true);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);

  useEffect(() => {
    setDraftDeveloper(selectedDeveloper);
    setDraftRepositories(selectedRepositories);
    setDraftTopics(selectedTopics);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftLive(live);
  }, [selectedDeveloper, selectedRepositories, selectedTopics, startDate, endDate, live]);

  const developerName = selectedDeveloper ?? username;

  const detailQuery = useQuery<DeveloperDetailResponse | undefined>({
    queryKey: ['developer-detail', developerName, selectedRepositories, selectedTopics, startDate, endDate, live],
    queryFn: async () => {
      if (!developerName) return undefined;
      return fetchDeveloper(developerName, {
        repo: selectedRepositories,
        topic: selectedTopics,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        live,
      });
    },
    enabled: Boolean(developerName),
  });

  const topicsQuery = useQuery<string[]>({
    queryKey: ['developer-topics', developerName, draftRepositories],
    queryFn: async () => {
      if (!developerName || draftRepositories.length === 0) {
        return [];
      }
      return fetchDeveloperTopics(developerName, draftRepositories);
    },
    enabled: Boolean(developerName) && draftRepositories.length > 0 && topicMenuOpen,
  });

  const topicOptions = topicsQuery.data ?? [];

  const repositoryOptions = useMemo(() => {
    const projects = detailQuery.data?.overall_performance?.projects ?? [];
    return Array.from(new Set(projects.map((item) => item.project).filter(Boolean))).sort();
  }, [detailQuery.data?.overall_performance?.projects]);

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

  const statusSeries = Object.entries(metrics.changes_by_status_per_repo ?? {}).map(([status, repos]) => ({
    name: status,
    value: Object.values(repos).reduce((total, count) => total + count, 0),
  }));

  const buildFailureSeries = Object.entries(metrics.build_failure_rate?.by_label ?? {}).map(([label, details]) => ({
    name: label,
    value: details.failure_rate,
  }));

  const reviewRequestsReceived = metrics.review_requests_received?.people ?? [];
  const reviewRequestsSent = metrics.review_requests_sent?.people ?? [];
  const commentsReceived = metrics.comments_received?.people ?? [];
  const commentsSent = metrics.comments_sent?.people ?? [];

  const repoBreakdown = Object.entries(data.grouped_by_repo ?? {}).map(([repo, repoMetrics]) => ({
    repo,
    changeCount: repoMetrics.change_count,
    averagePatchsets: repoMetrics.average_patchsets,
    leadTime: repoMetrics.lead_time?.mean ?? null,
    failureRate: repoMetrics.build_failure_rate?.overall_failure_rate ?? null,
  }));

  const selectedRepositoryLabel = selectedRepositories.length ? selectedRepositories.join(', ') : 'All repositories';
  const selectedTopicLabel = selectedTopics.length ? selectedTopics.join(', ') : 'All topics';

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">{developerName}</Typography>
          <Typography color="text.secondary">
            Snapshot from {new Date(data.snapshot_time).toLocaleString()} • {data.live ? 'Live data' : 'Historical snapshot'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={selectedRepositoryLabel} color="primary" variant="outlined" />
            <Chip label={selectedTopicLabel} color="secondary" variant="outlined" />
            <Chip label={data.filters.start_date ? `From ${data.filters.start_date}` : 'All dates'} variant="outlined" />
            <Chip label={data.filters.end_date ? `To ${data.filters.end_date}` : 'All dates'} variant="outlined" />
          </Stack>
        </Stack>

        <FilterBar
          developerOptions={developersQuery.data?.developers ?? []}
          repositoryOptions={repositoryOptions}
          topicOptions={topicOptions}
          selectedDeveloper={developerName}
          selectedRepositories={selectedRepositories}
          selectedTopics={selectedTopics}
          startDate={startDate}
          endDate={endDate}
          live={live}
          topicDisabled={draftRepositories.length === 0}
          draftDeveloper={draftDeveloper}
          draftRepositories={draftRepositories}
          draftTopics={draftTopics}
          draftStartDate={draftStartDate}
          draftEndDate={draftEndDate}
          draftLive={draftLive}
          onDeveloperChange={(value) => {
            setDraftDeveloper(value);
            setDraftRepositories([]);
            setDraftTopics([]);
          }}
          onRepositoryChange={(value) => {
            setDraftRepositories(value);
            setDraftTopics([]);
          }}
          onTopicChange={setDraftTopics}
          onStartDateChange={setDraftStartDate}
          onEndDateChange={setDraftEndDate}
          onLiveChange={setDraftLive}
          onApplyFilters={() => {
            setSelectedDeveloper(draftDeveloper);
            setSelectedRepositories(draftRepositories);
            setSelectedTopics(draftTopics);
            setStartDate(draftStartDate);
            setEndDate(draftEndDate);
            setLive(draftLive);
          }}
          onTopicMenuOpenChange={setTopicMenuOpen}
          onResetFilters={() => {
            setDraftDeveloper(username ?? null);
            setDraftRepositories([]);
            setDraftTopics([]);
            setDraftStartDate('');
            setDraftEndDate('');
            setDraftLive(true);
            setSelectedDeveloper(username ?? null);
            setSelectedRepositories([]);
            setSelectedTopics([]);
            setStartDate('');
            setEndDate('');
            setLive(true);
          }}
        />

        {!selectedRepositories.length && !selectedTopics.length && (
          <Alert severity="info">Select one or more repositories to enable topic filtering and explore repository-specific activity.</Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <MetricCard title="Total changes" value={metrics.change_count} accent="primary.main" />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Average patchsets" value={metrics.average_patchsets.toFixed(2)} accent="secondary.main" />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Mean lead time" value={metrics.lead_time?.mean ? `${metrics.lead_time.mean.toFixed(2)}h` : '—'} subtitle="Hours per change" />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Build failure rate" value={formatPercent(metrics.build_failure_rate?.overall_failure_rate)} subtitle="Overall failure rate" />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ChartCard title="Change status mix">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#cfd8fc" />
                  <YAxis stroke="#cfd8fc" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c4dff" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Lead time profile">
              {leadTimeSeries.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leadTimeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="#cfd8fc" />
                    <YAxis stroke="#cfd8fc" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3f8cff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">Lead time data is unavailable.</Typography>
              )}
            </ChartCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Top repositories">
              <Stack spacing={2}>
                {repoBreakdown.length ? repoBreakdown.slice(0, 6).map((repo) => (
                  <Box key={repo.repo} sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={600}>{repo.repo}</Typography>
                      <Chip size="small" label={`${repo.changeCount} changes`} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Avg patchsets: {repo.averagePatchsets.toFixed(2)} • Mean lead time: {repo.leadTime ? `${repo.leadTime.toFixed(2)}h` : '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Build failure rate: {repo.failureRate !== null ? formatPercent(repo.failureRate) : '—'}
                    </Typography>
                  </Box>
                )) : <Typography color="text.secondary">No repository breakdown is available.</Typography>}
              </Stack>
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Build health">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={buildFailureSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#cfd8fc" />
                  <YAxis stroke="#cfd8fc" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ff8a65">
                    {buildFailureSeries.map((entry) => (
                      <Cell key={entry.name} fill={entry.value > 10 ? '#ff5252' : '#ff8a65'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Review requests">
              <Stack spacing={2}>
                <Typography color="text.secondary">Received: {reviewRequestsReceived.length}</Typography>
                <Typography color="text.secondary">Sent: {reviewRequestsSent.length}</Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <MetricsTable
                columns={[
                  { key: 'username', label: 'Reviewer' },
                  { key: 'count', label: 'Count' },
                ]}
                rows={reviewRequestsReceived.map((item) => ({ username: item.username, count: item.count }))}
              />
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Comments">
              <Stack spacing={2}>
                <Typography color="text.secondary">Received: {commentsReceived.length}</Typography>
                <Typography color="text.secondary">Sent: {commentsSent.length}</Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <MetricsTable
                columns={[
                  { key: 'username', label: 'Commenter' },
                  { key: 'count', label: 'Count' },
                ]}
                rows={commentsReceived.map((item) => ({ username: item.username, count: item.count }))}
              />
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default DeveloperDetailPage;
