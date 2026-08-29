import { buildQueryString, Period } from './queryParams';
import { apiClient } from './client';

export interface Team {
  id: number;
  name: string;
  members: string[];
  projects?: string[];
}

export interface CreateTeamRequest {
  name: string;
  members: string[];
  projects?: string[];
}

export interface UpdateTeamRequest {
  name: string;
  members: string[];
  projects?: string[];
}

export const fetchTeams = async (): Promise<Team[]> => {
  const response = await apiClient.get('/gerrit/teams');
  return response.data;
};

export const createTeam = async (
  data: CreateTeamRequest,
): Promise<Team> => {
  const response = await apiClient.post('/gerrit/teams', data);
  return response.data;
};

export const updateTeam = async (
  teamId: number,
  data: UpdateTeamRequest,
): Promise<Team> => {
  const response = await apiClient.put(
    `/gerrit/teams/${teamId}`,
    data,
  );

  return response.data;
};

export const deleteTeam = async (teamId: number): Promise<void> => {
  await apiClient.delete(`/gerrit/teams/${teamId}`);
};


export const fetchTeamPerformance = async (
  teamId: number,
  params: {
    username?: string[];
    project?: string[];
    topic?: string[];
    periods?: Period[];
    live?: boolean;
  } = {},
) => {
  const queryString = buildQueryString({
    username: params.username,
    project: params.project,
    topic: params.topic,
    periods: params.periods,
    live: params.live,
  });

  const response = await apiClient.get(
    `/gerrit/teams/${teamId}/performance${queryString}`,
  );

  return response.data;
};