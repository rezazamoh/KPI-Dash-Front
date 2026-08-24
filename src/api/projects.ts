import { ProjectListResponse, ProjectDetailResponse } from '@/types/projects';
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

export const fetchProjects = async (live = false): Promise<ProjectListResponse> => {
  const response = await apiClient.get('gerrit/projects', { params: { live } });
  return response.data;
};

export const fetchProject = async (
  project: string,
  params: Record<string, any>
): Promise<ProjectDetailResponse> => {
  const queryString = buildQueryString(params);

  const response = await apiClient.get(
    `gerrit/projects/${encodeURIComponent(project)}${queryString}`
  );

  return response.data;
};