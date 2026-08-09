import {
  Box,
  Chip,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProject, fetchProjectDevelopers, fetchProjectTopics } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import ChartCard from '@/components/ui/ChartCard';
import RelationshipGraph from '@/components/ui/RelationshipGraph';
import { ProjectDetailResponse } from '@/types/projects';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildProjectRelationshipGraph } from '@/utils/relationshipGraph';
import { getDefaultLiveValue } from '@/utils/livePreference';

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) {
    return 'Any time';
  }
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const sumPeople = (people: Array<{ username: string; count: number }> | null | undefined) =>
  people?.reduce((sum, item) => sum + item.count, 0) ?? 0;

const ProjectDetailPage: React.FC = () => {
  const { project } = useParams<{ project: string }>();
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [live, setLive] = useState(getDefaultLiveValue);

  const [draftDevelopers, setDraftDevelopers] = useState<string[]>([]);
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftLive, setDraftLive] = useState(getDefaultLiveValue);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);

  const projectName = project ?? '';

  useEffect(() => {
    setDraftDevelopers(selectedDevelopers);
    setDraftTopics(selectedTopics);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftLive(live);
  }, [selectedDevelopers, selectedTopics, startDate, endDate, live]);

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
      if (!projectName) return [];
      return fetchProjectDevelopers(projectName);
    },
    enabled: Boolean(projectName),
  });

  const topicsQuery = useQuery<string[]>({
    queryKey: ['project-topics', projectName, draftDevelopers],
    queryFn: async () => {
      if (!projectName || draftDevelopers.length === 0) {
        return [];
      }
      return fetchProjectTopics(projectName, draftDevelopers);
    },
    enabled: Boolean(projectName) && draftDevelopers.length > 0 && topicMenuOpen,
  });

  const developerOptions = developersQuery.data ?? [];
  const topicOptions = topicsQuery.data ?? [];

  const data = detailQuery.data;

  const interactionGraph = useMemo(
    () => (data ? buildProjectRelationshipGraph(data) : { nodes: [], edges: [] }),
    [data],
  );

  const developerMetrics = useMemo(() => data?.developers ?? {}, [data]);

  const projectOverview = useMemo(() => {
    const statusTotals = new Map<string, number>();
    const repoTotals = new Map<
      string,
      {
        total: number;
        statuses: Record<string, number>;
        developers: Set<string>;
      }
    >();
    const collaboratorTotals = new Map<string, { reviews: number; comments: number; total: number }>();

    let totalChanges = 0;

    Object.entries(developerMetrics).forEach(([developer, metrics]) => {
      totalChanges += metrics.change_count ?? 0;

      Object.entries(metrics.changes_by_status_per_repo ?? {}).forEach(([status, repos]) => {
        Object.entries(repos).forEach(([repo, count]) => {
          const repoEntry = repoTotals.get(repo) ?? {
            total: 0,
            statuses: {},
            developers: new Set<string>(),
          };
          repoEntry.total += count;
          repoEntry.statuses[status] = (repoEntry.statuses[status] ?? 0) + count;
          repoEntry.developers.add(developer);
          repoTotals.set(repo, repoEntry);
          statusTotals.set(status, (statusTotals.get(status) ?? 0) + count);
        });
      });

      const metricsWithPeople = [
        { metric: metrics.review_requests_sent, field: 'reviews' as const },
        { metric: metrics.review_requests_received, field: 'reviews' as const },
        { metric: metrics.comments_sent, field: 'comments' as const },
        { metric: metrics.comments_received, field: 'comments' as const },
      ];

      metricsWithPeople.forEach(({ metric, field }) => {
        metric?.people.forEach((person) => {
          const existing = collaboratorTotals.get(person.username) ?? { reviews: 0, comments: 0, total: 0 };
          if (field === 'reviews') {
            existing.reviews += person.count;
          } else {
            existing.comments += person.count;
          }
          existing.total += person.count;
          collaboratorTotals.set(person.username, existing);
        });
      });
    });

    const topStatuses = Array.from(statusTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([status, count]) => ({ status, count }));

    const repositoryDetails = Array.from(repoTotals.entries())
      .map(([repo, record]) => ({
        repo,
        total: record.total,
        statuses: record.statuses,
        developerCount: record.developers.size,
      }))
      .sort((a, b) => b.total - a.total);

    const topCollaborators = Array.from(collaboratorTotals.entries())
      .map(([username, totals]) => ({ username, ...totals }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      totalDevelopers: Object.keys(developerMetrics).length,
      totalChanges,
      repositoryCount: repoTotals.size,
      topStatuses,
      repositoryDetails,
      topCollaborators,
    };
  }, [developerMetrics]);

  const developerRows = useMemo(
    () =>
      Object.entries(developerMetrics)
        .map(([username, metrics]) => {
          const reviewSent = sumPeople(metrics.review_requests_sent?.people);
          const reviewReceived = sumPeople(metrics.review_requests_received?.people);
          const commentsSent = sumPeople(metrics.comments_sent?.people);
          const commentsReceived = sumPeople(metrics.comments_received?.people);
          const interactionCount = reviewSent + reviewReceived + commentsSent + commentsReceived;

          return {
            username,
            changeCount: metrics.change_count ?? 0,
            patchsets: metrics.average_patchsets,
            failureRate: formatPercent(metrics.build_failure_rate?.overall_failure_rate),
            leadTime: metrics.lead_time?.mean ? `${metrics.lead_time.mean.toFixed(1)}h` : '—',
            interactions: interactionCount,
          };
        })
        .sort((a, b) => b.changeCount - a.changeCount),
    [developerMetrics],
  );

  const developerChartData = useMemo(
    () =>
      Object.entries(developerMetrics).map(([username, metrics]) => ({
        name: username,
        changes: metrics.change_count ?? 0,
      })),
    [developerMetrics],
  );

  const filterSummary = useMemo(() => {
    const activeDevelopers = selectedDevelopers.length ? `${selectedDevelopers.length} selected` : 'All developers';
    const activeTopics = selectedTopics.length ? `${selectedTopics.length} selected` : 'All topics';
    const activeDateRange = startDate || endDate ? `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}` : 'Any time';
    return { activeDevelopers, activeTopics, activeDateRange };
  }, [selectedDevelopers, selectedTopics, startDate, endDate]);

  if (detailQuery.isLoading || developersQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (detailQuery.error) {
    return <ErrorPanel message="Unable to load project details." />;
  }

  if (!data) {
    return <ErrorPanel message="Project not found or no project data available." />;
  }

  const handleApplyFilters = () => {
    setSelectedDevelopers(draftDevelopers);
    setSelectedTopics(draftTopics);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setLive(draftLive);
  };

  const handleResetFilters = () => {
    setDraftDevelopers(selectedDevelopers);
    setDraftTopics(selectedTopics);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftLive(getDefaultLiveValue());
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Project details: {projectName}</Typography>
          <Typography color="text.secondary">
            Explore change activity, repository status, and developer collaboration for this project.
          </Typography>
        </Stack>

        <SectionCard title="Active filters">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={filterSummary.activeDevelopers} />
            <Chip label={filterSummary.activeTopics} />
            <Chip label={filterSummary.activeDateRange} />
            <Chip label={live ? 'Live data' : 'Cached data'} color={live ? 'success' : 'default'} />
          </Stack>
        </SectionCard>

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
          draftDeveloper={draftDevelopers}
          draftRepositories={[]}
          draftTopics={draftTopics}
          draftStartDate={draftStartDate}
          draftEndDate={draftEndDate}
          draftLive={draftLive}
          showRepositorySelector={false}
          showTopicSelector
          topicDisabled={draftDevelopers.length === 0}
          developerMultiple
          onDeveloperChange={(value) => {
            const nextDevelopers = Array.isArray(value) ? value : value ? [value] : [];
            setDraftDevelopers(nextDevelopers);
            setDraftTopics([]);
          }}
          onRepositoryChange={() => undefined}
          onTopicChange={setDraftTopics}
          onStartDateChange={setDraftStartDate}
          onEndDateChange={setDraftEndDate}
          onLiveChange={setDraftLive}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onTopicMenuOpenChange={setTopicMenuOpen}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Developers in view"
              value={projectOverview.totalDevelopers}
              subtitle={selectedDevelopers.length ? `${selectedDevelopers.length} selected` : 'All developers'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Total changes" value={projectOverview.totalChanges} />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Repositories touched" value={projectOverview.repositoryCount} />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard title="Live mode" value={live ? 'Enabled' : 'Disabled'} />
          </Grid>
        </Grid>

        <SectionCard title="Project status overview">
          <Grid container spacing={2}>
            {projectOverview.topStatuses.map((statusItem) => (
              <Grid item xs={12} sm={6} md={4} key={statusItem.status}>
                <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    {statusItem.status}
                  </Typography>
                  <Typography variant="h5">{statusItem.count}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </SectionCard>

        <SectionCard title="Repository activity">
          <Box sx={{ maxHeight: 420, overflowY: 'auto', px: 1, py: 0.5 }}>
            {projectOverview.repositoryDetails.length ? (
              <Stack spacing={2}>
                {projectOverview.repositoryDetails.slice(0, 12).map((repoItem) => (
                  <Paper
                    key={repoItem.repo}
                    sx={{
                      p: 2,
                      display: 'grid',
                      gap: 1,
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {repoItem.repo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {repoItem.developerCount} contributors • {repoItem.total} changes
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" sx={{ minWidth: 180 }}>
                      {Object.entries(repoItem.statuses)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([status, count]) => (
                          <Chip key={status} label={`${status}: ${count}`} size="small" />
                        ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No repository activity is available for the current selection.</Typography>
            )}
          </Box>
        </SectionCard>

        <SectionCard title="Developer contribution snapshot">
          <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Developer</TableCell>
                  <TableCell align="right">Changes</TableCell>
                  <TableCell align="right">Avg patchsets</TableCell>
                  <TableCell align="right">Failure rate</TableCell>
                  <TableCell align="right">Lead time</TableCell>
                  <TableCell align="right">Interactions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {developerRows.map((row) => (
                  <TableRow key={row.username} hover>
                    <TableCell>
                      <Link component={RouterLink} to={`/developers/${encodeURIComponent(row.username)}`} underline="hover">
                        {row.username}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{row.changeCount}</TableCell>
                    <TableCell align="right">{row.patchsets}</TableCell>
                    <TableCell align="right">{row.failureRate}</TableCell>
                    <TableCell align="right">{row.leadTime}</TableCell>
                    <TableCell align="right">{row.interactions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <ChartCard title="Changes by developer">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={developerChartData} margin={{ left: 0, right: 0, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="#cfd8fc" />
              <YAxis stroke="#cfd8fc" />
              <Tooltip />
              <Bar dataKey="changes" fill="#00bcd4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <SectionCard title="Collaboration network">
          <RelationshipGraph
            title="Project collaboration network"
            subtitle="Developers connected by shared review and comment interactions."
            nodes={interactionGraph.nodes}
            edges={interactionGraph.edges}
          />
        </SectionCard>

        {projectOverview.topCollaborators.length > 0 ? (
          <SectionCard title="Top reviewer/commenter relationships">
            <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell align="right">Reviews</TableCell>
                    <TableCell align="right">Comments</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectOverview.topCollaborators.map((item) => (
                    <TableRow key={item.username} hover>
                      <TableCell>{item.username}</TableCell>
                      <TableCell align="right">{item.reviews}</TableCell>
                      <TableCell align="right">{item.comments}</TableCell>
                      <TableCell align="right">{item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        ) : null}
      </Stack>
    </Box>
  );
};

export default ProjectDetailPage;
