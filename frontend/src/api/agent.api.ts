import { invoke } from '@tauri-apps/api/core';

export const startSession = (missionId: string, skillId: string): Promise<string> => {
  return invoke('start_session', { missionId, skillId });
};

// 预留的真实发消息接口
export const sendAgentMessage = (message: string, missionId?: string): Promise<any> => {
  return invoke('send_agent_message', { message, missionId: missionId || null });
};
