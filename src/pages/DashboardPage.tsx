import { Box, FormControlLabel, Grid, Paper, Stack, Switch, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDevelopers } from '@/api/developers';
import { fetchProjects } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';
import { getDefaultLiveValue, setDefaultLiveValue } from '@/utils/livePreference';

const DashboardPage: React.FC = () => {
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const [defaultLive, setDefaultLive] = useState(getDefaultLiveValue);

  useEffect(() => {
    setDefaultLiveValue(defaultLive);
  }, [defaultLive]);

  if (developersQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (developersQuery.error || projectsQuery.error) {
    return <ErrorPanel message="Unable to load dashboard data." />;
  }

  const developers = developersQuery.data?.developers ?? [];
  const projects = projectsQuery.data?.projects ?? [];

  return (
    <Box>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4">Dashboard</Typography>
          <Typography color="text.secondary">Overview of Gerrit activity and system metrics.</Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard title="Total developers" value={developers.length} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Total projects" value={projects.length} />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard title="Live mode" value={defaultLive ? 'Enabled' : 'Disabled'} subtitle={defaultLive ? 'Showing current Gerrit data' : 'Using cached snapshot data by default'} />
          </Grid>
        </Grid>

        <SectionCard title="Default data mode">
          <Stack spacing={1.5}>
            <Typography color="text.secondary">Choose the default mode used by developer and project detail pages when you open them.</Typography>
            <FormControlLabel
              control={<Switch checked={defaultLive} onChange={(event) => setDefaultLive(event.target.checked)} />}
              label={defaultLive ? 'Live data by default' : 'Cached data by default'}
            />
          </Stack>
        </SectionCard>

        <SectionCard title="Quick navigation">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper sx={{ p: 2, width: '100%', bgcolor: 'primary.dark' }}>Developers list</Paper>
            <Paper sx={{ p: 2, width: '100%', bgcolor: 'primary.dark' }}>Projects list</Paper>
          </Stack>
        </SectionCard>

        <SectionCard title="Recent activity">
          <Typography color="text.secondary">Recent activity is provided by the backend live dataset.</Typography>
          <Typography color="text.secondary">Use developer or project details to explore the latest metrics.</Typography>
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default DashboardPage;
