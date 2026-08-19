import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJiraBoards, fetchJiraIssue, fetchJiraPerformance, fetchJiraProjects } from '@/api/jira';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';
import MetricCard from '@/components/ui/MetricCard';
import ChartCard from '@/components/ui/ChartCard';
import MetricsTable from '@/components/ui/MetricsTable';
import {
  JiraBoard,
  JiraIssueResponse,
  JiraPerformanceMetrics,
  JiraPerformanceResponse,
  JiraProject,
} from '@/types/jira';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
};

const formatDays = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${value.toFixed(1)} days`;
};

const toChartData = (record: Record<string, number>) =>
  Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

const buildCountRows = (record: Record<string, number>) =>
  Object.entries(record)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

const CountChart: React.FC<{ title: string; data: Array<{ name: string; count: number }>; fill: string }> = ({
  title,
  data,
  fill,
}) => (
  <ChartCard title={title}>
    {data.length ? (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" stroke="#cfd8fc" />
          <YAxis stroke="#cfd8fc" />
          <Tooltip />
          <Bar dataKey="count" fill={fill} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <Typography color="text.secondary">No data available.</Typography>
    )}
  </ChartCard>
);

const CountTable: React.FC<{ title: string; record: Record<string, number> }> = ({ title, record }) => (
  <SectionCard title={title}>
    <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
      <MetricsTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'count', label: 'Count' },
        ]}
        rows={buildCountRows(record)}
      />
    </Box>
  </SectionCard>
);

const PerformanceDashboard: React.FC<{ metrics: JiraPerformanceMetrics }> = ({ metrics }) => {
  const statusData = toChartData(metrics.by_status);
  const issueTypeData = toChartData(metrics.by_issue_type);
  const priorityData = toChartData(metrics.by_priority);

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Total issues" value={metrics.total_issues} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Completed" value={metrics.completed} accent="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Open" value={metrics.open} accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Completion rate" value={formatPercent(metrics.completion_rate)} accent="info.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Bugs" value={metrics.bugs} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Bug rate" value={formatPercent(metrics.bug_rate)} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg. issue age"
            value={formatDays(metrics.average_issue_age_days)}
            subtitle="Days since created"
            accent="secondary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg. resolution time"
            value={formatDays(metrics.average_resolution_time_days)}
            subtitle="Days from created to resolved"
            accent="secondary.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <CountChart title="Issues by status" data={statusData} fill="#00bcd4" />
        </Grid>
        <Grid item xs={12} lg={4}>
          <CountChart title="Issues by issue type" data={issueTypeData} fill="#7c4dff" />
        </Grid>
        <Grid item xs={12} lg={4}>
          <CountChart title="Issues by priority" data={priorityData} fill="#34d399" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CountTable title="Issues by assignee" record={metrics.by_assignee} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CountTable title="Issues by reporter" record={metrics.by_reporter} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <CountTable title="Issues by component" record={metrics.by_component} />
        </Grid>
        <Grid item xs={12} md={4}>
          <CountTable title="Issues by label" record={metrics.by_label} />
        </Grid>
        <Grid item xs={12} md={4}>
          <CountTable title="Issues by fix version" record={metrics.by_fix_version} />
        </Grid>
      </Grid>
    </Stack>
  );
};

const JiraAnalysisPage: React.FC = () => {
  const [draftProject, setDraftProject] = useState<JiraProject | null>(null);
  const [draftBoards, setDraftBoards] = useState<JiraBoard[]>([]);
  const [appliedProject, setAppliedProject] = useState<JiraProject | null>(null);
  const [appliedBoards, setAppliedBoards] = useState<JiraBoard[]>([]);
  const [issueKey, setIssueKey] = useState('');
  const [analyzedIssueKey, setAnalyzedIssueKey] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  const projectsQuery = useQuery({ queryKey: ['jira-projects'], queryFn: fetchJiraProjects ,staleTime: 5 * 60 * 1000});
  const projects = projectsQuery.data?.projects ?? [];

  const boardsQuery = useQuery<JiraBoard[]>({
    queryKey: ['jira-boards', draftProject?.key],
    queryFn: async () => {
      if (!draftProject) return [];
      const response = await fetchJiraBoards(draftProject.key);
      return response.boards;
    },
    enabled: Boolean(draftProject),
    staleTime: 5 * 60 * 1000
  });

  const performanceQuery = useQuery<JiraPerformanceResponse | undefined>({
    queryKey: ['jira-performance', appliedProject?.key, appliedBoards.map((board) => board.id)],
    queryFn: async () => {
      if (!appliedProject) return undefined;
      return fetchJiraPerformance(appliedProject.key, appliedBoards.map((board) => board.id));
    },
    enabled: Boolean(appliedProject),
    staleTime: 5 * 60 * 1000
  });

  const issueQuery = useQuery<JiraIssueResponse | undefined>({
    queryKey: ['jira-issue', analyzedIssueKey],
    queryFn: async () => {
      if (!analyzedIssueKey) return undefined;
      return fetchJiraIssue(analyzedIssueKey);
    },
    enabled: Boolean(analyzedIssueKey),
    staleTime: 5 * 60 * 1000
  });

  if (projectsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (projectsQuery.error) {
    return <ErrorPanel message="Unable to load Jira projects." />;
  }

  const handleRunAnalysis = () => {
    setAppliedProject(draftProject);
    setAppliedBoards(draftBoards);
  };

  const handleReset = () => {
    setDraftProject(null);
    setDraftBoards([]);
    setAppliedProject(null);
    setAppliedBoards([]);
  };

  const handleIssueSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAnalyzedIssueKey(issueKey.trim());
  };

  const boardsLabel = appliedBoards.length
    ? appliedBoards.map((board) => board.name).join(', ')
    : 'All boards';
  const scopeLabel = appliedBoards.length
    ? `${appliedBoards.length} selected board${appliedBoards.length === 1 ? '' : 's'}`
    : 'Entire project';

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Jira Analysis</Typography>
          <Typography color="text.secondary">
            Explore Jira project scope, board-level performance, and individual issue metrics.
          </Typography>
        </Stack>

        <SectionCard title="Analysis scope">
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              flexWrap="wrap"
              alignItems="center"
            >
              <Autocomplete
                value={draftProject}
                options={projects}
                getOptionLabel={(project) => project.name}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                onChange={(_, value) => {
                  setDraftProject(value);
                  setDraftBoards([]);
                }}
                renderInput={(params) => <TextField {...params} label="Project" size="small" />}
                sx={{ minWidth: 280, maxWidth: 420 }}
              />
              <Autocomplete
                multiple
                value={draftBoards}
                options={boardsQuery.data ?? []}
                getOptionLabel={(board) => board.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) => setDraftBoards(value)}
                renderInput={(params) => <TextField {...params} label="Boards (optional)" size="small" />}
                disabled={!draftProject}
                sx={{ minWidth: 280, maxWidth: 420 }}
              />
            </Stack>
            {boardsQuery.isLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading boards…
              </Typography>
            ) : null}
            {boardsQuery.isError ? (
              <Alert severity="warning">Unable to load boards for this project.</Alert>
            ) : null}
            {projects.length === 0 ? (
              <Typography color="text.secondary">No Jira projects found.</Typography>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" disabled={!draftProject} onClick={handleRunAnalysis}>
                Run analysis
              </Button>
              <Button variant="outlined" size="small" onClick={handleReset}>
                Reset
              </Button>
            </Stack>
          </Stack>
        </SectionCard>

        {appliedProject ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={`Project: ${appliedProject.name}`} />
            <Chip label={`Boards: ${boardsLabel}`} />
            <Chip label={`Scope: ${scopeLabel}`} />
          </Stack>
        ) : null}

        {!appliedProject ? (
          <SectionCard title="Performance">
            <Typography color="text.secondary">
              Select a Jira project and run the analysis to view KPI metrics for the chosen scope.
            </Typography>
          </SectionCard>
        ) : performanceQuery.isLoading ? (
          <LoadingSpinner label="Calculating Jira performance" />
        ) : performanceQuery.isError ? (
          <ErrorPanel message="Unable to load performance metrics for the selected scope." />
        ) : performanceQuery.data ? (
          <>
            <PerformanceDashboard metrics={performanceQuery.data.performance} />
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Button size="small" variant="text" onClick={() => setShowRawJson((current) => !current)}>
                  {showRawJson ? 'Hide raw response' : 'Show raw response'}
                </Button>
                <Collapse in={showRawJson}>
                  <Paper
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: 'background.paper',
                      border: '1px solid rgba(255,255,255,0.08)',
                      maxHeight: 360,
                      overflowY: 'auto',
                    }}
                  >
                    <Box
                      component="pre"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.primary', fontSize: '0.85rem' }}
                    >
                      {JSON.stringify(performanceQuery.data, null, 2)}
                    </Box>
                  </Paper>
                </Collapse>
              </Grid>
            </Grid>
          </>
        ) : null}

        <SectionCard title="Issue analysis">
          <Stack spacing={2}>
            <Typography color="text.secondary">
              Inspect KPI metrics for a single Jira issue by entering its key, for example DEVOPS-703.
            </Typography>
            <Box component="form" onSubmit={handleIssueSubmit} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                label="Issue key"
                size="small"
                placeholder="DEVOPS-703"
                value={issueKey}
                onChange={(event) => setIssueKey(event.target.value)}
              />
              <Button type="submit" variant="contained" size="small" disabled={!issueKey.trim()}>
                Analyze
              </Button>
            </Box>
            {issueQuery.isLoading ? (
              <LoadingSpinner label="Calculating issue performance" />
            ) : null}
            {issueQuery.isError ? (
              <Alert severity="error">Unable to load this issue. Check the issue key and try again.</Alert>
            ) : null}
            {issueQuery.data ? (
              <PerformanceDashboard metrics={issueQuery.data.performance} />
            ) : null}
          </Stack>
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default JiraAnalysisPage;