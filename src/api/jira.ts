import axios from 'axios';
import {
  JiraBoardsResponse,
  JiraIssueResponse,
  JiraPerformanceResponse,
  JiraProjectsResponse,
} from '@/types/jira';
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

export const fetchJiraProjects = async (): Promise<JiraProjectsResponse> => {
  const response = await apiClient.get('/jira/projects');
  return response.data;
};

export const fetchJiraBoards = async (projectKey: string): Promise<JiraBoardsResponse> => {
  const response = await apiClient.get(`/jira/projects/${encodeURIComponent(projectKey)}/boards`);
  return response.data;
};

export const fetchJiraPerformance = async (
  projectKey: string,
  boards: number[]
): Promise<JiraPerformanceResponse> => {
  const queryString = buildQueryString({ boards: boards.length ? boards.map(String) : undefined });
  const response = await apiClient.get(`/jira/projects/${encodeURIComponent(projectKey)}/performance${queryString}`);
  return response.data;
};

export const fetchJiraIssue = async (issueKey: string): Promise<JiraIssueResponse> => {
  const response = await apiClient.get(`/jira/issues/${encodeURIComponent(issueKey)}`);
  return response.data;
};