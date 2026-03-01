import { Component, createSignal, onMount, Show, For } from 'solid-js';
import MainLayout from '../layouts/MainLayout';
import { Settings as SettingsIcon, Cpu, Brain, Save, CheckCircle2, Shield, RefreshCw, Layout as LayoutIcon, Zap, ChevronDown } from 'lucide-solid';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { useSettingsStore } from '../store/settingsStore';

const Settings: Component = () => {
  const { t, i18n } = useTranslation();
  const { settings, loadSettings, updateSetting, fetchModels, setSettings } = useSettingsStore();
  
  const [activeTab, setActiveTab] = createSignal<'general' | 'llm' | 'agent' | 'advanced'>('general');
  const [saved, setSaved] = createSignal(false);
  const [isFetchingModels, setIsFetchingModels] = createSignal(false);
  const [showModelDropdown, setShowModelDropdown] = createSignal(false);

  onMount(() => {
    loadSettings();
  });

  const handleSaveAll = async () => {
    // 这里的 save 已经在 updateSetting 中实时处理了，
    // 但为了给用户“保存成功”的心理反馈，我们保留这个按钮
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    updateSetting('general', 'language', lng);
  };

  const DEFAULT_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    deepseek: 'https://api.deepseek.com/v1',
    poe: 'https://api.poe.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1',
    ollama: 'http://localhost:11434/v1',
    aliyun: 'https://coding.dashscope.aliyuncs.com/v1'
  };

  const handleProviderChange = (newProvider: string) => {
    const currentUrl = settings.llm.baseUrl;
    const isKnownDefault = Object.values(DEFAULT_URLS).includes(currentUrl) || currentUrl === '';
    
    setSettings('llm', {
      provider: newProvider,
      baseUrl: isKnownDefault && DEFAULT_URLS[newProvider] ? DEFAULT_URLS[newProvider] : currentUrl
    });
    
    // 自动保存
    updateSetting('llm', 'provider', newProvider);
    if (isKnownDefault) updateSetting('llm', 'baseUrl', settings.llm.baseUrl);
  };

  const onFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      await fetchModels();
      setShowModelDropdown(true);
    } catch (e) {
      alert(t('settings.llm.fetch_error') + String(e));
    } finally {
      setIsFetchingModels(false);
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto pb-8">
        
        {/* 页头 */}
        <div class="flex items-center justify-between pb-4 border-b border-border/50">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <SettingsIcon class="w-6 h-6 text-primary" />
              {t('settings.title')}
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {t('settings.description')}
            </p>
          </div>
          
          <button 
            onClick={handleSaveAll}
            class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(114,46,209,0.3)]"
          >
            {saved() ? <CheckCircle2 class="w-4 h-4" /> : <Save class="w-4 h-4" />}
            {saved() ? t('settings.saved') : t('settings.save')}
          </button>
        </div>

        <div class="flex gap-8 items-start">
          {/* 侧边导航 */}
          <div class="w-48 shrink-0 flex flex-col gap-1 border-r border-border/30 pr-4 min-h-[400px]">
            <button 
              onClick={() => setActiveTab('general')}
              class={cn("flex items-center gap-2 w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium", activeTab() === 'general' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
            >
              <LayoutIcon class="w-4 h-4" /> {t('settings.tabs.general')}
            </button>
            <button 
              onClick={() => setActiveTab('llm')}
              class={cn("flex items-center gap-2 w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium", activeTab() === 'llm' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
            >
              <Brain class="w-4 h-4" /> {t('settings.tabs.llm')}
            </button>
            <button 
              onClick={() => setActiveTab('agent')}
              class={cn("flex items-center gap-2 w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium", activeTab() === 'agent' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
            >
              <Cpu class="w-4 h-4" /> {t('settings.tabs.agent')}
            </button>
            <button 
              onClick={() => setActiveTab('advanced')}
              class={cn("flex items-center gap-2 w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium", activeTab() === 'advanced' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
            >
              <Shield class="w-4 h-4" /> {t('settings.tabs.advanced')}
            </button>
          </div>

          {/* 内容面板 */}
          <div class="flex-1 bg-card border border-border/50 rounded-xl p-8 shadow-sm">
            
            {/* 常规设置 */}
            <Show when={activeTab() === 'general'}>
              <div class="space-y-6 animate-in fade-in duration-300">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold text-foreground">{t('settings.general.title')}</h3>
                  <p class="text-xs text-muted-foreground">{t('settings.general.desc')}</p>
                </div>
                
                <div class="space-y-4 pt-4">
                  <div class="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                    <div>
                      <h4 class="text-sm font-medium text-foreground">{t('settings.general.language')}</h4>
                      <p class="text-[10px] text-muted-foreground">{t('settings.general.language_hint')}</p>
                    </div>
                    <select 
                      value={settings.general.language} 
                      onChange={(e) => handleLanguageChange(e.currentTarget.value)}
                      class="bg-secondary/30 border border-border/60 focus:border-primary rounded-lg px-3 py-1.5 text-sm text-foreground outline-none cursor-pointer"
                    >
                      <option value="zh">简体中文 (Chinese)</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Show>

            {/* LLM 配置 */}
            <Show when={activeTab() === 'llm'}>
              <div class="space-y-6 animate-in fade-in duration-300">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold text-foreground">{t('settings.llm.title')}</h3>
                  <p class="text-xs text-muted-foreground">{t('settings.llm.desc')}</p>
                </div>
                
                <div class="grid gap-5 pt-4">
                  <div class="space-y-2">
                    <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('settings.llm.provider')}</label>
                    <div class="relative">
                      <select 
                        value={settings.llm.provider} 
                        onChange={(e) => handleProviderChange(e.currentTarget.value)}
                        class="w-full appearance-none bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition-all cursor-pointer font-medium"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="poe">Poe API</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="groq">Groq</option>
                        <option value="ollama">Ollama</option>
                        <option value="aliyun">Aliyun (Qwen)</option>
                        <option value="custom">Custom</option>
                      </select>
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                        <ChevronDown class="w-4 h-4 opacity-70" />
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('settings.llm.base_url')}</label>
                    <input 
                      type="text" 
                      value={settings.llm.baseUrl} 
                      onInput={(e) => updateSetting('llm', 'baseUrl', e.currentTarget.value)} 
                      placeholder="https://..." 
                      class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none font-mono transition-all" 
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>{t('settings.llm.api_key')}</span>
                      <span class="text-[10px] text-emerald-500 font-normal">{t('settings.llm.api_key_hint')}</span>
                    </label>
                    <input 
                      type="password" 
                      value={settings.llm.apiKey} 
                      onInput={(e) => updateSetting('llm', 'apiKey', e.currentTarget.value)} 
                      placeholder="sk-..." 
                      class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none font-mono transition-all" 
                    />
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('settings.llm.model_name')}</label>
                      <button 
                        onClick={onFetchModels} 
                        disabled={isFetchingModels()}
                        class="text-[10px] flex items-center gap-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw class={cn("w-3 h-3", isFetchingModels() && "animate-spin")} />
                        {isFetchingModels() ? t('settings.llm.fetching').toUpperCase() : t('settings.llm.fetch_models').toUpperCase()}
                      </button>
                    </div>
                    <div class="relative flex items-center">
                      <input 
                        type="text" 
                        value={settings.llm.model} 
                        onInput={(e) => {
                          updateSetting('llm', 'model', e.currentTarget.value);
                          setShowModelDropdown(true);
                        }}
                        onFocus={() => setShowModelDropdown(true)}
                        onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                        placeholder="e.g. gpt-4o" 
                        class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 pr-10 text-sm text-foreground outline-none font-mono transition-all" 
                      />
                      <div class="absolute inset-y-0 right-0 flex items-center">
                        <button 
                          onClick={() => setShowModelDropdown(!showModelDropdown())}
                          class="px-3 h-full flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <ChevronDown class="w-4 h-4 opacity-70" />
                        </button>
                      </div>
                      
                      {showModelDropdown() && (settings.llm.cachedModels[settings.llm.provider]?.length || 0) > 0 && (
                        <ul class="absolute z-50 top-full mt-1 left-0 w-full max-h-64 overflow-y-auto bg-card border border-border/50 rounded-lg shadow-2xl shadow-black/40 p-1 animate-in fade-in slide-in-from-top-2 duration-150">
                          <For each={settings.llm.cachedModels[settings.llm.provider].filter(m => settings.llm.model === '' || m.toLowerCase().includes(settings.llm.model.toLowerCase()))}>
                            {(m) => (
                              <li 
                                onClick={() => {
                                  updateSetting('llm', 'model', m);
                                  setShowModelDropdown(false);
                                }}
                                class="px-3 py-2 shrink-0 text-sm font-mono text-foreground hover:bg-primary/20 hover:text-primary cursor-pointer rounded-md transition-colors break-all"
                              >
                                {m}
                              </li>
                            )}
                          </For>
                        </ul>
                      )}
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('settings.llm.prompt')}</label>
                    <textarea 
                      rows="4" 
                      value={settings.llm.systemPrompt} 
                      onInput={(e) => updateSetting('llm', 'systemPrompt', e.currentTarget.value)} 
                      placeholder="You are a genius browser automation agent..." 
                      class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </Show>

            {/* Agent 配置 */}
            <Show when={activeTab() === 'agent'}>
              <div class="space-y-6 animate-in fade-in duration-300">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold text-foreground">{t('settings.agent.title')}</h3>
                  <p class="text-xs text-muted-foreground">{t('settings.agent.desc')}</p>
                </div>
                
                <div class="grid gap-6 pt-4">
                  <div class="space-y-3">
                    <div class="flex justify-between items-center">
                      <label class="text-sm font-medium text-foreground">{t('settings.agent.concurrency')}</label>
                      <span class="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{settings.agent.maxConcurrency}</span>
                    </div>
                    <input 
                      type="range" min="1" max="50" 
                      value={settings.agent.maxConcurrency} 
                      onInput={(e) => updateSetting('agent', 'maxConcurrency', e.currentTarget.value)} 
                      class="w-full accent-primary" 
                    />
                    <p class="text-[10px] text-muted-foreground">{t('settings.agent.concurrency_hint')}</p>
                  </div>

                  <div class="space-y-3">
                    <div class="flex justify-between items-center">
                      <label class="text-sm font-medium text-foreground">{t('settings.agent.delay')}</label>
                      <span class="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{settings.agent.humanizedDelay} ms</span>
                    </div>
                    <input 
                      type="range" min="100" max="3000" step="100" 
                      value={settings.agent.humanizedDelay} 
                      onInput={(e) => updateSetting('agent', 'humanizedDelay', e.currentTarget.value)} 
                      class="w-full accent-primary" 
                    />
                    <p class="text-[10px] text-muted-foreground">{t('settings.agent.delay_hint')}</p>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                    <div>
                      <h4 class="text-sm font-medium text-foreground">{t('settings.agent.healing')}</h4>
                      <p class="text-[10px] text-muted-foreground">{t('settings.agent.healing_hint')}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" class="sr-only peer" 
                        checked={settings.agent.autoHealing} 
                        onChange={(e) => updateSetting('agent', 'autoHealing', e.currentTarget.checked)} 
                      />
                      <div class="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </Show>

            {/* 安全与内核 */}
            <Show when={activeTab() === 'advanced'}>
              <div class="space-y-6 animate-in fade-in duration-300">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold text-foreground">{t('settings.advanced.title')}</h3>
                </div>
                <div class="p-4 border border-destructive/30 bg-destructive/10 rounded-lg flex gap-3 text-sm text-destructive mt-4">
                  <Zap class="w-5 h-5 shrink-0" />
                  <div>
                    <strong class="block mb-1">{t('settings.advanced.danger')}</strong>
                    <p class="opacity-80">{t('settings.advanced.danger_desc')}</p>
                  </div>
                </div>
                
                <div class="space-y-4 pt-4">
                  <div class="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                    <div>
                      <h4 class="text-sm font-medium text-foreground">{t('settings.advanced.hybrid')}</h4>
                      <p class="text-[10px] text-muted-foreground">{t('settings.advanced.hybrid_hint')}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" class="sr-only peer" 
                        checked={settings.advanced.hybridHeadless} 
                        onChange={(e) => updateSetting('advanced', 'hybridHeadless', e.currentTarget.checked)} 
                      />
                      <div class="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                    <div>
                      <h4 class="text-sm font-medium text-foreground">{t('settings.advanced.webrtc')}</h4>
                      <p class="text-[10px] text-muted-foreground">{t('settings.advanced.webrtc_hint')}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" class="sr-only peer" 
                        checked={settings.advanced.disableWebrtc} 
                        onChange={(e) => updateSetting('advanced', 'disableWebrtc', e.currentTarget.checked)} 
                      />
                      <div class="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destructive"></div>
                    </label>
                  </div>
                </div>
              </div>
            </Show>

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
