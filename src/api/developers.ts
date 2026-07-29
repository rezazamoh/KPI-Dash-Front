import axios from 'axios';
import { DeveloperListResponse, DeveloperDetailResponse } from '@/types/developers';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL ?? '/api'),
});

export const fetchDevelopers = async (): Promise<DeveloperListResponse> => {
  const response = await api.get('/developers');
  return response.data;
};

export const fetchDeveloper = async (
  username: string,
  params: Record<string, any>
): Promise<DeveloperDetailResponse> => {
  const response = await api.get(`/developers/${encodeURIComponent(username)}`, {
    params,
  });
  return response.data;
};

export const fetchDeveloperTopics = async (
  username: string,
  repos: string[]
): Promise<string[]> => {
  const response = await api.get(`/developers/${encodeURIComponent(username)}/topics`, {
    params: { repo: repos },
  });

  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.topics)) {
    return data.topics;
  }

  return [];
};
