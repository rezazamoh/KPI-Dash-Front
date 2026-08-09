const LIVE_DEFAULT_STORAGE_KEY = 'dashboard.live-default';

export const getDefaultLiveValue = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  const storedValue = window.localStorage.getItem(LIVE_DEFAULT_STORAGE_KEY);
  if (storedValue === null) {
    return true;
  }

  return storedValue === 'true';
};

export const setDefaultLiveValue = (value: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LIVE_DEFAULT_STORAGE_KEY, String(value));
};
