import axios from 'axios';
import { DeveloperListResponse, DeveloperDetailResponse } from '@/types/developers';
import { apiClient } from './client';

const buildQueryString = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const fetchDevelopers = async (live = false): Promise<DeveloperListResponse> => {
  const response = await apiClient.get('/gerrit/developers',{params: { live },});
  return response.data;
};

export const fetchDeveloper = async (
  username: string,
  params: Record<string, any>
): Promise<DeveloperDetailResponse> => {
  const queryString = buildQueryString({
    repo: params.repo,
    topic: params.topic,
    start_date: params.start_date,
    end_date: params.end_date,
    group_by_repo: params.group_by_repo ?? false,
    group_by_topic: params.group_by_topic ?? false,
    live: params.live ?? true,
  });

  const response = await apiClient.get(`/gerrit/developers/${encodeURIComponent(username)}${queryString}`);
  return response.data;
};

export const fetchDeveloperTopics = async (
  username: string,
  repos: string[]
): Promise<string[]> => {
  const queryString = buildQueryString({ repo: repos });
  const response = await apiClient.get(`/gerrit/developers/${encodeURIComponent(username)}/topics${queryString}`);

  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.topics)) {
    return data.topics;
  }

  return [];
};
