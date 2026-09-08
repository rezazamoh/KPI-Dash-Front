import {Autocomplete, Box,Chip, Button,Paper, Collapse, Grid, Link, Stack, TextField, Typography,} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProject, fetchProjects } from '@/api/projects';
import { fetchDevelopers } from '@/api/developers';
import { fetchTeamPerformance, fetchTeams } from '@/api/teams';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';
import FilterBar from '@/components/ui/Filters/FilterBar';
import ChartCard from '@/components/ui/ChartCard';
import { GapDistributionChart } from '@/components/ui/GapDistributionChart';
import RelationshipGraph from '@/components/ui/RelationshipGraph';
import { mergeLabelStats } from '@/components/ui/RelationshipTable';
import RelationshipTable from '@/components/ui/RelationshipTable';
import type { LabelStats, VoteStats,} from '@/components/ui/RelationshipTable';
import MetricsTable from '@/components/ui/MetricsTable';
import PeriodComparison from '@/components/ui/PeriodComparison';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildProjectRelationshipGraph } from '@/utils/relationshipGraph';
import { formatPeriodLabel } from '@/utils/formatPeriodLabel';
import { normalizePeriods } from '@/utils/periods';
import { getDefaultLiveValue } from '@/utils/livePreference';
import { buildComparisonRows, buildMetricRow, snapshotDefinitions, metricColumns } from '@/metrics/types';
import { projectMetricDefs, projectMetricDetailDefs } from '@/metrics/projectMetrics';
import { GapTimeStats, LeadTimeStats } from '@/types/metrics';
import type { DeveloperCoreMetrics } from '@/types/metrics';
import { Period } from '@/types/periods';

const statusPalette: Record<string, string> = {
  MERGED: 'success.main',
  ABANDONED: 'error.main',
  OPEN: 'warning.main',
  DRAFT: 'info.main',
  NEEDS_REVIEW: 'secondary.main',
};

const DEFAULT_STATUS_FILTER = ['NEW', 'ABANDONED', 'MERGED'];
const DEVELOPER_SERIES_COLORS = ['#4fc3f7','#81c784','#ffb74d','#ba68c8','#f06292','#a1887f','#ffd54f','#64b5f6',];

const aggregateDistributionBuckets = <T extends { distribution: Array<{ min: number; max: number | null; count: number; density: number | null; change_numbers?: number[]; change_patchsets?: Array<{ change_number: number; patchset_number: number }> }> }>(
  statsList: T[],
): T['distribution'] => {
  const bucketMap = new Map<
    string,
    { min: number; max: number | null; count: number; density: number | null; change_numbers: number[]; change_patchsets: Array<{ change_number: number; patchset_number: number }> }
  >();

  statsList.forEach((stats) => {
    stats.distribution.forEach((bucket) => {
      const key = `${bucket.min}:${bucket.max ?? 'inf'}`;
      const current = bucketMap.get(key);

      if (current) {
        current.count += bucket.count;
        current.change_numbers = Array.from(
          new Set([
            ...current.change_numbers,
            ...(bucket.change_numbers ?? []),
          ]),
        );
        current.change_patchsets = Array.from(
          new Map(
            [
              ...current.change_patchsets,
              ...(bucket.change_patchsets ?? []),
            ].map((patchset) => [
              `${patchset.change_number}:${patchset.patchset_number}`,
              patchset,
            ]),
          ).values(),
        );
        current.density =
          bucket.max === null
            ? null
            : current.count / Math.max(bucket.max - bucket.min, 1);
        return;
      }

      bucketMap.set(key, {
        min: bucket.min,
        max: bucket.max,
        count: bucket.count,
        density:
          bucket.max === null
            ? null
            : bucket.count / Math.max(bucket.max - bucket.min, 1),
        change_numbers: [...(bucket.change_numbers ?? [])],
        change_patchsets: [...(bucket.change_patchsets ?? [])],
      });
    });
  });

  return Array.from(bucketMap.values()).sort(
    (left, right) => left.min - right.min,
  ) as T['distribution'];
};

const aggregateDeveloperTimeStats = <T extends LeadTimeStats | GapTimeStats>(
  developerMetrics: Record<
    string,
    {
      lead_time?: T | null;
      patchset_gap_time?: T | null;
    }
  >,
  key: 'lead_time' | 'patchset_gap_time',
  selectedDevelopers?: string[],
): T | null => {
  const names =
    selectedDevelopers && selectedDevelopers.length > 0
      ? selectedDevelopers
      : Object.keys(developerMetrics);

  const statsList = names
    .map((developer) => developerMetrics[developer]?.[key] as T | null | undefined)
    .filter(
      (value): value is T =>
        Boolean(value?.distribution?.length),
    );

  if (statsList.length === 0) {
    return null;
  }

  const min = statsList.reduce((best, current) =>
    current.min.duration < best.min.duration ? current : best,
  );

  const max = statsList.reduce((best, current) =>
    current.max.duration > best.max.duration ? current : best,
  );

  const mean =
    statsList.reduce((sum, current) => sum + current.mean, 0) /
    statsList.length;

  const aggregated = {
    min: min.min,
    mean,
    max: max.max,
    distribution: aggregateDistributionBuckets(statsList),
  } as T;

  return aggregated;
};

const buildDeveloperTimeSeries = <T extends LeadTimeStats | GapTimeStats>(
  developerMetrics: Record<string, { lead_time?: T | null; patchset_gap_time?: T | null }>,
  names: string[],
  field: 'lead_time' | 'patchset_gap_time',
  keyPrefix: string,
) =>
  names
    .map((name, index) => ({
      key: `${keyPrefix}-${name}`,
      name,
      color: DEVELOPER_SERIES_COLORS[index % DEVELOPER_SERIES_COLORS.length],
      stats: developerMetrics[name]?.[field] ?? null,
    }))
    .filter((entry) => entry.stats && entry.stats.distribution.length > 0);

const toCount = (vote: number | VoteStats | undefined): number =>
  typeof vote === 'number'
    ? vote
    : Number(vote?.total ?? 0);

const normalizeLabelStats = (
  byLabel: Record<string, unknown>,
): Record<string, LabelStats> => {
  const normalized: Record<string, LabelStats> = {};

  Object.entries(byLabel ?? {}).forEach(
    ([label, raw]) => {
      const entry = (raw ?? {}) as {
        total?: number;
        positive?: number;
        negative?: number;
        values?: Record<string, number | VoteStats>;
      };

      const values = entry.values ?? {};

      const labelTotal =
        entry.total ??
        Object.values(values).reduce<number>(
          (sum, vote) => sum + toCount(vote),
          0,
        );

      const stats: LabelStats = {
        total: labelTotal,
        positive: entry.positive ?? 0,
        negative: entry.negative ?? 0,
        values: {},
      };

      Object.entries(values).forEach(
        ([value, vote]) => {
          const total = toCount(vote);

          stats.values[value] = {
            total,
            rate: 0,
            value_rate:
              labelTotal > 0
                ? Number(
                    ((total / labelTotal) * 100).toFixed(2),
                  )
                : 0,
          };
        },
      );

      normalized[label] = stats;
    },
  );

  return normalized;
};

interface CollaboratorEntry {
  username: string;
  reviewSent: number;
  reviewReceived: number;
  commentsSent: number;
  commentsReceived: number;
  total: number;
  breakdowns: {
    reviewSent?: Record<string, LabelStats>;
    reviewReceived?: Record<string, LabelStats>;
    commentsSent?: Record<string, LabelStats>;
    commentsReceived?: Record<string, LabelStats>;
  };
}

type ProjectPeopleStats = Omit<
  DeveloperCoreMetrics['review_requests_received'],
  'people'
> & {
  people: Array<{
    username: string;
    count: number;
    by_label?: Record<string, unknown>;
    stats?: {
      by_label?: Record<string, unknown>;
    };
  }>;
  by_label?: Record<string, unknown>;
  stats?: {
    by_label?: Record<string, unknown>;
  };
};

const getProjectPersonLabels = (
  metric: ProjectPeopleStats | null | undefined,
  person: ProjectPeopleStats['people'][number],
) => {
  if (
    person.by_label &&
    Object.keys(person.by_label).length > 0
  ) {
    return person.by_label;
  }

  if (
    person.stats?.by_label &&
    Object.keys(person.stats.by_label).length > 0
  ) {
    return person.stats.by_label;
  }

  const metricLabels = metric?.by_label;

  if (metricLabels?.[person.username]) {
    const personLabels = metricLabels[person.username];

    return typeof personLabels === 'object' && personLabels !== null
      ? personLabels as Record<string, unknown>
      : undefined;
  }

  if (metricLabels && Object.keys(metricLabels).length > 0) {
    return metricLabels;
  }

  const metricStatsLabels = metric?.stats?.by_label;

  if (
    metricStatsLabels &&
    Object.keys(metricStatsLabels).length > 0
  ) {
    const personLabels = metricStatsLabels[person.username];

    if (
      personLabels &&
      typeof personLabels === 'object'
    ) {
      return personLabels as Record<string, unknown>;
    }

    return metricStatsLabels;
  }

  return undefined;
};

interface ProjectDeveloperMetrics
  extends Omit<
    DeveloperCoreMetrics,
    | 'review_requests_received'
    | 'review_requests_sent'
    | 'comments_received'
    | 'comments_sent'
  > {
  review_requests_received: ProjectPeopleStats;
  review_requests_sent: ProjectPeopleStats;
  comments_received: ProjectPeopleStats;
  comments_sent: ProjectPeopleStats;
  file_hotspots?: Array<{
    file: string;
    change_count: number;
    patchset_count: number;
    lines_added: number;
    lines_deleted: number;
  }>;
}

const ProjectDetailPage: React.FC = () => {
  const { project, team } = useParams<{
    project?: string;
    team?: string;
  }>();

  const location = useLocation();

  const developersFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.getAll('username');
  }, [location.search]);

  const reposFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.getAll('repo');
  }, [location.search]);

  const isTeam = Boolean(team);
  const name = team ?? project ?? '';
  const developerHref = (username: string) =>
    isTeam
      ? `/gerrit/developers/${encodeURIComponent(username)}`
      : `/gerrit/developers/${encodeURIComponent(username)}?repo=${encodeURIComponent(name)}`;

  const [selectedDevelopers, setSelectedDevelopers] =
    useState<string[]>(developersFromQuery);

  const [selectedRepositories, setSelectedRepositories] =
    useState<string[]>(reposFromQuery);

  const initializedTeamRepositories = useRef(false);

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(DEFAULT_STATUS_FILTER);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [draftPeriods, setDraftPeriods] = useState<Period[]>([]);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [live, setLive] = useState(getDefaultLiveValue);

  const [draftDevelopers, setDraftDevelopers] =
    useState<string[]>(developersFromQuery);

  const [draftRepositories, setDraftRepositories] =
    useState<string[]>(reposFromQuery);

  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<string[]>(DEFAULT_STATUS_FILTER);
  const [draftLive, setDraftLive] = useState(getDefaultLiveValue);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    setDraftDevelopers(selectedDevelopers);
    setDraftRepositories(selectedRepositories);
    setDraftTopics(selectedTopics);
    setDraftStatus(selectedStatus);
    setDraftPeriods(periods);
    setDraftLive(live);
  }, [
    selectedDevelopers,
    selectedRepositories,
    selectedTopics,
    selectedStatus,
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
      isTeam ? 'team-detail' : 'project-detail',
      name,
      selectedDevelopers,
      selectedRepositories,
      selectedTopics,
      selectedStatus,
      periods,
      live,
    ],
    queryFn: async () => {
      if (!name) {
        return undefined;
      }

      const params: Record<string, unknown> = {};

      if (selectedDevelopers.length > 0) {
        params.username = selectedDevelopers;
      }

      if (isTeam && selectedRepositories.length > 0) {
        params.project = selectedRepositories;
      }

      if (selectedTopics.length > 0) {
        params.topic = selectedTopics;
      }

      if (selectedStatus.length > 0) {
        params.status = selectedStatus;
      }

      if (periods.length > 0) {
        params.periods = normalizePeriods(periods);
      }

      params.live = live;

      if (isTeam) {
        return fetchTeamPerformance(name, params);
      }

      return fetchProject(name, params);
    },
    enabled: Boolean(name),
    staleTime: 5 * 60 * 1000,
  });

  const developersQuery = useQuery({
    queryKey: ['developers'],
    queryFn: () => fetchDevelopers(),
    staleTime: 5 * 60 * 1000,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60 * 1000,
  });

  const periodResults = useMemo(() => {
    const result = detailQuery.data;

    if (!result) {
      return [];
    }

    return Array.isArray(result) ? result : [result];
  }, [detailQuery.data]);

  const selectedPeriod =
    periodResults[selectedPeriodIndex] ??
    periodResults[0] ??
    null;

  const data = selectedPeriod?.metrics ?? null;

  const displayName = isTeam
    ? data?.team?.name ?? data?.filters?.team?.name ?? name
    : name;

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    enabled: isTeam,
    staleTime: 5 * 60 * 1000,
  });

  const teamDefinition = useMemo(
    () =>
      teamsQuery.data?.find(
        (teamOption) =>
          String(teamOption.id) === name ||
          teamOption.name === name,
      ),
    [teamsQuery.data, name],
  );

  const defaultTeamDevelopers = useMemo(
    () => teamDefinition?.members ?? [],
    [teamDefinition],
  );

  const defaultTeamRepositories = useMemo(
    () => teamDefinition?.projects ?? [],
    [teamDefinition],
  );

  useEffect(() => {
    initializedTeamRepositories.current = false;
  }, [isTeam, name]);

  useEffect(() => {
    if (
      !isTeam ||
      initializedTeamRepositories.current ||
      (defaultTeamDevelopers.length === 0 &&
        defaultTeamRepositories.length === 0)
    ) {
      return;
    }

    if (
      developersFromQuery.length === 0 &&
      defaultTeamDevelopers.length > 0
    ) {
      setSelectedDevelopers(defaultTeamDevelopers);
      setDraftDevelopers(defaultTeamDevelopers);
    }

    if (
      reposFromQuery.length === 0 &&
      defaultTeamRepositories.length > 0
    ) {
      setSelectedRepositories(defaultTeamRepositories);
      setDraftRepositories(defaultTeamRepositories);
    }

    initializedTeamRepositories.current = true;
  }, [
    isTeam,
    defaultTeamDevelopers,
    defaultTeamRepositories,
    reposFromQuery,
    developersFromQuery,
  ]);

  const developerOptions =
    developersQuery.data?.developers?.length
      ? developersQuery.data.developers
      : (data?.developers ?? []);

  const topicOptions = data?.topics ?? [];

  const interactionGraph = useMemo(
    () =>
      data
        ? buildProjectRelationshipGraph(data)
        : { nodes: [], edges: [] },
    [data],
  );

  const visibleProjectGraph = useMemo(() => {
    if (
      !interactionGraph.nodes.length ||
      !interactionGraph.edges.length
    ) {
      return {
        nodes: interactionGraph.nodes,
        edges: interactionGraph.edges,
        centerNodeId: null as string | null,
      };
    }

    const topEdges = [...interactionGraph.edges]
      .sort(
        (a, b) =>
          b.totalInteractions - a.totalInteractions,
      )
      .slice(0, 18);

    const nodeIds = new Set<string>();

    topEdges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    const centerNodeId =
      [...interactionGraph.nodes]
        .sort((a, b) => b.activity - a.activity)[0]
        ?.id ?? null;

    const allProjectNodes = interactionGraph.nodes;

    const visibleNodes = allProjectNodes.filter((node) => {
      const isStronglyConnected = nodeIds.has(node.id);
      const isCenter = node.id === centerNodeId;
      const isSmallNetwork = allProjectNodes.length <= 12;

      return (
        isStronglyConnected ||
        isCenter ||
        isSmallNetwork
      );
    });

    return {
      nodes:
        visibleNodes.length > 0
          ? visibleNodes
          : allProjectNodes,
      edges: topEdges,
      centerNodeId,
    };
  }, [interactionGraph]);

  const developerMetrics = useMemo<Record<string, ProjectDeveloperMetrics>>(
    () =>
      (data?.developer_metrics ?? {}) as Record<
        string,
        ProjectDeveloperMetrics
      >,
    [data],
  );

  const timeDistributionDeveloperOptions = useMemo(
    () => Object.keys(developerMetrics).sort(),
    [developerMetrics],
  );

  const [timeDistributionDevelopers, setTimeDistributionDevelopers] =
    useState<string[]>([]);

  const activeTimeDistributionDevelopers = useMemo(
    () =>
      timeDistributionDevelopers.length > 0
        ? timeDistributionDevelopers
        : timeDistributionDeveloperOptions,
    [timeDistributionDevelopers, timeDistributionDeveloperOptions],
  );

  const aggregatedLeadTime = useMemo(
    () =>
      aggregateDeveloperTimeStats(
        developerMetrics,
        'lead_time',
        activeTimeDistributionDevelopers,
      ),
    [developerMetrics, activeTimeDistributionDevelopers],
  );

  const aggregatedPatchsetGapTime = useMemo(
    () =>
      aggregateDeveloperTimeStats(
        developerMetrics,
        'patchset_gap_time',
        activeTimeDistributionDevelopers,
      ),
    [developerMetrics, activeTimeDistributionDevelopers],
  );

  const selectedDeveloperTimeSeries = useMemo(
    () =>
      buildDeveloperTimeSeries(
        developerMetrics,
        activeTimeDistributionDevelopers,
        'lead_time',
        'developer',
      ),
    [developerMetrics, activeTimeDistributionDevelopers],
  );

  const selectedPatchsetGapSeries = useMemo(
    () =>
      buildDeveloperTimeSeries(
        developerMetrics,
        activeTimeDistributionDevelopers,
        'patchset_gap_time',
        'patchset',
      ),
    [developerMetrics, activeTimeDistributionDevelopers],
  );

  const projectMetrics = useMemo(() => {
    const statusTotals = new Map<string, number>();

    const repoTotals = new Map<
      string,
      {
        total: number;
        statuses: Record<string, number>;
        developers: Set<string>;
        developerTotals: Map<string, number>;
      }
    >();

    const collaboratorTotals = new Map<
      string,
      CollaboratorEntry
    >();

    interactionGraph.edges.forEach((edge) => {
      const sourceEntry: CollaboratorEntry =
        collaboratorTotals.get(edge.source) ?? {
          username: edge.source,
          reviewSent: 0,
          reviewReceived: 0,
          commentsSent: 0,
          commentsReceived: 0,
          total: 0,
          breakdowns: {},
        };

      const targetEntry: CollaboratorEntry =
        collaboratorTotals.get(edge.target) ?? {
          username: edge.target,
          reviewSent: 0,
          reviewReceived: 0,
          commentsSent: 0,
          commentsReceived: 0,
          total: 0,
          breakdowns: {},
        };

      sourceEntry.reviewSent += edge.sourceReviewCount;
      sourceEntry.reviewReceived += edge.targetReviewCount;
      sourceEntry.commentsSent += edge.sourceCommentCount;
      sourceEntry.commentsReceived += edge.targetCommentCount;
      sourceEntry.total += edge.sourceInteractions + edge.targetInteractions;

      targetEntry.reviewSent += edge.targetReviewCount;
      targetEntry.reviewReceived += edge.sourceReviewCount;
      targetEntry.commentsSent += edge.targetCommentCount;
      targetEntry.commentsReceived += edge.sourceCommentCount;
      targetEntry.total += edge.sourceInteractions + edge.targetInteractions;

      collaboratorTotals.set(edge.source, sourceEntry);
      collaboratorTotals.set(edge.target, targetEntry);
    });

    const repoNames = new Set<string>();

    const fileHotspotMap = new Map<
      string,
      {
        file: string;
        change_count: number;
        patchset_count: number;
        lines_added: number;
        lines_deleted: number;
      }
    >();

    const developerRows: Array<{
      username: string;
      metrics: ProjectDeveloperMetrics;
      [key: string]: unknown;
    }> = [];
    const developerChartData: Array<{
      name: string;
      changes: number;
    }> = [];
    const metricDefinitions = snapshotDefinitions(projectMetricDefs);

    let totalChanges = 0;

    Object.entries(developerMetrics).forEach(
      ([developer, metrics]) => {
        totalChanges += metrics.change_count ?? 0;

        developerRows.push({
          username: developer,
          metrics,
          ...buildMetricRow(metrics, metricDefinitions),
        });

        developerChartData.push({
          name: developer,
          changes: metrics.change_count ?? 0,
        });

        Object.entries(
          metrics.changes_by_status_per_repo ?? {},
        ).forEach(([status, repos]) => {
          Object.entries(repos).forEach(
            ([repo, count]) => {
              repoNames.add(repo);

              const repoEntry =
                repoTotals.get(repo) ?? {
                  total: 0,
                  statuses: {},
                  developers: new Set<string>(),
                  developerTotals: new Map<string, number>(),
                };

              repoEntry.total += count;

              repoEntry.developerTotals.set(
                developer,
                (repoEntry.developerTotals.get(developer) ??
                  0) + count,
              );

              repoEntry.statuses[status] =
                (repoEntry.statuses[status] ?? 0) +
                count;

              repoEntry.developers.add(developer);

              repoTotals.set(repo, repoEntry);

              statusTotals.set(
                status,
                (statusTotals.get(status) ?? 0) + count,
              );
            },
          );
        });

        const metricsWithPeople = [
          {
            metric: metrics.review_requests_sent,
            breakdown: 'reviewSent' as const,
          },
          {
            metric: metrics.review_requests_received,
            breakdown: 'reviewReceived' as const,
          },
          {
            metric: metrics.comments_sent,
            breakdown: 'commentsSent' as const,
          },
          {
            metric: metrics.comments_received,
            breakdown: 'commentsReceived' as const,
          },
        ];

        metricsWithPeople.forEach(
          ({ metric, breakdown }) => {
            metric?.people?.forEach((person) => {
              const existing: CollaboratorEntry =
                collaboratorTotals.get(
                  developer,
                ) ?? {
                  username: developer,
                  reviewSent: 0,
                  reviewReceived: 0,
                  commentsSent: 0,
                  commentsReceived: 0,
                  total: 0,
                  breakdowns: {},
                };

              const personLabels = getProjectPersonLabels(
                metric,
                person,
              );

              if (personLabels) {
                const incoming = normalizeLabelStats(
                  personLabels,
                );

                const current =
                  existing.breakdowns[breakdown];

                if (!current) {
                  existing.breakdowns[breakdown] =
                    structuredClone(incoming);
                } else {
                  mergeLabelStats(
                    current,
                    incoming,
                  );
                }
              }

              collaboratorTotals.set(
                developer,
                existing,
              );
            });
          },
        );

        (metrics.file_hotspots ?? []).forEach(
          (hotspot) => {
            const existing = fileHotspotMap.get(hotspot.file);

            if (existing) {
              existing.change_count += hotspot.change_count;
              existing.patchset_count += hotspot.patchset_count;
              existing.lines_added += hotspot.lines_added;
              existing.lines_deleted += hotspot.lines_deleted;
            } else {
              fileHotspotMap.set(hotspot.file, {
                file: hotspot.file,
                change_count: hotspot.change_count,
                patchset_count: hotspot.patchset_count,
                lines_added: hotspot.lines_added,
                lines_deleted: hotspot.lines_deleted,
              });
            }
          },
        );

      },
    );

    const topStatuses = Array.from(
      statusTotals.entries(),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([status, count]) => ({
        status,
        count,
      }));

    const repositoryDetails = Array.from(
      repoTotals.entries(),
    )
      .map(([repo, record]) => ({
        repo,
        total: record.total,
        statuses: record.statuses,
        developerCount: record.developers.size,
        developers: Array.from(
          record.developerTotals.entries(),
        )
          .map(([developer, total]) => ({
            developer,
            total,
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);

  const topCollaborators = Array.from(
    collaboratorTotals.values(),
  ).sort((a, b) => b.total - a.total);

    return {
      totalDevelopers:
        Object.keys(developerMetrics).length,
      totalChanges,
      repositoryCount: repoTotals.size,
      topStatuses,
      repositoryDetails,
      topCollaborators,
      fileHotspots: Array.from(fileHotspotMap.values()).sort(
        (a, b) => b.change_count - a.change_count,
      ),
      developerRows: developerRows.sort(
        (a, b) =>
          (Number(b.changeCount) ?? 0) -
          (Number(a.changeCount) ?? 0),
      ),
      developerChartData,
      repositoryNames: Array.from(repoNames).sort(),
    };
  }, [developerMetrics, interactionGraph]);

  const repositoryOptions = useMemo(() => {
    const fullProjects = projectsQuery.data?.projects ?? [];

    return (
      fullProjects.length > 0
        ? fullProjects.slice()
        : projectMetrics.repositoryNames
    ).sort();
  }, [projectsQuery.data, projectMetrics.repositoryNames]);

  const comparisonRows = useMemo(
    () =>
      buildComparisonRows(
        periodResults,
        periods,
        (result) => {
          const metrics = result?.developer_metrics;
          return metrics
            ? Object.values(metrics)
            : [];
        },
        projectMetricDefs,
      ),
    [periodResults, periods],
  );

  const filterSummary = useMemo(() => {
    const activeDevelopers =
      selectedDevelopers.length
        ? `${selectedDevelopers.length} selected`
        : 'All developers';

    const activeRepositories =
      selectedRepositories.length
        ? `${selectedRepositories.length} selected`
        : 'All repositories';

    const activeTopics =
      selectedTopics.length
        ? `${selectedTopics.length} selected`
        : 'All topics';

    const activeStatus =
      selectedStatus.length === DEFAULT_STATUS_FILTER.length
        ? 'All statuses'
        : `${selectedStatus.length} selected`;

    const activePeriods =
      periods.length
        ? `${periods.length} period${
            periods.length === 1 ? '' : 's'
          } selected`
        : 'Any time';

    return {
      activeDevelopers,
      activeRepositories,
      activeTopics,
      activeStatus,
      activePeriods,
    };
  }, [
    selectedDevelopers,
    selectedRepositories,
    selectedTopics,
    selectedStatus,
    periods,
  ]);

  if (detailQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (detailQuery.error) {
    return (
      <ErrorPanel message="Unable to load project details." />
    );
  }

  if (!data) {
    return (
      <ErrorPanel message="Project not found or no project data available." />
    );
  }

  const handleApplyFilters = () => {
    setSelectedDevelopers(draftDevelopers);
    setSelectedRepositories(draftRepositories);
    setSelectedTopics(draftTopics);
    setSelectedStatus(draftStatus);
    setPeriods(draftPeriods);
    setLive(draftLive);
    setSelectedPeriodIndex(0);
  };

  const handleResetFilters = () => {
    setDraftDevelopers([]);
    setDraftRepositories([]);
    setDraftTopics([]);
    setDraftStatus([...DEFAULT_STATUS_FILTER]);
    setDraftPeriods([]);
    setDraftLive(getDefaultLiveValue());

    setSelectedDevelopers([]);
    setSelectedRepositories([]);
    setSelectedTopics([]);
    setSelectedStatus([...DEFAULT_STATUS_FILTER]);
    setPeriods([]);
    setLive(getDefaultLiveValue());

    setSelectedPeriodIndex(0);
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">
            {isTeam ? `Team: ${displayName}` : displayName}
          </Typography>

          <Typography color="text.secondary">
            {isTeam
              ? 'Explore team activity, developer contribution, and collaboration.'
              : 'Explore change activity, repository status, and developer collaboration for this project.'}
          </Typography>
        </Stack>

        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
        >
          <Chip  label={filterSummary.activeDevelopers}/>
          <Chip  label={filterSummary.activeRepositories}/>
          <Chip  label={filterSummary.activeTopics}/>
          <Chip  label={filterSummary.activeStatus}/>
          <Chip  label={filterSummary.activePeriods}/>
        </Stack>

        <FilterBar
          developerOptions={developerOptions}
          repositoryOptions={repositoryOptions}
          topicOptions={topicOptions}

          selectedDeveloper={selectedDevelopers}
          selectedRepositories={selectedRepositories}
          selectedTopics={selectedTopics}
          selectedStatus={selectedStatus}

          periods={periods}
          draftPeriods={draftPeriods}

          live={live}

          draftDeveloper={draftDevelopers}
          draftRepositories={draftRepositories}
          draftTopics={draftTopics}
          draftStatus={draftStatus}
          draftLive={draftLive}

          showRepositorySelector={isTeam}
          showTopicSelector
          topicDisabled={
            draftRepositories.length === 0 &&
            draftDevelopers.length === 0
          }
          developerMultiple

          onDeveloperChange={(value) => {
            const nextDevelopers =
              Array.isArray(value)
                ? value
                : value
                  ? [value]
                  : [];

            setDraftDevelopers(
              nextDevelopers,
            );

            setDraftTopics([]);
          }}

          onRepositoryChange={(value) => {
            setDraftRepositories(value);
            setDraftTopics([]);
          }}

          onTopicChange={setDraftTopics}

          onStatusChange={setDraftStatus}

          onPeriodsChange={setDraftPeriods}

          onLiveChange={setDraftLive}

          onApplyFilters={handleApplyFilters}

          onResetFilters={handleResetFilters}

          onTopicMenuOpenChange={
            setTopicMenuOpen
          }
        />
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
        <SectionCard title="Project status overview">
          {projectMetrics.topStatuses.length > 0 ? (
            <Grid container spacing={2}>
              {projectMetrics.topStatuses.map(
                (statusItem) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={statusItem.status}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'background.paper',
                        border:
                          '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {statusItem.status}
                      </Typography>

                      <Typography variant="h5">
                        {statusItem.count}
                      </Typography>
                    </Paper>
                  </Grid>
                ),
              )}
            </Grid>
          ) : (
            <Typography color="text.secondary">
              No status data available for this period.
            </Typography>
          )}
        </SectionCard>

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
            rows={projectMetrics.fileHotspots.map((file) => ({
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

        <SectionCard title="Developer contribution snapshot">
          <MetricsTable
            maxHeight={400}
            columns={[
              { key: 'username', label: 'Developer' },
              ...metricColumns(snapshotDefinitions(projectMetricDefs)),
            ]}
            rows={projectMetrics.developerRows.map(
              ({ username, metrics, ...row }) => ({
                username: (
                  <Link
                    component={RouterLink}
                    to={developerHref(username)}
                    underline="hover"
                  >
                    {username}
                  </Link>
                ),
                ...row,
              }),
            )}
          />
        </SectionCard>

        {projectMetrics.developerRows.length > 0 && (
          <SectionCard title="Detailed developer metrics">
            <MetricsTable
              maxHeight={400}
              columns={[
                { key: 'username', label: 'Developer' },
                ...metricColumns(projectMetricDetailDefs),
              ]}
              rows={projectMetrics.developerRows.map(
                ({ username, metrics }) => ({
                  username,
                  ...buildMetricRow(
                    metrics,
                    projectMetricDetailDefs,
                  ),
                }),
              )}
            />
          </SectionCard>
        )}
      <SectionCard title="Time related metrics distribution">
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="subtitle2" color="text.secondary">
              Aggregate developers
            </Typography>

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={timeDistributionDeveloperOptions}
              value={activeTimeDistributionDevelopers}
              onChange={(_, nextValue) => {
                setTimeDistributionDevelopers(nextValue ?? []);
              }}
              renderTags={() => `${activeTimeDistributionDevelopers.length} selected`}
              renderInput={(params) => (
                <TextField {...params} label="Developers" size="small" />
              )}
              sx={{ minWidth: 180, maxWidth: 220, width: '100%' }}
            />
          </Stack>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <GapDistributionChart
              data={aggregatedPatchsetGapTime}
              series={selectedPatchsetGapSeries}
              title="Patchset gap distribution"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <GapDistributionChart
              data={aggregatedLeadTime}
              series={selectedDeveloperTimeSeries}
              title="Lead time distribution"
            />
          </Grid>
        </Grid>
      </SectionCard>
      <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          <Box
            sx={{
              flex: '1 1 300px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ChartCard title="Changes by developer" sx={{ height: '100%' }}>
          <ResponsiveContainer
            width="100%"
            height={320}
          >
            <BarChart
              data={projectMetrics.developerChartData}
              margin={{
                left: 0,
                top: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
              />

              <XAxis
                dataKey="name"
                stroke="#cfd8fc"
              />

              <YAxis stroke="#cfd8fc" />

              <Tooltip />

              <Bar
                dataKey="changes"
                fill="#00bcd4"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
          </Box>
          <Box
            sx={{
              flex: '1 1 300px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          <SectionCard title="Repository activity" sx={{ height: '100%' }}>
          {projectMetrics.repositoryDetails.length ? (
            <Box
              sx={{
                height: 420,
                overflowY: 'auto',
                pr: 1,
              }}
            >
              <Stack spacing={2}>
                {projectMetrics.repositoryDetails.map(
                  (row) => {
                    const total =
                      row.total ?? 0;

                    const segments = Object.entries(
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
                                        (
                                          count /
                                          total
                                        ) *
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

                        {row.developers.length ? (
                          <Box sx={{ mt: 2 }}>
                            <Stack spacing={1}>
                              {row.developers.map(
                                (dev) => (
                                  <Box
                                    key={
                                      dev.developer
                                    }
                                    sx={{
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        'space-between',
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                    >
                                      <Link
                                        component={
                                          RouterLink
                                        }
                                        to={developerHref(dev.developer)}
                                        underline="hover"
                                      >
                                        {dev.developer}
                                      </Link>
                                    </Typography>

                                    <Box
                                      sx={{
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        gap: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 60,
                                          height: 6,
                                          borderRadius:
                                            3,
                                            bgcolor:
                                              'rgba(255,255,255,0.08)',
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: `${Math.min(
                                              100,
                                              (dev.total /
                                                total) *
                                                100,
                                            )}%`,
                                            height: 6,
                                            borderRadius:
                                              3,
                                            bgcolor:
                                              'primary.main',
                                          }}
                                        />
                                      </Box>

                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {dev.total}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ),
                              )}
                            </Stack>
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
          </Box>
        </Box>
        <SectionCard title="Collaboration network">
          <RelationshipGraph
            title="Project collaboration network"
            subtitle="Developers connected by shared review and comment interactions."
            directionNote="Each direction shows what the source developer sent to the target developer; the reverse direction is the target developer&apos;s sent activity."
            nodes={
              visibleProjectGraph.nodes
            }
            edges={
              visibleProjectGraph.edges
            }
            centerNodeId={
              visibleProjectGraph.centerNodeId ??
              undefined
            }
            nodeLinkHref={(node) => developerHref(node.id)}
          />
        </SectionCard>

        {projectMetrics.topCollaborators.length > 0 ? (
          <SectionCard title="Collaboration Table">
            <RelationshipTable
              rows={projectMetrics.topCollaborators}
              maxHeight={360}
              perspective="project"
            />
          </SectionCard>
        ) : null}
                {periodResults.length > 1 && (
          <PeriodComparison
            periodResults={periodResults}
            periods={periods}
            selectMetrics={(result) => {
              const metrics =
                result?.developer_metrics;
              return metrics
                ? Object.values(metrics)
                : [];
            }}
            metrics={projectMetricDefs}
          />
        )}
        <Grid
          container
          spacing={3}
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

export default ProjectDetailPage;