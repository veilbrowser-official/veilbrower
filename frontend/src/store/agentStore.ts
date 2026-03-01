import { createSignal } from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import i18next from 'i18next';

export interface Message {
  id: string; // 本地生成的 ID
  role: 'user' | 'agent' | 'card';
  content: string;
  thought?: string;
  cardData?: {
    missionId: string;
    skill: string;
    context: string;
    proxy: string;
    status: string;
  };
}

// 初始欢迎消息
const [messages, setMessages] = createSignal<Message[]>([{
  id: 'sys-0',
  role: 'agent',
  content: "欢迎来到 VeilBrowser Agent 工作空间。我可以为您编排浏览器自动化与数据采集任务。您想做些什么？"
}]);
const [isProcessing, setIsProcessing] = createSignal(false);
const [latestFrame, setLatestFrame] = createSignal<string | null>(null);
const [activeMissionId, setActiveMissionId] = createSignal<string | null>(null);

let isInitialized = false;

export const useAgentStore = () => {

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }]);
  };

  const updateLastAgentMessage = (updates: Partial<Message>) => {
    setMessages(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].role === 'agent') {
          arr[i] = { ...arr[i], ...updates };
          return arr;
        }
      }
      return arr;
    });
  };

  const initStore = async () => {
    if (isInitialized) return;
    isInitialized = true;

    // 监听后端的文本流输出
    // Payload 预期: { chunk: string, type: 'content' | 'thought' | 'card', ...cardData }
    listen<any>('agent_stream_chunk', (event) => {
      const payload = event.payload;
      
      if (payload.type === 'start') {
        setIsProcessing(true);
        addMessage({ role: 'agent', content: '', thought: '' });
      } else if (payload.type === 'content') {
        setMessages(prev => {
          const arr = [...prev];
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].role === 'agent') {
              arr[i] = { ...arr[i], content: (arr[i].content || '') + payload.chunk };
              break;
            }
          }
          return arr;
        });
      } else if (payload.type === 'thought') {
        setMessages(prev => {
          const arr = [...prev];
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].role === 'agent') {
              arr[i] = { ...arr[i], thought: (arr[i].thought || '') + payload.chunk };
              break;
            }
          }
          return arr;
        });
      } else if (payload.type === 'card') {
         // 收到任务卡片时，记录 activeMissionId
         if (payload.cardData?.missionId) {
           setActiveMissionId(payload.cardData.missionId);
         }

         setMessages(prev => {
            const arr = [...prev];
            const existingIdx = arr.findIndex(m => m.role === 'card' && m.cardData?.missionId === payload.cardData?.missionId);
            if (existingIdx !== -1) {
              arr[existingIdx] = { ...arr[existingIdx], cardData: payload.cardData };
              return arr;
            } else {
              return [...arr, {
                 id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                 role: 'card',
                 content: payload.content || i18next.t('dashboard.mission_assigned'),
                 cardData: payload.cardData
              }];
            }
         });
      } else if (payload.type === 'end') {
        setIsProcessing(false);
      }
    }).catch(console.error);

    // 监听后端的实时 CDP 视频帧
    listen<any>('screencast-frame', (event) => {
      const { data } = event.payload;
      if (data) {
        setLatestFrame(`data:image/jpeg;base64,${data}`);
      }
    }).catch(console.error);
  };

  return {
    messages,
    addMessage,
    updateLastAgentMessage,
    isProcessing,
    setIsProcessing,
    activeMissionId,
    setActiveMissionId,
    latestFrame,
    initStore,
  };
};
