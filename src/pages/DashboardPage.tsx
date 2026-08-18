import { Box, FormControlLabel, Grid, Link, List, ListItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
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
  const [developerSearch, setDeveloperSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    setDefaultLiveValue(defaultLive);
  }, [defaultLive]);

  const developers = developersQuery.data?.developers ?? [];
  const projects = projectsQuery.data?.projects ?? [];

  const filteredDevelopers = useMemo(
    () => developers.filter((developer) => developer.toLowerCase().includes(developerSearch.toLowerCase())),
    [developers, developerSearch]
  );

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.toLowerCase().includes(projectSearch.toLowerCase())),
    [projects, projectSearch]
  );

  if (developersQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (developersQuery.error || projectsQuery.error) {
    return <ErrorPanel message="Unable to load dashboard data." />;
  }

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
          <SectionCard title="Default data mode">
            <Stack spacing={1.5}>
              <FormControlLabel
                control={<Switch checked={defaultLive} onChange={(event) => setDefaultLive(event.target.checked)} />}
                label={defaultLive ? 'Live data by default' : 'Cached data by default'}
              />
            </Stack>
          </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <SectionCard title="Developers">
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search developers"
                  value={developerSearch}
                  onChange={(event) => setDeveloperSearch(event.target.value)}
                />
                <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 1 }}>
                  <List sx={{ p: 0 }}>
                    {filteredDevelopers.map((developer) => (
                      <ListItem
                        key={developer}
                        disableGutters
                        sx={{
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          py: 1.5,
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Link component={RouterLink} to={`/gerrit/developers/${encodeURIComponent(developer)}`} underline="hover" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                          {developer}
                        </Link>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard title="Projects">
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search projects"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                />
                <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 1 }}>
                  <List sx={{ p: 0 }}>
                    {filteredProjects.map((project) => (
                      <ListItem
                        key={project}
                        disableGutters
                        sx={{
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          py: 1.5,
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Link component={RouterLink} to={`/gerrit/projects/${encodeURIComponent(project)}`} underline="hover" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                          {project}
                        </Link>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default DashboardPage;
