import { createStore } from 'solid-js/store';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  general: {
    language: string;
  };
  llm: {
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    cachedModels: Record<string, string[]>; // 按供应商缓存获取到的模型
  };
  agent: {
    maxConcurrency: string;
    humanizedDelay: string;
    autoHealing: boolean;
  };
  advanced: {
    hybridHeadless: boolean;
    disableWebrtc: boolean;
  };
  isLoaded: boolean;
}

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  poe: ['Claude-3.5-Sonnet', 'GPT-4o', 'Gemini-1.5-Pro', 'DeepSeek-V3'],
  openrouter: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'meta-llama/llama-3.1-405b-instruct'],
  groq: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  ollama: ['llama3.1', 'gemma2', 'qwen2.5'],
  aliyun: ['qwen3-coder-plus', 'qwen3.5-plus', 'qwen3-coder-next'],
  custom: []
};

const [settings, setSettings] = createStore<SettingsState>({
  general: {
    language: 'zh'
  },
  llm: {
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    model: '',
    systemPrompt: '',
    cachedModels: { ...DEFAULT_MODELS }
  },
  agent: {
    maxConcurrency: '10',
    humanizedDelay: '800',
    autoHealing: true
  },
  advanced: {
    hybridHeadless: true,
    disableWebrtc: false
  },
  isLoaded: false
});

export const useSettingsStore = () => {
  const loadSettings = async () => {
    if (settings.isLoaded) return;

    try {
      const load = async (key: string) => {
        return await invoke<string | null>('get_global_setting', { key });
      };

      const [
        lang, provider, baseUrl, apiKey, model, prompt,
        concurrency, delay, healing, headless, webrtc
      ] = await Promise.all([
        load('general.language'),
        load('llm.provider'),
        load('llm.baseUrl'),
        load('llm.apiKey'),
        load('llm.model'),
        load('llm.systemPrompt'),
        load('agent.maxConcurrency'),
        load('agent.humanizedDelay'),
        load('agent.autoHealing'),
        load('advanced.hybridHeadless'),
        load('advanced.disableWebrtc'),
      ]);

      setSettings({
        general: { language: lang || 'zh' },
        llm: {
          provider: provider || 'openai',
          baseUrl: baseUrl || '',
          apiKey: apiKey || '',
          model: model || '',
          systemPrompt: prompt || '',
          cachedModels: { ...DEFAULT_MODELS }
        },
        agent: {
          maxConcurrency: concurrency || '10',
          humanizedDelay: delay || '800',
          autoHealing: healing === 'true'
        },
        advanced: {
          hybridHeadless: headless === 'true',
          disableWebrtc: webrtc === 'true'
        },
        isLoaded: true
      });
    } catch (e) {
      console.error("Failed to load settings from backend:", e);
    }
  };

  const updateSetting = async (section: keyof Omit<SettingsState, 'isLoaded'>, key: string, value: any) => {
    // @ts-ignore
    setSettings(section, { [key]: value });
    try {
      await invoke('set_global_setting', { key: `${section}.${key}`, value: String(value) });
    } catch (e) {
      console.error(`Failed to save setting ${section}.${key}:`, e);
    }
  };

  const setCachedModels = (provider: string, models: string[]) => {
    setSettings('llm', 'cachedModels', { [provider]: models });
  };

  const fetchModels = async () => {
    const { baseUrl, apiKey, provider } = settings.llm;
    if (!baseUrl || !apiKey) throw new Error("Missing credentials");

    const models: string[] = await invoke('fetch_llm_models', { baseUrl, apiKey });
    if (models && models.length > 0) {
      const staticModels = DEFAULT_MODELS[provider] || [];
      const merged = Array.from(new Set([...staticModels, ...models]));
      setCachedModels(provider, merged);
      return merged;
    }
    return DEFAULT_MODELS[provider] || [];
  };

  return {
    settings,
    loadSettings,
    updateSetting,
    fetchModels,
    setSettings // 允许批量更新
  };
};
