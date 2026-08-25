import { ProjectListResponse, ProjectDetailResponse } from '@/types/projects';
import { apiClient } from './client';
import {
  buildQueryString,
  Period,
} from './queryParams';

export const fetchProjects = async (
  live = false,
): Promise<ProjectListResponse> => {
  const response = await apiClient.get('gerrit/projects', {
    params: { live },
  });

  return response.data;
};

export const fetchProject = async (
  project: string,
  params: Record<string, unknown>,
): Promise<ProjectDetailResponse> => {
  const queryString = buildQueryString({
    username: params.username,
    topic: params.topic,
    periods: params.periods,
    live: params.live,
  });

  const response = await apiClient.get(
    `/gerrit/projects/${encodeURIComponent(project)}${queryString}`,
  );

  return response.data;
};