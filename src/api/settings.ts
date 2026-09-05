import { apiClient } from './client';

export interface DurationWindow {
  min: number | null;
  max: number | null;
}

export interface SettingsResponse {
  use_duration_windows: boolean;
  duration_windows: DurationWindow[];
}

export interface SettingsUpdate {
  use_duration_windows: boolean;
  duration_windows: DurationWindow[];
}

export const fetchSettings = async (): Promise<SettingsResponse> => {
  const response = await apiClient.get<SettingsResponse>('/settings');
  return response.data;
};

export const updateSettings = async (
  settings: SettingsUpdate,
): Promise<SettingsResponse> => {
  const response = await apiClient.patch<SettingsResponse>('/settings', settings);
  return response.data;
};
