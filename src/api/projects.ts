import axios from 'axios';
import { ProjectListResponse, ProjectDetailResponse } from '@/types/projects';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL ?? '/api'),
});

export const fetchProjects = async (): Promise<ProjectListResponse> => {
  const response = await api.get('gerrit/projects');
  return response.data;
};

export const fetchProject = async (
  project: string,
  params: Record<string, any>
): Promise<ProjectDetailResponse> => {
  const response = await api.get(`gerrit/projects/${encodeURIComponent(project)}`, {
    params,
  });
  return response.data;
};
