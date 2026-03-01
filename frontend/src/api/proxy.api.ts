import { invoke } from '@tauri-apps/api/core';

export interface ProxyEntity {
  id: string;
  alias: string;
  protocol: string;
  address: string;
}

export const fetchProxies = (): Promise<ProxyEntity[]> => {
  return invoke('fetch_proxies');
};
