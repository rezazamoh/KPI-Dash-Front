import { Alert, Box, Button, Chip, Collapse, Divider, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDeveloper, fetchDeveloperTopics } from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import MetricsTable from '@/components/ui/MetricsTable';
import RelationshipGraph from '@/components/ui/RelationshipGraph';
import { buildDeveloperRelationshipGraph, CollaborationMode } from '@/utils/relationshipGraph';
import { DeveloperDetailResponse, PeopleStats } from '@/types/developers';
import { getDefaultLiveValue } from '@/utils/livePreference';

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(2)}%`;
};

const formatDeveloperTitle = (username: string) => {
  return username
    .split('.')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
    .join('. ');
};

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const sumPeople = (people: Array<{ username: string; count: number }>) =>
  people.reduce((sum, item) => sum + item.count, 0);

const buildPeopleSummary = (metric: PeopleStats | null | undefined) => {
  const people = metric?.people ?? [];
  if (!people.length) {
    return null;
  }

  const total = sumPeople(people);
  const most = people.reduce((best, item) => (item.count > best.count ? item : best), people[0]);
  const least = people.reduce((best, item) => (item.count < best.count ? item : best), people[0]);

  return {
    total,
    peopleCount: people.length,
    average: metric?.stats?.per_person?.mean ?? null,
    perChangeAverage: metric?.stats?.per_change?.mean ?? null,
    most,
    least,
  };
};

const DeveloperDetailPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const developerName = username ?? null;
  const location = useLocation();

  const repoFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      const repo = params.get('repo');
      return repo ? [repo] : [];
    } catch (e) {
      return [];
    }
  }, [location.search]);

  const [selectedRepositories, setSelectedRepositories] = useState<string[]>(repoFromQuery);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [live, setLive] = useState(getDefaultLiveValue);
  const [draftRepositories, setDraftRepositories] = useState<string[]>(repoFromQuery);
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftLive, setDraftLive] = useState(getDefaultLiveValue);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [collaborationMode, setCollaborationMode] = useState<CollaborationMode>('combined');
  const [showBuildFailureDetails, setShowBuildFailureDetails] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    setDraftRepositories(selectedRepositories);
    setDraftTopics(selectedTopics);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftLive(live);
  }, [selectedRepositories, selectedTopics, startDate, endDate, live]);

  // developerName is sourced from the route param `username`

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
    staleTime: 5 * 60 * 1000
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
    staleTime: 5 * 60 * 1000
  });

  const topicOptions = topicsQuery.data ?? [];

  const repositoryOptions = useMemo(() => {
    const projects = detailQuery.data?.overall_performance?.projects ?? [];
    const statusRepos = Object.values(detailQuery.data?.overall_performance?.changes_by_status_per_repo ?? {}).flatMap((repoMap) => Object.keys(repoMap));
    return Array.from(new Set([...projects.map((item) => item.project), ...statusRepos])).sort();
  }, [detailQuery.data?.overall_performance]);

  const data = detailQuery.data;
  const metrics = data?.overall_performance;

  const collaborationPeers = useMemo(() => {
    const peerSet = new Set<string>();
    const sent = metrics?.review_requests_sent?.people ?? [];
    const received = metrics?.review_requests_received?.people ?? [];
    const commentsOut = metrics?.comments_sent?.people ?? [];
    const commentsIn = metrics?.comments_received?.people ?? [];
    sent.forEach((item) => peerSet.add(item.username));
    received.forEach((item) => peerSet.add(item.username));
    commentsOut.forEach((item) => peerSet.add(item.username));
    commentsIn.forEach((item) => peerSet.add(item.username));
    return Array.from(peerSet).sort();
  }, [metrics]);

  const collaborationRows = useMemo(() => {
    return collaborationPeers.map((peer) => {
      const sentReviews = metrics?.review_requests_sent?.people.find((item) => item.username === peer)?.count ?? 0;
      const receivedReviews = metrics?.review_requests_received?.people.find((item) => item.username === peer)?.count ?? 0;
      const sentComments = metrics?.comments_sent?.people.find((item) => item.username === peer)?.count ?? 0;
      const receivedComments = metrics?.comments_received?.people.find((item) => item.username === peer)?.count ?? 0;
      return {
        username: peer,
        reviewSent: sentReviews,
        reviewReceived: receivedReviews,
        commentsSent: sentComments,
        commentsReceived: receivedComments,
        total: sentReviews + receivedReviews + sentComments + receivedComments,
      };
    }).sort((a, b) => b.total - a.total);
  }, [collaborationPeers, metrics]);

  const totalRepositories = useMemo(() => {
    const repoSet = new Set<string>();
    metrics?.projects.forEach((item) => repoSet.add(item.project));
    Object.values(metrics?.changes_by_status_per_repo ?? {}).forEach((repoMap) => {
      Object.keys(repoMap).forEach((repo) => repoSet.add(repo));
    });
    return repoSet.size;
  }, [metrics]);

  const repositoryRows = useMemo(() => {
    const repoStatus: Record<string, Record<string, number>> = {};
    Object.entries(metrics?.changes_by_status_per_repo ?? {}).forEach(([status, repos]) => {
      Object.entries(repos).forEach(([repo, count]) => {
        if (!repoStatus[repo]) {
          repoStatus[repo] = {};
        }
        repoStatus[repo][status] = count;
      });
    });

    return Array.from(new Set([...(metrics?.projects.map((item) => item.project) ?? []), ...Object.keys(repoStatus)])).map((repo) => {
      const projectEntry = metrics?.projects.find((item) => item.project === repo);
      const statuses = repoStatus[repo] ?? {};
      const totalFromStatuses = Object.values(statuses).reduce((sum, count) => sum + count, 0);
      return {
        repo,
        total: projectEntry?.changes ?? totalFromStatuses,
        statuses,
      };
    }).sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  }, [metrics]);

  const graphData = useMemo(
    () => (data ? buildDeveloperRelationshipGraph(developerName, data, collaborationMode) : { nodes: [], edges: [] }),
    [developerName, data, collaborationMode],
  );

  const reducedGraph = useMemo(() => {
    const edges = [...graphData.edges].sort((left, right) => right.weight - left.weight).slice(0, 10);
    const nodeIds = new Set<string>();
    edges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });
    return {
      nodes: graphData.nodes.filter((node) => nodeIds.has(node.id)),
      edges,
      totalEdges: graphData.edges.length,
    };
  }, [graphData]);

  const statusPalette: Record<string, string> = {
    MERGED: 'success.main',
    ABANDONED: 'error.main',
    OPEN: 'warning.main',
    DRAFT: 'info.main',
    NEEDS_REVIEW: 'secondary.main',
  };

  const filterSummary = useMemo(() => {
    const activeDevelopers = selectedRepositories.length ? `${selectedRepositories.length} selected` : 'All Repositories';
    const activeTopics = selectedTopics.length ? `${selectedTopics.length} selected` : 'All topics';
    const activeDateRange = startDate || endDate ? `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}` : 'Any time';
    return { activeDevelopers, activeTopics, activeDateRange };
  }, [selectedRepositories, selectedTopics, startDate, endDate]);

  if (detailQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (detailQuery.error) {
    return <ErrorPanel message="Unable to load developer details." />;
  }

  if (!developerName || !detailQuery.data || !metrics) {
    return <ErrorPanel message="Developer is not selected or data is unavailable." />;
  }

  const developerTitle = formatDeveloperTitle(data.username);

  const reviewRequestsReceivedSummary = buildPeopleSummary(metrics.review_requests_received);
  const commentsReceivedSummary = buildPeopleSummary(metrics.comments_received);

  const hasAnyCollaboration = collaborationRows.length > 0;
  const hasAnyActivity = metrics.change_count > 0 || hasAnyCollaboration;

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">{developerTitle}</Typography>
          <Typography color="text.secondary">Developer Performance</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={filterSummary.activeDevelopers} />
          <Chip label={filterSummary.activeTopics} />
          <Chip label={filterSummary.activeDateRange} />
        </Stack>
        <FilterBar
          showDeveloperSelector={false}
          selectedDeveloper={developerName}
          draftDeveloper={null}
          repositoryOptions={repositoryOptions}
          topicOptions={topicOptions}
          selectedRepositories={selectedRepositories}
          selectedTopics={selectedTopics}
          startDate={startDate}
          endDate={endDate}
          live={live}
          topicDisabled={draftRepositories.length === 0}
          draftRepositories={draftRepositories}
          draftTopics={draftTopics}
          draftStartDate={draftStartDate}
          draftEndDate={draftEndDate}
          draftLive={draftLive}
          onDeveloperChange={() => {}}
          onRepositoryChange={(value) => {
            setDraftRepositories(value);
            setDraftTopics([]);
          }}
          onTopicChange={setDraftTopics}
          onStartDateChange={setDraftStartDate}
          onEndDateChange={setDraftEndDate}
          onLiveChange={setDraftLive}
          onApplyFilters={() => {
            setSelectedRepositories(draftRepositories);
            setSelectedTopics(draftTopics);
            setStartDate(draftStartDate);
            setEndDate(draftEndDate);
            setLive(draftLive);
          }}
          onTopicMenuOpenChange={setTopicMenuOpen}
          onResetFilters={() => {
            setDraftRepositories([]);
            setDraftTopics([]);
            setDraftStartDate('');
            setDraftEndDate('');
            setDraftLive(getDefaultLiveValue());
            setSelectedRepositories([]);
            setSelectedTopics([]);
            setStartDate('');
            setEndDate('');
            setLive(getDefaultLiveValue());
          }}
        />

        {!hasAnyActivity && (
          <Alert severity="info">
            No activity found. {developerTitle} has no changes or collaboration data matching the current filters.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Changes"
              value={metrics.change_count}
              subtitle={metrics.change_count ? `Across ${totalRepositories} repositories` : 'No changes in selected scope'}
              accent="primary.main"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Avg. patchsets"
              value={metrics.average_patchsets.toFixed(2)}
              subtitle="Per change"
              accent="secondary.main"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Review response"
              value={metrics.reviewer_response_time ? `${metrics.reviewer_response_time.mean_hours.toFixed(2)} h` : '—'}
              subtitle={metrics.reviewer_response_time ? 'Average reviewer response time' : 'No data available'}
              accent="success.main"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Lead time"
              value={metrics.lead_time?.mean !== undefined && metrics.lead_time !== null ? `${metrics.lead_time.mean.toFixed(2)} h` : '—'}
              subtitle={metrics.lead_time ? 'Mean lead time' : 'No data available'}
              accent="info.main"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <SectionCard title="Repository activity">
              {repositoryRows.length ? (
                <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                  <Stack spacing={2}>
                    {repositoryRows.map((row) => {
                      const total = row.total ?? 0;
                      const segments = Object.entries(row.statuses).sort((a, b) => b[1] - a[1]);
                    return (
                      <Box key={row.repo} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                          <Box>
                            <Typography fontWeight={600}>
                              <Link component={RouterLink} to={`/gerrit/projects/${encodeURIComponent(row.repo)}`} underline="hover">
                                {row.repo}
                              </Link>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {total ? `${total} change${total === 1 ? '' : 's'}` : 'No changes recorded'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {segments.map(([status, value]) => `${status} ${value}`).join(' · ')}
                          </Typography>
                        </Stack>

                        {total ? (
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', height: 12, borderRadius: 1, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.06)' }}>
                              {segments.map(([status, count]) => (
                                <Box
                                  key={status}
                                  sx={{
                                    width: `${(count / total) * 100}%`,
                                    bgcolor: statusPalette[status] ?? 'primary.main',
                                  }}
                                  title={`${status}: ${count}`}
                                />
                              ))}
                            </Box>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                              {segments.map(([status, count]) => (
                                <Chip
                                  key={status}
                                  size="small"
                                  label={`${status} ${count}`}
                                  sx={{
                                    bgcolor: statusPalette[status] ?? 'rgba(144,202,249,0.18)',
                                    color: 'text.primary',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                  }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Array.from(new Set(Object.values(metrics.changes_by_status_per_repo ?? {}).flatMap((repoMap) => Object.keys(repoMap)))).map((status) => (
                      <Chip
                        key={status}
                        label={status}
                        size="small"
                        sx={{ bgcolor: statusPalette[status] ?? 'rgba(144,202,249,0.18)', color: 'text.primary' }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>
              ) : (
                <Typography color="text.secondary">No repository activity found for the current filters.</Typography>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard title="Review & delivery metrics">
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Reviewer response time
                  </Typography>
                  {metrics.reviewer_response_time ? (
                    <Stack spacing={2}>
                      <Typography variant="h4" sx={{ color: 'success.main' }}>
                        {metrics.reviewer_response_time.mean_hours.toFixed(2)} h
                      </Typography>
                      <Typography color="text.secondary">Average response time across the current selection.</Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Fastest: {metrics.reviewer_response_time.min_hours.toFixed(2)} h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average: {metrics.reviewer_response_time.mean_hours.toFixed(2)} h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Slowest: {metrics.reviewer_response_time.max_hours.toFixed(2)} h
                        </Typography>
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">No reviewer response time data available for this scope.</Typography>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Typography variant="subtitle2">Lead time</Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {metrics.lead_time?.mean !== undefined && metrics.lead_time !== null ? `${metrics.lead_time.mean.toFixed(2)} h` : '—'}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {metrics.lead_time ? (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Mean lead time across qualifying changes.
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                              <Typography variant="caption" color="text.secondary">
                                Fastest: {metrics.lead_time.min.hours.toFixed(2)} h
                                {metrics.lead_time.min.url ? (
                                  <Link href={metrics.lead_time.min.url} target="_blank" rel="noreferrer" underline="hover" sx={{ ml: 0.5 }}>
                                    view change
                                  </Link>
                                ) : null}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Slowest: {metrics.lead_time.max.hours.toFixed(2)} h
                                {metrics.lead_time.max.url ? (
                                  <Link href={metrics.lead_time.max.url} target="_blank" rel="noreferrer" underline="hover" sx={{ ml: 0.5 }}>
                                    view change
                                  </Link>
                                ) : null}
                              </Typography>
                            </Stack>
                          </>
                        ) : (
                          'No data available for lead time in this scope.'
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Typography variant="subtitle2">Build failure rate</Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {metrics.build_failure_rate?.overall_failure_rate !== undefined && metrics.build_failure_rate !== null
                          ? `${metrics.build_failure_rate.overall_failure_rate.toFixed(2)}%`
                          : '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {metrics.build_failure_rate
                          ? 'Overall failure rate for qualifying changes.'
                          : 'No qualifying changes were found for this metric in the selected scope.'}
                      </Typography>
                      {metrics.build_failure_rate ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setShowBuildFailureDetails((current) => !current)}
                          sx={{ mt: 1, px: 0 }}
                        >
                          {showBuildFailureDetails ? 'Hide failure details' : 'Show failure details'}
                        </Button>
                      ) : null}
                      <Collapse in={showBuildFailureDetails}>
                        {metrics.build_failure_rate ? (
                          <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.04)' }}>
                            <Typography variant="subtitle2">Build failure details</Typography>
                            <Stack spacing={1} sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Total changes with builds: {metrics.build_failure_rate.total_changes_with_builds}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total build outcomes: {metrics.build_failure_rate.total_outcomes}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Failed outcomes: {metrics.build_failure_rate.failed_outcomes}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Changes with failures: {metrics.build_failure_rate.changes_with_failures}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Changes failure rate: {metrics.build_failure_rate.changes_failure_rate.toFixed(2)}%
                              </Typography>
                              {Object.keys(metrics.build_failure_rate.by_label ?? {}).length ? (
                                <Box>
                                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                    Breakdown by label
                                  </Typography>
                                  <Stack spacing={1} sx={{ mt: 1 }}>
                                    {Object.entries(metrics.build_failure_rate.by_label).map(([label, detail]) => (
                                      <Typography key={label} variant="body2" color="text.secondary">
                                        {label}: {detail.failed}/{detail.total} failed ({detail.failure_rate.toFixed(2)}%)
                                      </Typography>
                                    ))}
                                  </Stack>
                                </Box>
                              ) : null}
                            </Stack>
                          </Box>
                        ) : null}
                      </Collapse>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
        <SectionCard title="File hotspots">
          <MetricsTable
            columns={[
              { key: 'file', label: 'File' },
              { key: 'changeCount', label: 'Changes' },
              { key: 'patchsetCount', label: 'Patchsets' },
              { key: 'linesAdded', label: 'Lines added' },
              { key: 'linesDeleted', label: 'Lines deleted' },
            ]}
            rows={(metrics.file_hotspots ?? []).map((file) => ({
              file: file.file,
              changeCount: file.change_count,
              patchsetCount: file.patchset_count,
              linesAdded: file.lines_added,
              linesDeleted: file.lines_deleted,
            }))}
          />
          </SectionCard>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SectionCard title="Collaboration network">
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  The graph highlights peer relationships by review and comment interaction counts.
                </Typography>
                {!hasAnyCollaboration ? (
                  <Typography color="text.secondary">No collaboration data is available for the selected filters.</Typography>
                ) : (
                  <>
                    <RelationshipGraph
                      nodes={reducedGraph.nodes}
                      edges={reducedGraph.edges}
                      title="Developer collaboration"
                      subtitle={`Top ${Math.min(reducedGraph.edges.length, 10)} relationships for ${collaborationMode}`}
                      centerNodeId={developerName}
                    />
                  </>
                )}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SectionCard title="Collaboration details">
              <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                <MetricsTable
                  columns={[
                    { key: 'username', label: 'Person' },
                    { key: 'reviewSent', label: 'Reviews sent' },
                    { key: 'reviewReceived', label: 'Reviews received' },
                    { key: 'commentsSent', label: 'Comments sent' },
                    { key: 'commentsReceived', label: 'Comments received' },
                    { key: 'total', label: 'Total' },
                  ]}
                  rows={collaborationRows}
                />
              </Box>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SectionCard title="Review request summary">
              {!reviewRequestsReceivedSummary ? (
                <Typography color="text.secondary">No review request metrics available for this scope.</Typography>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">Received</Typography>
                    <Typography>
                      {reviewRequestsReceivedSummary.most.username} · {reviewRequestsReceivedSummary.most.count} requests
                    </Typography>
                    <Typography color="text.secondary">
                      Average {reviewRequestsReceivedSummary.average?.toFixed(1)} requests/person
                    </Typography>
                    {reviewRequestsReceivedSummary.perChangeAverage !== null && reviewRequestsReceivedSummary.perChangeAverage !== undefined ? (
                      <Typography color="text.secondary">
                        Per change: {reviewRequestsReceivedSummary.perChangeAverage.toFixed(2)} requests/change
                      </Typography>
                    ) : null}
                    <Typography color="text.secondary">
                      Least: {reviewRequestsReceivedSummary.least.username} · {reviewRequestsReceivedSummary.least.count}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </SectionCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <SectionCard title="Comment summary">
              {!commentsReceivedSummary ? (
                <Typography color="text.secondary">No comment metrics available for this scope.</Typography>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">Received</Typography>
                    <Typography>
                      {commentsReceivedSummary.most.username} · {commentsReceivedSummary.most.count} comments
                    </Typography>
                    <Typography color="text.secondary">
                      Average {commentsReceivedSummary.average?.toFixed(1)} comments/person
                    </Typography>
                    {commentsReceivedSummary.perChangeAverage !== null && commentsReceivedSummary.perChangeAverage !== undefined ? (
                      <Typography color="text.secondary">
                        Per change: {commentsReceivedSummary.perChangeAverage.toFixed(2)} comments/change
                      </Typography>
                    ) : null}
                    <Typography color="text.secondary">
                      Least: {commentsReceivedSummary.least.username} · {commentsReceivedSummary.least.count}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>

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
      </Stack>
    </Box>
  );
};

export default DeveloperDetailPage;
