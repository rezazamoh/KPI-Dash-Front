import { apiClient } from './client';
import { buildQueryString, Period } from './queryParams';
import {
  DeveloperListResponse,
  DeveloperDetailResponse,
} from '@/types/developers';

export const fetchDevelopers = async (
  live = false,
): Promise<DeveloperListResponse> => {
  const response = await apiClient.get('/gerrit/developers', {
    params: { live },
  });

  return response.data;
};

export const fetchDeveloper = async (
  username: string,
  params: {
    repo?: string[];
    topic?: string[];
    periods?: Period[];
    live?: boolean;
    group_by_repo?: boolean;
    group_by_topic?: boolean;
  },
): Promise<DeveloperDetailResponse> => {
  const queryString = buildQueryString({
    repo: params.repo,
    topic: params.topic,
    periods: params.periods,
    group_by_repo: params.group_by_repo ?? false,
    group_by_topic: params.group_by_topic ?? false,
    live: params.live ?? true,
  });

  const response = await apiClient.get(
    `/gerrit/developers/${encodeURIComponent(username)}${queryString}`,
  );

  return response.data;
};

export const fetchDeveloperTopics = async (
  username: string,
  repos: string[],
): Promise<string[]> => {
  const queryString = buildQueryString({
    repo: repos,
  });

  const response = await apiClient.get(
    `/gerrit/developers/${encodeURIComponent(username)}/topics${queryString}`,
  );

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.topics)) {
    return data.topics;
  }

  return [];
};