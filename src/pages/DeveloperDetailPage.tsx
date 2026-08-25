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
import {
  buildDeveloperRelationshipGraph,
  CollaborationMode,
} from '@/utils/relationshipGraph';
import {
  DeveloperDetailResponse,
  PeopleStats,
} from '@/types/developers';
import { getDefaultLiveValue } from '@/utils/livePreference';
import { Period } from '@/types/periods';

const formatPercent = (
  value: number | null | undefined,
) => {
  if (
    typeof value !== 'number' ||
    Number.isNaN(value)
  ) {
    return '—';
  }

  return `${value.toFixed(2)}%`;
};

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

const formatPeriodLabel = (
  period: Period | null | undefined,
  index: number,
) => {
  if (!period) {
    return `Period ${index + 1}`;
  }

  const value = period as any;

  const start =
    value.start ??
    value.start_date ??
    value.from ??
    null;

  const end =
    value.end ??
    value.end_date ??
    value.to ??
    null;

  if (!start && !end) {
    return `Period ${index + 1}`;
  }

  const formatDate = (
    dateValue: string | null,
  ) => {
    if (!dateValue) {
      return 'Any';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    );
  };

  return `${formatDate(start)} – ${formatDate(end)}`;
};

const normalizePeriods = (
  periods: Period[],
) => {
  return periods.map((period) => {
    const value = period as any;

    return {
      start:
        value.start ??
        value.start_date ??
        value.from ??
        null,

      end:
        value.end ??
        value.end_date ??
        value.to ??
        null,
    };
  });
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

  const comparisonRows = useMemo(() => {
    return periodResults.map(
      (result: any, index: number) => {
        const resultMetrics =
          result?.metrics
            ?.overall_performance ?? {};

        return {
          period:
            result?.period ??
            periods[index] ??
            null,

          index,

          changes:
            resultMetrics.change_count ?? 0,

          repositories:
            resultMetrics.projects?.length ?? 0,

          failureRate:
            formatPercent(
              resultMetrics.build_failure_rate
                ?.overall_failure_rate,
            ),

          leadTime:
            resultMetrics.lead_time?.mean != null
              ? `${resultMetrics.lead_time.mean.toFixed(
                  2,
                )} h`
              : '—',
        };
      },
    );
  }, [periodResults, periods]);

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
        const sentReviews =
          metrics?.review_requests_sent?.people.find(
            (item) =>
              item.username === peer,
          )?.count ?? 0;

        const receivedReviews =
          metrics?.review_requests_received?.people.find(
            (item) =>
              item.username === peer,
          )?.count ?? 0;

        const sentComments =
          metrics?.comments_sent?.people.find(
            (item) =>
              item.username === peer,
          )?.count ?? 0;

        const receivedComments =
          metrics?.comments_received?.people.find(
            (item) =>
              item.username === peer,
          )?.count ?? 0;

        return {
          username: peer,
          reviewSent: sentReviews,
          reviewReceived:
            receivedReviews,
          commentsSent: sentComments,
          commentsReceived:
            receivedComments,
          total:
            sentReviews +
            receivedReviews +
            sentComments +
            receivedComments,
        };
      })
      .sort(
        (a, b) => b.total - a.total,
      );
  }, [
    collaborationPeers,
    metrics,
  ]);

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

        {periodResults.length > 1 && (
          <SectionCard title="Period comparison">
            <Stack spacing={2}>
              <Typography
                color="text.secondary"
                variant="body2"
              >
                Compare the selected periods or select a
                period to inspect its detailed metrics.
              </Typography>

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

              <MetricsTable
                columns={[
                  {
                    key: 'period',
                    label: 'Period',
                  },
                  {
                    key: 'changes',
                    label: 'Changes',
                  },
                  {
                    key: 'repositories',
                    label: 'Repositories',
                  },
                  {
                    key: 'failureRate',
                    label: 'Failure rate',
                  },
                  {
                    key: 'leadTime',
                    label: 'Lead time',
                  },
                ]}
                rows={comparisonRows.map(
                  (row) => ({
                    period:
                      formatPeriodLabel(
                        row.period,
                        row.index,
                      ),
                    changes:
                      row.changes,
                    repositories:
                      row.repositories,
                    failureRate:
                      row.failureRate,
                    leadTime:
                      row.leadTime,
                  }),
                )}
              />
            </Stack>
          </SectionCard>
        )}

        {!hasAnyActivity && (
          <Alert severity="info">
            No activity found. {developerTitle} has no
            changes or collaboration data matching the
            current filters.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid
            item
            xs={12}
            md={3}
          >
            <MetricCard
              title="Changes"
              value={metrics.change_count}
              subtitle={
                metrics.change_count
                  ? `Across ${totalRepositories} repositories`
                  : 'No changes in selected scope'
              }
              accent="primary.main"
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <MetricCard
              title="Avg. patchsets"
              value={
                metrics.average_patchsets != null
                  ? metrics.average_patchsets.toFixed(
                      2,
                    )
                  : '—'
              }
              subtitle="Per change"
              accent="secondary.main"
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <MetricCard
              title="Review response"
              value={
                metrics.reviewer_response_time
                  ? `${metrics.reviewer_response_time.mean_hours.toFixed(
                      2,
                    )} h`
                  : '—'
              }
              subtitle={
                metrics.reviewer_response_time
                  ? 'Average reviewer response time'
                  : 'No data available'
              }
              accent="success.main"
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <MetricCard
              title="Lead time"
              value={
                metrics.lead_time?.mean != null
                  ? `${metrics.lead_time.mean.toFixed(
                      2,
                    )} h`
                  : '—'
              }
              subtitle={
                metrics.lead_time
                  ? 'Mean lead time'
                  : 'No data available'
              }
              accent="info.main"
            />
          </Grid>
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
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                  >
                    Reviewer response time
                  </Typography>

                  {metrics.reviewer_response_time ? (
                    <Stack spacing={2}>
                      <Typography
                        variant="h4"
                        sx={{
                          color: 'success.main',
                        }}
                      >
                        {metrics.reviewer_response_time.mean_hours.toFixed(
                          2,
                        )}{' '}
                        h
                      </Typography>

                      <Typography color="text.secondary">
                        Average response time across the
                        current selection.
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      No reviewer response time data
                      available for this scope.
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
                        {metrics.lead_time?.mean != null
                          ? `${metrics.lead_time.mean.toFixed(
                              2,
                            )} h`
                          : '—'}
                      </Typography>
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
                              {
                                metrics
                                  .build_failure_rate
                                  .total_changes_with_builds
                              }
                            </Typography>

                            <Typography variant="body2">
                              Failed outcomes:{' '}
                              {
                                metrics
                                  .build_failure_rate
                                  .failed_outcomes
                              }
                            </Typography>
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
          <Box
            sx={{
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            <MetricsTable
              columns={[
                {
                  key: 'username',
                  label: 'Person',
                },
                {
                  key: 'reviewSent',
                  label: 'Reviews sent',
                },
                {
                  key: 'reviewReceived',
                  label: 'Reviews received',
                },
                {
                  key: 'commentsSent',
                  label: 'Comments sent',
                },
                {
                  key: 'commentsReceived',
                  label: 'Comments received',
                },
                {
                  key: 'total',
                  label: 'Total',
                },
              ]}
              rows={collaborationRows}
            />
          </Box>
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