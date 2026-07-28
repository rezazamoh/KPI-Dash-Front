import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchDevelopers } from '@/api/developers';
import { fetchProjects } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';

const DashboardPage: React.FC = () => {
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });

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
            <MetricCard title="Live mode" value="Enabled" subtitle="Showing current Gerrit data" />
          </Grid>
        </Grid>

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
