import { invoke } from '@tauri-apps/api/core';

export interface ContextEntity {
  id: string;
  name: string;
  os: string;
  browser: string;
  proxy_id: string | null;
  protections: string;
  status: string;
  last_active: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const fetchContexts = (): Promise<ContextEntity[]> => {
  return invoke('fetch_contexts');
};

export const addContext = (context: ContextEntity): Promise<void> => {
  return invoke('add_context', { context });
};

export const setContextStatus = (id: string, status: string): Promise<void> => {
  return invoke('set_context_status', { id, status });
};

export const launchBrowser = (url: string, contextId: string): Promise<void> => {
  return invoke('launch_browser', { url, contextId });
};

export const removeContext = (id: string): Promise<void> => {
  return invoke('remove_context', { id });
};
