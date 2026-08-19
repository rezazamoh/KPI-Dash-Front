import {
  Box,
  Chip,
  Divider,
  Button,
  Collapse,
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
import { fetchProject } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
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
  const [showRawJson, setShowRawJson] = useState(false);

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
    staleTime: 5 * 60 * 1000
  });

  const data = detailQuery.data;
  const developerOptions = data?.developers ?? [];
  const topicOptions = data?.topics ?? [];

  const interactionGraph = useMemo(
    () => (data ? buildProjectRelationshipGraph(data) : { nodes: [], edges: [] }),
    [data],
  );

  const visibleProjectGraph = useMemo(() => {
    if (!interactionGraph.nodes.length || !interactionGraph.edges.length) {
      return { nodes: interactionGraph.nodes, edges: interactionGraph.edges, centerNodeId: null as string | null };
    }

    const topEdges = [...interactionGraph.edges].sort((a, b) => b.totalInteractions - a.totalInteractions).slice(0, 18);
    const nodeIds = new Set<string>();
    topEdges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    const centerNodeId = [...interactionGraph.nodes].sort((a, b) => b.activity - a.activity)[0]?.id ?? null;
    const allProjectNodes = interactionGraph.nodes;
    const visibleNodes = allProjectNodes.filter((node) => {
      const isStronglyConnected = nodeIds.has(node.id);
      const isCenter = node.id === centerNodeId;
      const isSmallNetwork = allProjectNodes.length <= 12;
      return isStronglyConnected || isCenter || isSmallNetwork;
    });

    return {
      nodes: visibleNodes.length ? visibleNodes : allProjectNodes,
      edges: topEdges,
      centerNodeId,
    };
  }, [interactionGraph]);

  const developerMetrics = useMemo(() => data?.developer_metrics ?? {}, [data]);

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
      .sort((a, b) => b.total - a.total);

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

  if (detailQuery.isLoading) {
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
          <Typography variant="h4">{projectName}</Typography>
          <Typography color="text.secondary">Explore change activity, repository status, and developer collaboration for this project.</Typography>
        </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={filterSummary.activeDevelopers} />
            <Chip label={filterSummary.activeTopics} />
            <Chip label={filterSummary.activeDateRange} />
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

        <SectionCard title="Developer contribution snapshot">
          <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Developer</TableCell>
                  <TableCell align="left">Changes</TableCell>
                  <TableCell align="left">Avg patchsets</TableCell>
                  <TableCell align="left">Failure rate</TableCell>
                  <TableCell align="left">Lead time</TableCell>
                  <TableCell align="left">Interactions (sent+recieved)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {developerRows.map((row) => (
                  <TableRow key={row.username} hover>
                    <TableCell>
                      <Link
                        component={RouterLink}
                        to={`/gerrit/developers/${encodeURIComponent(row.username)}?repo=${encodeURIComponent(projectName)}`}
                        underline="hover"
                      >
                        {row.username}
                      </Link>
                    </TableCell>
                    <TableCell align="left">{row.changeCount}</TableCell>
                    <TableCell align="left">{row.patchsets}</TableCell>
                    <TableCell align="left">{row.failureRate}</TableCell>
                    <TableCell align="left">{row.leadTime}</TableCell>
                    <TableCell align="left">{row.interactions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <ChartCard title="Changes by developer">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={developerChartData} margin={{left: 0, top: 20, bottom: 20 }}>
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
            nodes={visibleProjectGraph.nodes}
            edges={visibleProjectGraph.edges}
            centerNodeId={visibleProjectGraph.centerNodeId ?? undefined}
            nodeLinkHref={(node) => `/gerrit/developers/${encodeURIComponent(node.id)}?repo=${encodeURIComponent(projectName)}`}
          />
        </SectionCard>

        {projectOverview.topCollaborators.length > 0 ? (
          <SectionCard title="reviewer/commenter relationships">
            <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Person</TableCell>
                    <TableCell align="left">Reviews</TableCell>
                    <TableCell align="left">Comments</TableCell>
                    <TableCell align="left">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectOverview.topCollaborators.map((item) => (
                    <TableRow key={item.username} hover>
                      <TableCell>{item.username}</TableCell>
                      <TableCell align="left">{item.reviews}</TableCell>
                      <TableCell align="left">{item.comments}</TableCell>
                      <TableCell align="left">{item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        ) : null}
      </Stack>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowRawJson((current) => !current)}
            >
              {showRawJson ? 'Hide raw response' : 'Show raw response'}
            </Button>
            <Collapse in={showRawJson}>
              <Paper sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 360, overflowY: 'auto' }}>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', fontSize: '0.85rem' }}>
                  {JSON.stringify(data, null, 2)}
                </Box>
              </Paper>
            </Collapse>
          </Grid>
        </Grid>
    </Box>
  );
};

export default ProjectDetailPage;
