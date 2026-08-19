import {
  Box,
  Chip,
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

import { useMemo, useState } from 'react';

import { Link as RouterLink, useParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import {
  fetchTeamPerformance,
  Team,
} from '@/api/teams';

import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';
import ChartCard from '@/components/ui/ChartCard';
import RelationshipGraph from '@/components/ui/RelationshipGraph';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getDefaultLiveValue } from '@/utils/livePreference';

interface TeamPerformanceResponse {
  team: Team;

  filters?: {
    projects?: string[];
    developers?: string[];
    topics?: string[];
    start_date?: string | null;
    end_date?: string | null;
  };

  developers?: string[];

  developer_metrics?: Record<
    string,
    {
      change_count?: number;
      average_patchsets?: number;
      build_failure_rate?: {
        overall_failure_rate?: number;
      };
      lead_time?: {
        mean?: number;
      };

      review_requests_sent?: {
        people?: Array<{
          username: string;
          count: number;
        }>;
      };

      review_requests_received?: {
        people?: Array<{
          username: string;
          count: number;
        }>;
      };

      comments_sent?: {
        people?: Array<{
          username: string;
          count: number;
        }>;
      };

      comments_received?: {
        people?: Array<{
          username: string;
          count: number;
        }>;
      };

      changes_by_status_per_repo?: Record<
        string,
        Record<string, number>
      >;
    }
  >;

  relationship_graph?: {
    nodes: Array<{
      id: string;
      activity?: number;
    }>;

    edges: Array<{
      source: string;
      target: string;
      totalInteractions?: number;
    }>;
  };
}

const formatPercent = (
  value: number | null | undefined,
) => {
  if (
    typeof value !== 'number' ||
    Number.isNaN(value)
  ) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
};

const sumPeople = (
  people:
    | Array<{
        username: string;
        count: number;
      }>
    | null
    | undefined,
) =>
  people?.reduce(
    (sum, item) => sum + item.count,
    0,
  ) ?? 0;

const TeamPerformancePage: React.FC = () => {
  const { teamId } = useParams<{
    teamId: string;
  }>();

  const [live] = useState(getDefaultLiveValue);

  const id = Number(teamId);

  const performanceQuery =
    useQuery<TeamPerformanceResponse>({
      queryKey: [
        'team-performance',
        id,
        live,
      ],

      queryFn: () =>
        fetchTeamPerformance(id, {
          live,
        }),

      enabled: Number.isFinite(id),
      staleTime: 5 * 60 * 1000
    });

  const data = performanceQuery.data;

  const developerMetrics = useMemo(
    () =>
      data?.developer_metrics ?? {},
    [data],
  );

  const developerRows = useMemo(
    () =>
      Object.entries(developerMetrics)
        .map(
          ([username, metrics]) => {
            const reviewSent =
              sumPeople(
                metrics
                  .review_requests_sent
                  ?.people,
              );

            const reviewReceived =
              sumPeople(
                metrics
                  .review_requests_received
                  ?.people,
              );

            const commentsSent =
              sumPeople(
                metrics
                  .comments_sent
                  ?.people,
              );

            const commentsReceived =
              sumPeople(
                metrics
                  .comments_received
                  ?.people,
              );

            return {
              username,

              changeCount:
                metrics.change_count ?? 0,

              patchsets:
                metrics.average_patchsets,

              failureRate:
                formatPercent(
                  metrics
                    .build_failure_rate
                    ?.overall_failure_rate,
                ),

              leadTime:
                metrics.lead_time?.mean
                  ? `${metrics.lead_time.mean.toFixed(
                      1,
                    )}h`
                  : '—',

              interactions:
                reviewSent +
                reviewReceived +
                commentsSent +
                commentsReceived,
            };
          },
        )
        .sort(
          (a, b) =>
            b.changeCount -
            a.changeCount,
        ),
    [developerMetrics],
  );

  const chartData = useMemo(
    () =>
      Object.entries(developerMetrics).map(
        ([username, metrics]) => ({
          name: username,
          changes:
            metrics.change_count ?? 0,
        }),
      ),
    [developerMetrics],
  );

  const overview = useMemo(() => {
    let totalChanges = 0;

    const repositories = new Set<string>();

    Object.values(developerMetrics).forEach(
      (metrics) => {
        totalChanges +=
          metrics.change_count ?? 0;

        Object.keys(
          metrics.changes_by_status_per_repo ??
            {},
        ).forEach((repo) =>
          repositories.add(repo),
        );
      },
    );

    return {
      developerCount:
        Object.keys(developerMetrics)
          .length,

      totalChanges,

      repositoryCount:
        repositories.size,
    };
  }, [developerMetrics]);

  const graph = useMemo(() => {
    const original =
      data?.relationship_graph;

    if (!original) {
      return {
        nodes: [],
        edges: [],
        centerNodeId: null,
      };
    }

    const edges = [
      ...original.edges,
    ]
      .sort(
        (a, b) =>
          (b.totalInteractions ?? 0) -
          (a.totalInteractions ?? 0),
      )
      .slice(0, 18);

    const nodeIds = new Set<string>();

    edges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });

    const centerNodeId =
      [...original.nodes]
        .sort(
          (a, b) =>
            (b.activity ?? 0) -
            (a.activity ?? 0),
        )[0]?.id ?? null;

    const nodes =
      original.nodes.filter(
        (node) =>
          nodeIds.has(node.id) ||
          node.id === centerNodeId,
      );

    return {
      nodes,
      edges,
      centerNodeId,
    };
  }, [data]);

  if (performanceQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (performanceQuery.error) {
    return (
      <ErrorPanel message="Unable to load team performance." />
    );
  }

  if (!data) {
    return (
      <ErrorPanel message="Team not found or no performance data available." />
    );
  }

  const team = data.team;

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">
            {team.name}
          </Typography>

          <Typography color="text.secondary">
            Team performance and Gerrit activity.
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
        >
          <Chip
            label={`${overview.developerCount} developers`}
          />

          <Chip
            label={`${overview.repositoryCount} projects`}
          />

          <Chip
            label={`${overview.totalChanges} changes`}
          />
        </Stack>

        <SectionCard title="Team members">
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
          >
            {team.members.map(
              (member) => (
                <Chip
                  key={member}
                  label={member}
                  component={RouterLink}
                  clickable
                  to={`/gerrit/developers/${encodeURIComponent(
                    member,
                  )}`}
                />
              ),
            )}
          </Stack>
        </SectionCard>

        {team.projects &&
        team.projects.length > 0 ? (
          <SectionCard title="Projects">
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
            >
              {team.projects.map(
                (project) => (
                  <Chip
                    key={project}
                    label={project}
                    component={RouterLink}
                    clickable
                    to={`/gerrit/projects/${encodeURIComponent(
                      project,
                    )}`}
                  />
                ),
              )}
            </Stack>
          </SectionCard>
        ) : null}

        <SectionCard title="Developer contribution">
          <TableContainer
            component={Paper}
            sx={{
              bgcolor:
                'background.paper',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    Developer
                  </TableCell>

                  <TableCell>
                    Changes
                  </TableCell>

                  <TableCell>
                    Avg patchsets
                  </TableCell>

                  <TableCell>
                    Failure rate
                  </TableCell>

                  <TableCell>
                    Lead time
                  </TableCell>

                  <TableCell>
                    Interactions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {developerRows.map(
                  (row) => (
                    <TableRow
                      key={row.username}
                      hover
                    >
                      <TableCell>
                        <Link
                          component={
                            RouterLink
                          }
                          to={`/gerrit/developers/${encodeURIComponent(
                            row.username,
                          )}`}
                          underline="hover"
                        >
                          {row.username}
                        </Link>
                      </TableCell>

                      <TableCell>
                        {row.changeCount}
                      </TableCell>

                      <TableCell>
                        {row.patchsets ??
                          '—'}
                      </TableCell>

                      <TableCell>
                        {row.failureRate}
                      </TableCell>

                      <TableCell>
                        {row.leadTime}
                      </TableCell>

                      <TableCell>
                        {row.interactions}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <ChartCard title="Changes by developer">
          <ResponsiveContainer
            width="100%"
            height={320}
          >
            <BarChart
              data={chartData}
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

              <YAxis
                stroke="#cfd8fc"
              />

              <Tooltip />

              <Bar
                dataKey="changes"
                fill="#00bcd4"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <SectionCard title="Team collaboration network">
          <RelationshipGraph
            title="Team collaboration network"
            subtitle="Developers connected by shared review and comment interactions."
            nodes={graph.nodes}
            edges={graph.edges}
            centerNodeId={
              graph.centerNodeId ??
              undefined
            }
            nodeLinkHref={(node) =>
              `/gerrit/developers/${encodeURIComponent(
                node.id,
              )}`
            }
          />
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default TeamPerformancePage;