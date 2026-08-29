import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchDeveloper,
  fetchDeveloperTopics,
} from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import MetricsTable from '@/components/ui/MetricsTable';
import RelationshipGraph from '@/components/ui/RelationshipGraph';
import RelationshipTable from '@/components/ui/RelationshipTable';
import PeriodComparison from '@/components/ui/PeriodComparison';
import {
  buildDeveloperRelationshipGraph,
  CollaborationMode,
} from '@/utils/relationshipGraph';
import {
  PeopleStats,
} from '@/types/developers';
import { formatPeriodLabel } from '@/utils/formatPeriodLabel';
import { normalizePeriods } from '@/utils/periods';
import { formatDuration } from '@/utils/formatDuration';
import { getDefaultLiveValue } from '@/utils/livePreference';
import {
  buildComparisonRows,
  cardDefinitions,
  formatPercent,
} from '@/metrics/types';
import { developerMetrics } from '@/metrics/developerMetrics';
import { Period } from '@/types/periods';

const formatDeveloperTitle = (
  username: string,
) => {
  return username
    .split('.')
    .map((part) =>
      part
        ? `${part[0].toUpperCase()}${part.slice(1)}`
        : '',
    )
    .join('. ');
};

const sumPeople = (
  people: Array<{
    username: string;
    count: number;
  }>,
) =>
  people.reduce(
    (sum, item) => sum + item.count,
    0,
  );

const buildPeopleSummary = (
  metric: PeopleStats | null | undefined,
) => {
  const people = metric?.people ?? [];

  if (!people.length) {
    return null;
  }

  const total = sumPeople(people);

  const most = people.reduce(
    (best, item) =>
      item.count > best.count
        ? item
        : best,
    people[0],
  );

  const least = people.reduce(
    (best, item) =>
      item.count < best.count
        ? item
        : best,
    people[0],
  );

  return {
    total,
    peopleCount: people.length,
    average:
      metric?.stats?.per_person?.mean ??
      null,
    perChangeAverage:
      metric?.stats?.per_change?.mean ??
      null,
    most,
    least,
  };
};

const DeveloperDetailPage: React.FC = () => {
  const { username } = useParams<{
    username: string;
  }>();

  const developerName = username ?? null;

  const location = useLocation();

  const repoFromQuery = useMemo(() => {
    const params = new URLSearchParams(
      location.search,
    );

    const repo = params.get('repo');

    return repo ? [repo] : [];
  }, [location.search]);

  const [
    selectedRepositories,
    setSelectedRepositories,
  ] = useState<string[]>(repoFromQuery);

  const [
    selectedTopics,
    setSelectedTopics,
  ] = useState<string[]>([]);

  const [periods, setPeriods] = useState<
    Period[]
  >([]);

  const [
    draftPeriods,
    setDraftPeriods,
  ] = useState<Period[]>([]);

  const [
    selectedPeriodIndex,
    setSelectedPeriodIndex,
  ] = useState(0);

  const [live, setLive] =
    useState(getDefaultLiveValue);

  const [
    draftRepositories,
    setDraftRepositories,
  ] = useState<string[]>(repoFromQuery);

  const [
    draftTopics,
    setDraftTopics,
  ] = useState<string[]>([]);

  const [
    draftLive,
    setDraftLive,
  ] = useState(getDefaultLiveValue);

  const [
    topicMenuOpen,
    setTopicMenuOpen,
  ] = useState(false);

  const [
    collaborationMode,
    setCollaborationMode,
  ] = useState<CollaborationMode>('combined');

  const [
    showBuildFailureDetails,
    setShowBuildFailureDetails,
  ] = useState(false);

  const [
    showRawJson,
    setShowRawJson,
  ] = useState(false);

  useEffect(() => {
    setDraftRepositories(
      selectedRepositories,
    );

    setDraftTopics(selectedTopics);

    setDraftPeriods(periods);

    setDraftLive(live);
  }, [
    selectedRepositories,
    selectedTopics,
    periods,
    live,
  ]);

  useEffect(() => {
    setSelectedPeriodIndex((current) => {
      if (current >= periods.length) {
        return 0;
      }

      return current;
    });
  }, [periods.length]);

  const detailQuery = useQuery({
    queryKey: [
      'developer-detail',
      developerName,
      selectedRepositories,
      selectedTopics,
      periods,
      live,
    ],

    queryFn: async () => {
      if (!developerName) {
        return undefined;
      }

      return fetchDeveloper(
        developerName,
        {
          repo: selectedRepositories,
          topic: selectedTopics,
          periods: normalizePeriods(
            periods,
          ),
          live,
        },
      );
    },

    enabled: Boolean(developerName),

    staleTime: 5 * 60 * 1000,
  });

  const topicsQuery = useQuery<string[]>({
    queryKey: [
      'developer-topics',
      developerName,
      draftRepositories,
    ],

    queryFn: async () => {
      if (
        !developerName ||
        draftRepositories.length === 0
      ) {
        return [];
      }

      return fetchDeveloperTopics(
        developerName,
        draftRepositories,
      );
    },

    enabled:
      Boolean(developerName) &&
      draftRepositories.length > 0 &&
      topicMenuOpen,

    staleTime: 5 * 60 * 1000,
  });

  const periodResults = useMemo(() => {
    const result = detailQuery.data;

    if (!result) {
      return [];
    }

    return Array.isArray(result)
      ? result
      : [result];
  }, [detailQuery.data]);

  const selectedPeriod =
    periodResults[selectedPeriodIndex] ??
    periodResults[0] ??
    null;

  const data = selectedPeriod?.metrics ?? null;

  const metrics =
    data?.overall_performance ?? null;

  const topicOptions =
    topicsQuery.data ??
    data?.topics ??
    [];

  const repositoryOptions = useMemo(() => {
    const projects =
      metrics?.projects ?? [];

    const statusRepos = Object.values(
      metrics?.changes_by_status_per_repo ??
        {},
    ).flatMap((repoMap) =>
      Object.keys(repoMap),
    );

    return Array.from(
      new Set([
        ...projects.map(
          (item) => item.project,
        ),
        ...statusRepos,
      ]),
    ).sort();
  }, [metrics]);

  const comparisonRows = useMemo(
    () =>
      buildComparisonRows(
        periodResults,
        periods,
        (result) => {
          const overall =
            result?.overall_performance ?? null;
          return overall ? [overall] : [];
        },
        developerMetrics,
      ),
    [periodResults, periods],
  );

  const collaborationPeers = useMemo(() => {
    const peerSet = new Set<string>();

    const sent =
      metrics?.review_requests_sent?.people ??
      [];

    const received =
      metrics?.review_requests_received?.people ??
      [];

    const commentsOut =
      metrics?.comments_sent?.people ?? [];

    const commentsIn =
      metrics?.comments_received?.people ??
      [];

    sent.forEach((item) =>
      peerSet.add(item.username),
    );

    received.forEach((item) =>
      peerSet.add(item.username),
    );

    commentsOut.forEach((item) =>
      peerSet.add(item.username),
    );

    commentsIn.forEach((item) =>
      peerSet.add(item.username),
    );

    return Array.from(peerSet).sort();
  }, [metrics]);

const collaborationRows = useMemo(() => {
  return collaborationPeers
    .map((peer) => {
      const sentReview =
        metrics?.review_requests_sent?.people.find(
          (item) => item.username === peer,
        );

      const receivedReview =
        metrics?.review_requests_received?.people.find(
          (item) => item.username === peer,
        );

      const sentComments =
        metrics?.comments_sent?.people.find(
          (item) => item.username === peer,
        );

      const receivedComments =
        metrics?.comments_received?.people.find(
          (item) => item.username === peer,
        );

      const reviewSent =
        sentReview?.count ?? 0;

      const reviewReceived =
        receivedReview?.count ?? 0;

      const commentsSent =
        sentComments?.count ?? 0;

      const commentsReceived =
        receivedComments?.count ?? 0;

      return {
        username: peer,

        reviewSent,
        reviewReceived,
        commentsSent,
        commentsReceived,

        total:
          reviewSent +
          reviewReceived +
          commentsSent +
          commentsReceived,

        breakdowns: {
          reviewSent: sentReview?.by_label,
          reviewReceived:
            receivedReview?.by_label,
          commentsSent:
            sentComments?.by_label,
          commentsReceived:
            receivedComments?.by_label,
        },
      };
    })
    .sort((a, b) => b.total - a.total);
}, [collaborationPeers, metrics]);
  const totalRepositories = useMemo(() => {
    const repoSet = new Set<string>();

    metrics?.projects.forEach((item) =>
      repoSet.add(item.project),
    );

    Object.values(
      metrics?.changes_by_status_per_repo ??
        {},
    ).forEach((repoMap) => {
      Object.keys(repoMap).forEach(
        (repo) => repoSet.add(repo),
      );
    });

    return repoSet.size;
  }, [metrics]);

  const repositoryRows = useMemo(() => {
    const repoStatus: Record<
      string,
      Record<string, number>
    > = {};

    Object.entries(
      metrics?.changes_by_status_per_repo ??
        {},
    ).forEach(([status, repos]) => {
      Object.entries(repos).forEach(
        ([repo, count]) => {
          if (!repoStatus[repo]) {
            repoStatus[repo] = {};
          }

          repoStatus[repo][status] = count;
        },
      );
    });

    const repos = new Set([
      ...(metrics?.projects.map(
        (item) => item.project,
      ) ?? []),
      ...Object.keys(repoStatus),
    ]);

    return Array.from(repos)
      .map((repo) => {
        const projectEntry =
          metrics?.projects.find(
            (item) =>
              item.project === repo,
          );

        const statuses =
          repoStatus[repo] ?? {};

        const totalFromStatuses =
          Object.values(statuses).reduce(
            (sum, count) =>
              sum + count,
            0,
          );

        return {
          repo,
          total:
            projectEntry?.changes ??
            totalFromStatuses,
          statuses,
        };
      })
      .sort(
        (a, b) =>
          (b.total ?? 0) -
          (a.total ?? 0),
      );
  }, [metrics]);

  const graphData = useMemo(
    () =>
      data
        ? buildDeveloperRelationshipGraph(
            developerName,
            data,
            collaborationMode,
          )
        : {
            nodes: [],
            edges: [],
          },
    [
      developerName,
      data,
      collaborationMode,
    ],
  );

  const reducedGraph = useMemo(() => {
    const edges = [
      ...graphData.edges,
    ]
      .sort(
        (left, right) =>
          right.weight - left.weight,
      )
      .slice(0, 10);

    const nodeIds = new Set<string>();

    edges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    return {
      nodes: graphData.nodes.filter(
        (node) => nodeIds.has(node.id),
      ),

      edges,

      totalEdges:
        graphData.edges.length,
    };
  }, [graphData]);

  const statusPalette: Record<
    string,
    string
  > = {
    MERGED: 'success.main',
    ABANDONED: 'error.main',
    OPEN: 'warning.main',
    DRAFT: 'info.main',
    NEEDS_REVIEW: 'secondary.main',
  };

  const filterSummary = useMemo(() => {
    const activeRepositories = selectedRepositories.length
      ? `${selectedRepositories.length} selected`
      : 'All repositories';

    const activeTopics = selectedTopics.length
      ? `${selectedTopics.length} selected`
      : 'All topics';

    const activePeriods = periods.length
      ? periods.map(formatPeriodLabel).join(' | ')
      : 'Any time';

    return {
      activeRepositories,
      activeTopics,
      activePeriods,
    };
  }, [selectedRepositories, selectedTopics, periods]);

  if (detailQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (detailQuery.error) {
    return (
      <ErrorPanel message="Unable to load developer details." />
    );
  }

  if (
    !developerName ||
    !detailQuery.data ||
    !metrics ||
    !data
  ) {
    return (
      <ErrorPanel message="Developer is not selected or data is unavailable." />
    );
  }

  const developerTitle =
    formatDeveloperTitle(data.username);

  const reviewRequestsReceivedSummary =
    buildPeopleSummary(
      metrics.review_requests_received,
    );

  const commentsReceivedSummary =
    buildPeopleSummary(
      metrics.comments_received,
    );

  const hasAnyCollaboration =
    collaborationRows.length > 0;

  const hasAnyActivity =
    metrics.change_count > 0 ||
    hasAnyCollaboration;

  const developerCards = cardDefinitions(developerMetrics);

  const cardGridSize =  Math.floor(12 / developerCards.length);

  const handleApplyFilters = () => {
    setSelectedRepositories([
      ...draftRepositories,
    ]);

    setSelectedTopics([
      ...draftTopics,
    ]);

    setPeriods([
      ...draftPeriods,
    ]);

    setLive(draftLive);

    setSelectedPeriodIndex(0);
  };

  const handleResetFilters = () => {
    const defaultLive =
      getDefaultLiveValue();

    setDraftRepositories([]);
    setDraftTopics([]);
    setDraftPeriods([]);
    setDraftLive(defaultLive);

    setSelectedRepositories([]);
    setSelectedTopics([]);
    setPeriods([]);
    setLive(defaultLive);

    setSelectedPeriodIndex(0);
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">
            {developerTitle}
          </Typography>

          <Typography color="text.secondary">
            Developer Performance
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
        >
          <Chip label={filterSummary.activeRepositories} />
          <Chip label={filterSummary.activeTopics} />
          <Chip label={filterSummary.activePeriods} />
        </Stack>

        <FilterBar
          showDeveloperSelector={false}
          selectedDeveloper={developerName}
          draftDeveloper={null}

          repositoryOptions={repositoryOptions}
          topicOptions={topicOptions}

          selectedRepositories={selectedRepositories}
          selectedTopics={selectedTopics}

          periods={periods}
          draftPeriods={draftPeriods}

          live={live}

          topicDisabled={draftRepositories.length === 0}

          draftRepositories={draftRepositories}
          draftTopics={draftTopics}
          draftLive={draftLive}

          onDeveloperChange={() => {}}

          onRepositoryChange={(value) => {
            setDraftRepositories(value);
            setDraftTopics([]);
          }}

          onTopicChange={setDraftTopics}

          onPeriodsChange={(value) => {
            setDraftPeriods(value);
          }}

          onLiveChange={setDraftLive}

          onApplyFilters={() => {
            setSelectedRepositories([...draftRepositories]);
            setSelectedTopics([...draftTopics]);
            setPeriods([...draftPeriods]);
            setLive(draftLive);
            setSelectedPeriodIndex(0);
          }}

          onTopicMenuOpenChange={setTopicMenuOpen}

          onResetFilters={() => {
            const defaultLive = getDefaultLiveValue();

            setDraftRepositories([]);
            setDraftTopics([]);
            setDraftPeriods([]);
            setDraftLive(defaultLive);

            setSelectedRepositories([]);
            setSelectedTopics([]);
            setPeriods([]);
            setLive(defaultLive);

            setSelectedPeriodIndex(0);
          }}
        />
        {!hasAnyActivity && (
          <Alert severity="info">
            No activity found. {developerTitle} has no
            changes or collaboration data matching the
            current filters.
          </Alert>
        )}
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
          >
            {comparisonRows.map((row) => (
              <Chip
                key={row.index}
                clickable
                color={
                  selectedPeriodIndex === row.index
                    ? 'primary'
                    : 'default'
                }
                variant={
                  selectedPeriodIndex === row.index
                    ? 'filled'
                    : 'outlined'
                }
                label={formatPeriodLabel(
                  row.period,
                  row.index,
                )}
                onClick={() =>
                  setSelectedPeriodIndex(
                    row.index,
                  )
                }
              />
            ))}
          </Stack>
        <Grid container spacing={3}>
          {developerCards.map((def) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={cardGridSize}
              key={def.key}
            >
              <MetricCard
                title={def.label}
                value={String(
                  def.format?.(def.value(metrics)) ??
                    def.value(metrics) ??
                    '',
                )}
                subtitle={def.card?.subtitle?.(metrics)}
                accent={def.card?.accent}
              />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid
            item
            xs={12}
            lg={6}
          >
            <SectionCard title="Repository activity">
              {repositoryRows.length ? (
                <Box
                  sx={{
                    maxHeight: 420,
                    overflowY: 'auto',
                    pr: 1,
                  }}
                >
                  <Stack spacing={2}>
                    {repositoryRows.map(
                      (row) => {
                        const total =
                          row.total ?? 0;

                        const segments =
                          Object.entries(
                            row.statuses,
                          ).sort(
                            (a, b) =>
                              b[1] - a[1],
                          );

                        return (
                          <Box
                            key={row.repo}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border:
                                '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              flexWrap="wrap"
                              spacing={2}
                            >
                              <Box>
                                <Typography
                                  fontWeight={600}
                                >
                                  <Link
                                    component={
                                      RouterLink
                                    }
                                    to={`/gerrit/projects/${encodeURIComponent(
                                      row.repo,
                                    )}`}
                                    underline="hover"
                                  >
                                    {row.repo}
                                  </Link>
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {total
                                    ? `${total} change${
                                        total === 1
                                          ? ''
                                          : 's'
                                      }`
                                    : 'No changes recorded'}
                                </Typography>
                              </Box>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {segments
                                  .map(
                                    ([
                                      status,
                                      value,
                                    ]) =>
                                      `${status} ${value}`,
                                  )
                                  .join(' · ')}
                              </Typography>
                            </Stack>

                            {total ? (
                              <Box
                                sx={{ mt: 2 }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    height: 12,
                                    borderRadius: 1,
                                    overflow:
                                      'hidden',
                                    bgcolor:
                                      'rgba(255,255,255,0.06)',
                                  }}
                                >
                                  {segments.map(
                                    ([
                                      status,
                                      count,
                                    ]) => (
                                      <Box
                                        key={status}
                                        sx={{
                                          width: `${
                                            (count /
                                              total) *
                                            100
                                          }%`,
                                          bgcolor:
                                            statusPalette[
                                              status
                                            ] ??
                                            'primary.main',
                                        }}
                                        title={`${status}: ${count}`}
                                      />
                                    ),
                                  )}
                                </Box>
                              </Box>
                            ) : null}
                          </Box>
                        );
                      },
                    )}
                  </Stack>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No repository activity found for the
                  current filters.
                </Typography>
              )}
            </SectionCard>
          </Grid>

          <Grid
            item
            xs={12}
            lg={6}
          >
            <SectionCard title="Review & delivery metrics">
              <Stack spacing={3}>
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" gutterBottom>
                      Reviewer response time
                    </Typography>
                    {metrics.reviewer_response_time && (
                      <Typography variant="caption" color="text.secondary">
                        {metrics.changes_reviewed} changes reviewed
                      </Typography>
                    )}
                  </Stack>

                  {metrics.reviewer_response_time ? (
                    <Stack spacing={2}>
                      <Typography
                        variant="h4"
                        sx={{ color: 'success.main' }}
                      >
                        {formatDuration(metrics.reviewer_response_time.mean)}
                      </Typography>

                      <Stack direction="row" spacing={3}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Min
                          </Typography>
                          <Typography variant="body2">
                            {formatDuration(metrics.reviewer_response_time.min)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Max
                          </Typography>
                          <Typography variant="body2">
                            {formatDuration(metrics.reviewer_response_time.max)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography color="text.secondary">
                        Average response time across the current selection.
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      No reviewer response time data available for this scope.
                    </Typography>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border:
                          '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Typography variant="subtitle2">
                        Lead time
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ mt: 1 }}
                      >
                        {formatDuration(metrics.lead_time?.mean)}
                      </Typography>

                      {metrics.lead_time && (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Fastest:{' '}
                            {metrics.lead_time.min.url ? (
                              <Link
                                href={metrics.lead_time.min.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                              >
                                {formatDuration(metrics.lead_time.min.duration)}
                              </Link>
                            ) : (
                              formatDuration(metrics.lead_time.min.duration)
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Slowest:{' '}
                            {metrics.lead_time.max.url ? (
                              <Link
                                href={metrics.lead_time.max.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                              >
                                {formatDuration(metrics.lead_time.max.duration)}
                              </Link>
                            ) : (
                              formatDuration(metrics.lead_time.max.duration)
                            )}
                          </Typography>
                        </Stack>
                      )}
                      
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border:
                          '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Typography variant="subtitle2">
                        Patchset gap time
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ mt: 1 }}
                      >
                        {formatDuration(metrics.patchset_gap_time?.mean)}
                      </Typography>

                      {metrics.patchset_gap_time && (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Fastest:{' '}
                            {metrics.patchset_gap_time.min.url ? (
                              <Link
                                href={metrics.patchset_gap_time.min.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                              >
                                {formatDuration(metrics.patchset_gap_time.min.duration)}
                              </Link>
                            ) : (
                              formatDuration(metrics.patchset_gap_time.min.duration)
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Slowest:{' '}
                            {metrics.patchset_gap_time.max.url ? (
                              <Link
                                href={metrics.patchset_gap_time.max.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                              >
                                {formatDuration(metrics.patchset_gap_time.max.duration)}
                              </Link>
                            ) : (
                              formatDuration(metrics.patchset_gap_time.max.duration)
                            )}
                          </Typography>
                        </Stack>
                      )}
                      
                    </Box>
                  </Grid>

                  <Grid
                    item
                    xs={12}
                    sm={6}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border:
                          '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Typography variant="subtitle2">
                        Build failure rate
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ mt: 1 }}
                      >
                        {formatPercent(
                          metrics.build_failure_rate
                            ?.overall_failure_rate,
                          2,
                        )}
                      </Typography>

                      {metrics.build_failure_rate ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() =>
                            setShowBuildFailureDetails(
                              (current) =>
                                !current,
                            )
                          }
                          sx={{
                            mt: 1,
                            px: 0,
                          }}
                        >
                          {showBuildFailureDetails
                            ? 'Hide failure details'
                            : 'Show failure details'}
                        </Button>
                      ) : null}

                      <Collapse
                        in={
                          showBuildFailureDetails
                        }
                      >
                        {metrics.build_failure_rate ? (
                          <Box
                            sx={{
                              mt: 2,
                              p: 2,
                              borderRadius: 2,
                              border:
                                '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            <Typography variant="body2">
                              Total changes with builds:{' '}
                              {metrics.build_failure_rate.total_changes_with_builds}
                            </Typography>
                            <Typography variant="body2">
                              Total outcomes:{' '}
                              {metrics.build_failure_rate.total_outcomes}
                            </Typography>
                            <Typography variant="body2">
                              Failed outcomes:{' '}
                              {metrics.build_failure_rate.failed_outcomes}
                            </Typography>
                            <Typography variant="body2">
                              Changes with failures:{' '}
                              {metrics.build_failure_rate.changes_with_failures}
                            </Typography>
                            <Typography variant="body2">
                              Changes failure rate:{' '}
                              {formatPercent(metrics.build_failure_rate.changes_failure_rate, 2)}
                            </Typography>

                            {Object.keys(metrics.build_failure_rate.by_label).length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="body2" fontWeight={600} gutterBottom>
                                  By label:
                                </Typography>
                                {Object.entries(metrics.build_failure_rate.by_label).map(
                                  ([label, detail]) => (
                                    <Typography key={label} variant="body2" color="text.secondary">
                                      {label}: {detail.failed}/{detail.total} ({formatPercent(detail.failure_rate, 2)})
                                    </Typography>
                                  ),
                                )}
                              </Box>
                            )}
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
              {
                key: 'file',
                label: 'File',
              },
              {
                key: 'changeCount',
                label: 'Changes',
              },
              {
                key: 'patchsetCount',
                label: 'Patchsets',
              },
              {
                key: 'linesAdded',
                label: 'Lines added',
              },
              {
                key: 'linesDeleted',
                label: 'Lines deleted',
              },
            ]}
            rows={(
              metrics.file_hotspots ?? []
            ).map((file) => ({
              file: file.file,
              changeCount:
                file.change_count,
              patchsetCount:
                file.patchset_count,
              linesAdded:
                file.lines_added,
              linesDeleted:
                file.lines_deleted,
            }))}
          />
        </SectionCard>

        <SectionCard title="Collaboration network">
          {!hasAnyCollaboration ? (
            <Typography color="text.secondary">
              No collaboration data is available for the
              selected filters.
            </Typography>
          ) : (
            <RelationshipGraph
              nodes={reducedGraph.nodes}
              edges={reducedGraph.edges}
              title="Developer collaboration"
              subtitle={`Top ${Math.min(
                reducedGraph.edges.length,
                10,
              )} relationships`}
              centerNodeId={developerName}
            />
          )}
        </SectionCard>

      <SectionCard title="Collaboration details">
        <RelationshipTable
          rows={collaborationRows}
          maxHeight={360}
        />
      </SectionCard>

        <Grid container spacing={3}>
          <Grid
            item
            xs={12}
            md={6}
          >
            <SectionCard title="Review request summary">
              {!reviewRequestsReceivedSummary ? (
                <Typography color="text.secondary">
                  No review request metrics available for
                  this scope.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  <Typography>
                    Most:{' '}
                    {
                      reviewRequestsReceivedSummary
                        .most.username
                    }{' '}
                    ·{' '}
                    {
                      reviewRequestsReceivedSummary
                        .most.count
                    }
                  </Typography>

                  <Typography color="text.secondary">
                    Average:{' '}
                    {reviewRequestsReceivedSummary.average?.toFixed(
                      1,
                    ) ?? '—'}
                  </Typography>
                </Stack>
              )}
            </SectionCard>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
          >
            <SectionCard title="Comment summary">
              {!commentsReceivedSummary ? (
                <Typography color="text.secondary">
                  No comment metrics available for this
                  scope.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  <Typography>
                    Most:{' '}
                    {
                      commentsReceivedSummary
                        .most.username
                    }{' '}
                    ·{' '}
                    {
                      commentsReceivedSummary
                        .most.count
                    }
                  </Typography>

                  <Typography color="text.secondary">
                    Average:{' '}
                    {commentsReceivedSummary.average?.toFixed(
                      1,
                    ) ?? '—'}
                  </Typography>
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>
        {periodResults.length > 1 && (
          <PeriodComparison
            periodResults={periodResults}
            periods={periods}
            selectMetrics={(result) => {
              const overall =
                result?.overall_performance ?? null;
              return overall ? [overall] : [];
            }}
            metrics={developerMetrics}
            description="Compare the selected periods or select a period to inspect its detailed metrics."
          />
        )}

        <Grid
          container
          spacing={3}
          sx={{ mt: 2 }}
        >
          
          <Grid item xs={12}>
            <Button
              size="small"
              variant="text"
              onClick={() =>
                setShowRawJson(
                  (current) => !current,
                )
              }
            >
              {showRawJson
                ? 'Hide raw response'
                : 'Show raw response'}
            </Button>

            <Collapse in={showRawJson}>
              <Paper
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                  maxHeight: 360,
                  overflowY: 'auto',
                }}
              >
                <Box
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'text.primary',
                    fontSize: '0.85rem',
                  }}
                >
                  {JSON.stringify(
                    detailQuery.data,
                    null,
                    2,
                  )}
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