import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  Link,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Link as RouterLink } from 'react-router-dom';

import { fetchDevelopers } from '@/api/developers';
import { fetchProjects } from '@/api/projects';

import {
  createTeam,
  deleteTeam,
  fetchTeams,
  Team,
  updateTeam,
} from '@/api/teams';

import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorPanel from '@/components/ui/ErrorPanel';
import MetricCard from '@/components/ui/MetricCard';
import SectionCard from '@/components/ui/SectionCard';

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === 'string',
  );
};

const GerritDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const developersQuery = useQuery({
    queryKey: ['developers'],
    queryFn: () => fetchDevelopers(),
    staleTime: 5 * 60 * 1000,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60 * 1000
  });

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000
  });

  const [tab, setTab] = useState(0);

  const [developerSearch, setDeveloperSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamProjects, setTeamProjects] = useState<string[]>([]);

  const developers = developersQuery.data?.developers ?? [];
  const projects = projectsQuery.data?.projects ?? [];
  const teams = teamsQuery.data ?? [];

  const filteredDevelopers = useMemo(
    () =>
      developers.filter((developer) =>
        developer
          .toLowerCase()
          .includes(developerSearch.toLowerCase()),
      ),
    [developers, developerSearch],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        project
          .toLowerCase()
          .includes(projectSearch.toLowerCase()),
      ),
    [projects, projectSearch],
  );

  const filteredTeams = useMemo(() => {
    let result = teams;

    if (teamSearch) {
      result = result.filter((team) =>
        team.name
          .toLowerCase()
          .includes(teamSearch.toLowerCase()),
      );
    }
    return result;
  }, [teams, teamSearch]);

  const createMutation = useMutation({
    mutationFn: createTeam,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teams'],
      });

      closeTeamDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      teamId,
      name,
      members,
      projects,
      default_teams,
    }: {
      teamId: number;
      name: string;
      members: string[];
      projects: string[];
      default_teams?: string[];
    }) =>
      updateTeam(teamId, {
        name,
        members,
        projects,
        default_teams,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teams'],
      });

      closeTeamDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teams'],
      });
    },
  });
  
  const refreshDevelopers = async () => {
    try {
      const data = await fetchDevelopers(true);

      queryClient.setQueryData(['developers'], data);
    } catch (error) {
      console.error('Failed to refresh developers:', error);
    }
  };

  const refreshProjects = async () => {
    try {
      const data = await fetchProjects(true);

      queryClient.setQueryData(['projects'], data);
    } catch (error) {
      console.error('Failed to refresh projects:', error);
    }
  };

  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamMembers([]);
    setTeamProjects([]);
    setTeamDialogOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamMembers(toStringArray(team.members));
    setTeamProjects(toStringArray(team.projects));
    setTeamDialogOpen(true);
  };

  const closeTeamDialog = () => {
    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName('');
    setTeamMembers([]);
    setTeamProjects([]);
  };

  const handleSaveTeam = () => {
    if (!teamName.trim()) {
      return;
    }

    if (editingTeam) {
      updateMutation.mutate({
        teamId: editingTeam.id,
        name: teamName.trim(),
        members: teamMembers,
        projects: teamProjects,
      });

      return;
    }

    createMutation.mutate({
      name: teamName.trim(),
      members: teamMembers,
      projects: teamProjects,
    });
  };

  const handleDeleteTeam = (team: Team) => {
    if (
      window.confirm(
        `Delete team "${team.name}"?`,
      )
    ) {
      deleteMutation.mutate(team.id);
    }
  };

  if (
    developersQuery.isLoading ||
    projectsQuery.isLoading ||
    teamsQuery.isLoading
  ) {
    return <LoadingSpinner />;
  }

  if (
    developersQuery.error ||
    projectsQuery.error ||
    teamsQuery.error
  ) {
    return (
      <ErrorPanel message="Unable to load Gerrit Dashboard data." />
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h4">
            Gerrit Dashboard
          </Typography>

          <Typography color="text.secondary">
            Overview of Gerrit activity and system metrics.
          </Typography>
        </Stack>

        {/* Counters stay unchanged */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard
              title="Total developers"
              value={developers.length}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard
              title="Total projects"
              value={projects.length}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard
              title="Total teams"
              value={teams.length}
            />
          </Grid>
        </Grid>

        <SectionCard title="Gerrit resources">
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ mb: 3 }}
          >
            <Tab label="Developers" />
            <Tab label="Projects" />
            <Tab label="Teams" />
          </Tabs>

          {/* DEVELOPERS */}
          {tab === 0 && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Search developers"
                value={developerSearch}
                onChange={(event) =>
                  setDeveloperSearch(event.target.value)
                }
              />

              <Box
                sx={{
                  maxHeight: 520,
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
              <List sx={{ p: 0 }}>
                {filteredDevelopers.length > 0 ? (
                  filteredDevelopers.map((developer) => (
                    <ListItem
                      key={developer}
                      disableGutters
                      sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        py: 1.5,
                      }}
                    >
                      <Link
                        component={RouterLink}
                        to={`/gerrit/developers/${encodeURIComponent(developer)}`}
                        underline="hover"
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 500,
                        }}
                      >
                        {developer}
                      </Link>
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      Couldn't find what you're looking for?
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={refreshDevelopers}
                    >
                      Refresh database
                    </Button>
                  </Box>
                )}
              </List>
              </Box>
            </Stack>
          )}

          {/* PROJECTS */}
          {tab === 1 && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Search projects"
                value={projectSearch}
                onChange={(event) =>
                  setProjectSearch(event.target.value)
                }
              />

              <Box
                sx={{
                  maxHeight: 520,
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
              <List sx={{ p: 0 }}>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <ListItem
                      key={project}
                      disableGutters
                      sx={{
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        py: 1.5,
                      }}
                    >
                      <Link
                        component={RouterLink}
                        to={`/gerrit/projects/${encodeURIComponent(project)}`}
                        underline="hover"
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 500,
                        }}
                      >
                        {project}
                      </Link>
                    </ListItem>
                  ))
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      Couldn't find what you're looking for?
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={refreshProjects}
                    >
                      Refresh database
                    </Button>
                  </Box>
                )}
              </List>
              </Box>
            </Stack>
          )}

          {/* TEAMS */}
          {tab === 2 && (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Search teams"
                  value={teamSearch}
                  onChange={(event) =>
                    setTeamSearch(event.target.value)
                  }
                />
                <Button
                  variant="contained"
                  onClick={openCreateTeam}
                >
                  Add Team
                </Button>
              </Stack>

              <Box
                sx={{
                  maxHeight: 520,
                  overflowY: 'auto',
                  pr: 1,
                }}
              >
                <List sx={{ p: 0 }}>
                  {filteredTeams.map((team) => (
                    <ListItem
                      key={team.id}
                      disableGutters
                      sx={{
                        borderBottom:
                          '1px solid rgba(255,255,255,0.08)',
                        py: 1.5,
                      }}
                    >
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={2}
                        alignItems={{
                          xs: 'flex-start',
                          sm: 'center',
                        }}
                        justifyContent="space-between"
                        width="100%"
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: '1rem',
                              fontWeight: 500,
                            }}
                          >
                            {team.name}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {team.members.length} members
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              openEditTeam(team)
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              handleDeleteTeam(team)
                            }
                          >
                            Delete
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            component={RouterLink}
                            to={`/gerrit/teams/${team.id}`}
                          >
                            Analyze
                          </Button>
                        </Stack>
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Stack>
          )}
        </SectionCard>
      </Stack>

      {/* TEAM CREATE / EDIT DIALOG */}
      <Dialog
        open={teamDialogOpen}
        onClose={closeTeamDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingTeam ? 'Edit team' : 'Add team'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Team name"
              value={teamName}
              onChange={(event) =>
                setTeamName(event.target.value)
              }
            />

          <Autocomplete
            multiple
            fullWidth
            options={developers}
            value={teamMembers}
            onChange={(event, newValue) => setTeamMembers(newValue)}
            filterSelectedOptions
            renderTags={(value, getTagProps) =>
              value.map((developer, index) => (
                <Chip
                  label={developer}
                  size="small"
                  {...getTagProps({ index })}
                  key={developer}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Members"
                placeholder={teamMembers.length ? '' : 'Search developers...'}
              />
            )}
          />
                    <Autocomplete
            multiple
            fullWidth
            options={projects}
            value={teamProjects}
            onChange={(event, newValue) => setTeamProjects(newValue)}
            filterSelectedOptions
            renderTags={(value, getTagProps) =>
              value.map((project, index) => (
                <Chip
                  label={project}
                  size="small"
                  {...getTagProps({ index })}
                  key={project}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Projects"
                placeholder={teamProjects.length ? '' : 'Search projects...'}
              />
            )}
          />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeTeamDialog}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveTeam}
            disabled={
              !teamName.trim() ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {editingTeam ? 'Save changes' : 'Create team'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GerritDashboardPage;