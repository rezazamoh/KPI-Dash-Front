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
