import { createSignal } from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import { fetchContexts, ContextEntity } from '../api/context.api';

// 全局状态
const [contexts, setContexts] = createSignal<ContextEntity[]>([]);
const [isLoading, setIsLoading] = createSignal<boolean>(false);

// 初始化加载与事件监听
let isInitialized = false;

export const useContextStore = () => {
  const loadContexts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchContexts();
      setContexts(data);
    } catch (e) {
      console.error("加载 Context 失败:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const initStore = async () => {
    if (isInitialized) return;
    isInitialized = true;
    
    await loadContexts();

    // 监听后端的 context 状态变更事件
    // payload 预期: { id: string, status: string, ...其他可能变更的字段 }
    listen<Partial<ContextEntity> & { id: string }>('context_status_changed', (event) => {
      console.log('Received context_status_changed event:', event.payload);
      setContexts(prev => prev.map(p => 
        p.id === event.payload.id ? { ...p, ...event.payload } : p
      ));
    }).catch(console.error);
  };

  return {
    contexts,
    isLoading,
    loadContexts,
    initStore,
  };
};
