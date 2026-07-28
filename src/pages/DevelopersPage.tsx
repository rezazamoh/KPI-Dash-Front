import { Box, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { fetchDevelopers } from '@/api/developers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import SectionCard from '@/components/ui/SectionCard';

const DevelopersPage: React.FC = () => {
  const developersQuery = useQuery({ queryKey: ['developers'], queryFn: fetchDevelopers });
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
        <Stack>
          <Typography variant="h4">Developers</Typography>
          <Typography color="text.secondary">Browse developer performance details from Gerrit.</Typography>
        </Stack>

        <SectionCard title="Developer list">
          <Card>
            <CardContent>
              <input
                type="search"
                placeholder="Search developers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#0b1220', color: '#fff' }}
              />
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {filteredDevelopers.map((developer) => (
                  <Grid key={developer} item xs={12} sm={6} md={4}>
                    <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {developer}
                        </Typography>
                        <Link component={RouterLink} to={`/developers/${encodeURIComponent(developer)}`} underline="hover">
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

export default DevelopersPage;
