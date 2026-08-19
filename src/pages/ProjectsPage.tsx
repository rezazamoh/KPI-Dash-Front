import { Box, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { fetchProjects } from '@/api/projects';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';

const ProjectsPage: React.FC = () => {
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: fetchProjects ,staleTime: 5 * 60 * 1000});
  const [search, setSearch] = useState('');

  const projects = projectsQuery.data?.projects ?? [];

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  if (projectsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (projectsQuery.error) {
    return <ErrorPanel message="Unable to load projects list." />;
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4">Projects</Typography>
          <Typography color="text.secondary">Browse project-level metrics and developer comparisons.</Typography>
        </Stack>

        <SectionCard title="Project list">
          <Card>
            <CardContent>
              <input
                type="search"
                placeholder="Search projects"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#0b1220', color: '#fff' }}
              />
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {filteredProjects.map((project) => (
                  <Grid key={project} item xs={12} sm={6} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {project}
                        </Typography>
                        <Link component={RouterLink} to={`/gerrit/projects/${encodeURIComponent(project)}`} underline="hover">
                          View details
                        </Link>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default ProjectsPage;
