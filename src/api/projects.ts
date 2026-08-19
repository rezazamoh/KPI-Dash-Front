import { ProjectListResponse, ProjectDetailResponse } from '@/types/projects';
import { apiClient } from './client';

export const fetchProjects = async (): Promise<ProjectListResponse> => {
  const response = await apiClient.get('gerrit/projects');
  return response.data;
};

export const fetchProject = async (
  project: string,
  params: Record<string, any>
): Promise<ProjectDetailResponse> => {
  const response = await apiClient.get(
    `gerrit/projects/${encodeURIComponent(project)}`,
    { params }
  );

  return response.data;
};