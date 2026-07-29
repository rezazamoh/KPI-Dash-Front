import axios from 'axios';
import { ProjectListResponse, ProjectDetailResponse } from '@/types/projects';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL ?? '/api'),
});

export const fetchProjects = async (): Promise<ProjectListResponse> => {
  const response = await api.get('/projects');
  return response.data;
};

export const fetchProject = async (
  project: string,
  params: Record<string, any>
): Promise<ProjectDetailResponse> => {
  const response = await api.get(`/projects/${encodeURIComponent(project)}`, {
    params,
  });
  return response.data;
};

export const fetchProjectDevelopers = async (project: string): Promise<string[]> => {
  const response = await api.get(`/projects/${encodeURIComponent(project)}/developers`);
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.developers)) {
    return data.developers;
  }

  return [];
};

export const fetchProjectTopics = async (
  project: string,
  developers: string[]
): Promise<string[]> => {
  const response = await api.get(`/projects/${encodeURIComponent(project)}/topics`, {
    params: { username: developers },
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
