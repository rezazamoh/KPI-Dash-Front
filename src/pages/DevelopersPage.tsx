import { Box, Card, CardContent, Grid, Link, List, ListItem, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { fetchDevelopers } from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';

const DevelopersPage: React.FC = () => {
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers ,staleTime: 5 * 60 * 1000});
  const [search, setSearch] = useState('');

  const developers = developersQuery.data?.developers ?? [];

  const filteredDevelopers = useMemo(
    () => developers.filter((username) => username.toLowerCase().includes(search.toLowerCase())),
    [developers, search]
  );

  if (developersQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (developersQuery.error) {
    return <ErrorPanel message="Unable to load developers list." />;
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Developers</Typography>
          <Typography color="text.secondary">
            Explore contributor activity, review engagement, and repository-level performance in one place.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Available contributors</Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>{developers.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <CardContent>
                <TextField
                  fullWidth
                  size="small"
                  label="Search developers"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Select a developer to view repository breakdowns, review trends, build health, and topic-based insights.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <SectionCard title="Developer overview">
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
                <Link
                  component={RouterLink}
                  to={`/gerrit/developers/${encodeURIComponent(developer)}`}
                  underline="hover"
                  sx={{ fontSize: '1rem', fontWeight: 500 }}
                >
                  {developer}
                </Link>
              </ListItem>
            ))}
          </List>
        </SectionCard>
      </Stack>
    </Box>
  );
};

export default DevelopersPage;
