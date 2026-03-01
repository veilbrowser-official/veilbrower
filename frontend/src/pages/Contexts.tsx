import { Component, For, Show, createResource, createSignal, onMount } from 'solid-js';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Box, Monitor, Fingerprint as FingerprintIcon, ShieldCheck, Play, Settings2, Trash2, Plus, X, Globe, Cpu } from 'lucide-solid';
import { useContextStore } from '../store/contextStore';
import { addContext, setContextStatus, launchBrowser, removeContext, ContextEntity } from '../api/context.api';
import { fetchProxies, ProxyEntity } from '../api/proxy.api';

const Contexts: Component = () => {
  const { t } = useTranslation();

  const contextStore = useContextStore();

  onMount(() => {
    contextStore.initStore();
  });

  // 加载系统拥有的代理节点用于绑定
  const [proxies] = createResource<ProxyEntity[]>(async () => {
    try {
      return await fetchProxies();
    } catch (e) {
      console.error("加载代理节点失败:", e);
      return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [newContextName, setNewContextName] = createSignal('');
  const [selectedOs, setSelectedOs] = createSignal('macOS');
  const [selectedProxy, setSelectedProxy] = createSignal('none');
  const [enableCanvas, setEnableCanvas] = createSignal(true);
  const [enableWebgl, setEnableWebgl] = createSignal(true);
  const [enableAudio, setEnableAudio] = createSignal(true);
  const [enableFonts, setEnableFonts] = createSignal(true);
  const [hardwareCfg, setHardwareCfg] = createSignal('8c_8g');
  const [screenRes, setScreenRes] = createSignal('1920x1080');

  const handleOpenModal = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewContextName(`Sandbox-${randomSuffix}`);
    setIsModalOpen(true);
  };

  const handleAddContext = async () => {
    if (!newContextName().trim()) return alert(t('contexts.input_name'));
    
    const browserVer = selectedOs() === 'macOS' ? "Chrome 122.0 (macOS 14.3)" : "Chrome 122.0 (Win 11)";
    const osVer = selectedOs() === 'macOS' ? "macOS 14.3.1 (M2)" : "Windows 11 (23H2)";

    const protections = [];
    if (enableCanvas()) protections.push("canvas");
    if (enableWebgl()) protections.push("webgl");
    if (enableAudio()) protections.push("audio");
    if (enableFonts()) protections.push("fonts");
    
    protections.push(`hw:${hardwareCfg()}`);
    protections.push(`screen:${screenRes()}`);

    const newId = `CTX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newContext: ContextEntity = {
      id: newId,
      name: newContextName(),
      os: osVer,
      browser: browserVer,
      proxy_id: selectedProxy() === 'none' ? null : selectedProxy(),
      protections: JSON.stringify(protections),
      status: "idle",
      last_active: null,
      created_at: null,
      updated_at: null,
    };

    try {
      await addContext(newContext);
      setIsModalOpen(false);
      contextStore.loadContexts(); 
    } catch (e) {
      console.error(e);
      alert(t('contexts.create_failed') + ": " + e);
    }
  };

  const handleLaunchBrowser = async (id: string) => {
    try {
      await setContextStatus(id, 'running');
      contextStore.loadContexts(); 
      await launchBrowser("https://bot.sannysoft.com", id);
    } catch (e) {
      console.error(e);
      alert(t('contexts.launch_failed') + ": " + e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeContext(id);
      contextStore.loadContexts();
    } catch (e) {
      console.error(e);
      alert(t('contexts.delete_failed') + ": " + e);
    }
  };

  const parseProtections = (jsonStr: string): string[] => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <MainLayout>
       <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto pb-8 relative">
          
          {/* 页头 */}
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Box class="w-6 h-6 text-primary" />
                {t('contexts.title')}
              </h2>
              <p class="text-sm text-muted-foreground mt-1 max-w-3xl break-words">
                {t('contexts.description')}
              </p>
            </div>
            <button 
              onClick={handleOpenModal}
              class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)] shrink-0">
              <Plus class="w-4 h-4" />
              {t('contexts.create')}
            </button>
          </div>

          {/* 容器卡片网格 */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            <Show when={!contextStore.isLoading() && contextStore.contexts().length === 0}>
              <div class="col-span-full py-12 text-center text-muted-foreground bg-secondary/10 rounded-xl border border-border/50 border-dashed">
                <p>{t('contexts.empty')}</p>
              </div>
            </Show>
            <For each={contextStore.contexts()}>
              {(ctx) => (
                <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/50 transition-all group flex flex-col">
                   {/* 卡片头部 */}
                   <div class="p-5 border-b border-border/50 bg-secondary/10 flex justify-between items-start">
                     <div>
                       <h3 class="font-semibold text-foreground flex items-center gap-2">
                         {ctx.name}
                       </h3>
                       <span class="text-xs font-mono text-muted-foreground mt-1 block">
                         {ctx.id}
                       </span>
                     </div>
                     <div class="flex items-center gap-1.5 shrink-0">
                       {ctx.status === 'running' && (
                         <span class="flex h-2 w-2 relative">
                           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </span>
                       )}
                       <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                         {t(`common.status.${ctx.status}`) || ctx.status}
                       </span>
                     </div>
                   </div>

                   {/* 卡片内容—环境详情 */}
                   <div class="p-5 space-y-4 flex-1">
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-foreground flex items-center gap-2">
                          <Monitor class="w-4 h-4" /> {t('sessions.table.os')}
                        </span>
                        <span class="font-medium text-foreground">{ctx.os.split(' ')[0]}</span>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-foreground flex items-center gap-2">
                          <Globe class="w-4 h-4" /> 网络 / IP
                        </span>
                        <span class="font-medium text-foreground text-xs font-mono px-2 py-0.5 bg-secondary rounded border border-border/50">
                          {ctx.proxy_id === 'none' || !ctx.proxy_id ? t('contexts.no_proxy') : ctx.proxy_id}
                        </span>
                      </div>
                      
                      {/* 指纹防护徽章 */}
                      <div class="mt-6">
                        <p class="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ShieldCheck class="w-3.5 h-3.5" /> {t('contexts.fingerprint_status')}
                        </p>
                        <div class="flex flex-wrap gap-1.5">
                           <For each={parseProtections(ctx.protections)}>
                             {(prot) => (
                               <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wide">
                                 <FingerprintIcon class="w-3 h-3" />
                                 {t(`sessions.features.${prot}`) || prot}
                               </span>
                             )}
                           </For>
                           <Show when={parseProtections(ctx.protections).length === 0}>
                              <span class="text-xs text-muted-foreground italic">{t('contexts.no_protection')}</span>
                           </Show>
                        </div>
                      </div>
                   </div>

                   {/* 卡片底部—操作 */}
                   <div class="p-4 border-t border-border/50 bg-secondary/5 flex items-center justify-between mt-auto">
                      <div class="text-xs text-muted-foreground/70">
                        {ctx.last_active ? new Date(ctx.last_active).toLocaleString() : t('common.never')}
                      </div>
                      <div class="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {ctx.status === 'idle' && (
                          <button onClick={() => handleLaunchBrowser(ctx.id)} class="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors" title={t('contexts.actions.launch')}>
                            <Play class="w-4 h-4" />
                          </button>
                        )}
                        <button class="p-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-colors" title={t('contexts.actions.settings')}>
                          <Settings2 class="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(ctx.id)} class="p-2 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors" title={t('contexts.actions.destroy')}>
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
              )}
            </For>
          </div>
       </div>

       {/* 创建沙盒弹窗 */}
       <Show when={isModalOpen()}>
         <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/10 shrink-0">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(114,46,209,0.3)]">
                    <Box class="w-4 h-4" />
                  </div>
                  <h3 class="font-bold text-foreground tracking-tight text-lg">{t('contexts.modal.title')}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} class="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X class="w-5 h-5" />
                </button>
              </div>

              <div class="p-6 overflow-y-auto space-y-6">
                 {/* 基本信息 */}
                 <div class="space-y-3">
                   <label class="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">{t('contexts.modal.base_info')}</label>
                   <input type="text" value={newContextName()} onInput={e => setNewContextName(e.target.value)} placeholder={t('contexts.modal.name_placeholder')} class="w-full bg-secondary/30 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50" />
                 </div>

                 {/* 指纹骨架 */}
                 <div class="space-y-3">
                   <label class="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">{t('contexts.modal.fingerprint_skeleton')}</label>
                   <div class="grid grid-cols-2 gap-3">
                     <button 
                       onClick={() => setSelectedOs('macOS')}
                       class={`flex flex-col items-start p-3 border rounded-lg transition-all ${selectedOs() === 'macOS' ? 'bg-primary/10 border-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' : 'bg-secondary/20 border-border hover:border-primary/50 hover:bg-secondary'}`}
                     >
                       <span class="font-semibold text-sm text-foreground mb-1">Apple Silicon (macOS)</span>
                       <span class="text-xs text-muted-foreground">Chrome M122 (aarch64)</span>
                     </button>
                     <button 
                       onClick={() => setSelectedOs('Windows')}
                       class={`flex flex-col items-start p-3 border rounded-lg transition-all ${selectedOs() === 'Windows' ? 'bg-primary/10 border-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' : 'bg-secondary/20 border-border hover:border-primary/50 hover:bg-secondary'}`}
                     >
                       <span class="font-semibold text-sm text-foreground mb-1">Windows 11 (23H2)</span>
                       <span class="text-xs text-muted-foreground">Chrome M122 (x86_64)</span>
                     </button>
                   </div>
                 </div>

                 {/* 网络绑定 */}
                 <div class="space-y-3">
                   <label class="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">{t('contexts.modal.network_binding')}</label>
                   <div class="relative">
                     <Globe class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     <select 
                       value={selectedProxy()} 
                       onChange={e => setSelectedProxy(e.target.value)}
                       class="w-full appearance-none bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-10 pr-4 py-3 text-sm text-foreground outline-none transition-all cursor-pointer font-medium"
                     >
                        <option value="none">{t('contexts.modal.direct_connect')}</option>
                        <For each={proxies()}>
                          {(px) => <option value={px.id}>{px.alias} ({px.address}) [{px.protocol}]</option>}
                        </For>
                     </select>
                   </div>
                   <p class="text-[10px] text-muted-foreground pl-1.5 flex items-center gap-1.5">
                     <ShieldCheck class="w-3 h-3 text-emerald-500" /> {t('contexts.modal.network_hint')}
                   </p>
                 </div>

                 {/* 硬件环境仿真 */}
                 <div class="space-y-3">
                   <label class="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">{t('contexts.modal.hardware_emulation')}</label>
                   <div class="grid grid-cols-2 gap-3">
                     <select 
                       value={hardwareCfg()} 
                       onChange={e => setHardwareCfg(e.target.value)}
                       class="w-full appearance-none bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition-all cursor-pointer font-medium"
                     >
                       <option value="4c_8g">4 Cores / 8GB RAM</option>
                       <option value="8c_8g">8 Cores / 8GB RAM</option>
                       <option value="8c_16g">8 Cores / 16GB RAM</option>
                       <option value="16c_32g">16 Cores / 32GB RAM</option>
                     </select>
                     <select 
                       value={screenRes()} 
                       onChange={e => setScreenRes(e.target.value)}
                       class="w-full appearance-none bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition-all cursor-pointer font-medium"
                     >
                       <option value="1920x1080">1920 x 1080 (FHD)</option>
                       <option value="2560x1440">2560 x 1440 (2K)</option>
                       <option value="2560x1600">2560 x 1600 (Mac 13")</option>
                       <option value="1366x768">1366 x 768 (Laptop)</option>
                     </select>
                   </div>
                 </div>

                 {/* 硬件噪声洗牌 */}
                 <div class="space-y-3">
                   <label class="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                      <Cpu class="w-4 h-4" /> {t('contexts.modal.noise_injection')}
                   </label>
                   <div class="bg-card border border-border rounded-lg divide-y divide-border/50">
                      
                      <div class="flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors">
                        <div>
                          <h4 class="text-sm font-medium text-foreground">{t('contexts.modal.canvas.title')}</h4>
                          <p class="text-[10px] text-muted-foreground mt-0.5">{t('contexts.modal.canvas.desc')}</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" class="sr-only peer" checked={enableCanvas()} onChange={(e) => setEnableCanvas(e.target.checked)} />
                          <div class="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div class="flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors">
                        <div>
                          <h4 class="text-sm font-medium text-foreground">{t('contexts.modal.webgl.title')}</h4>
                          <p class="text-[10px] text-muted-foreground mt-0.5">{t('contexts.modal.webgl.desc')}</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" class="sr-only peer" checked={enableWebgl()} onChange={(e) => setEnableWebgl(e.target.checked)} />
                          <div class="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div class="flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors">
                        <div>
                          <h4 class="text-sm font-medium text-foreground">{t('contexts.modal.audio.title')}</h4>
                          <p class="text-[10px] text-muted-foreground mt-0.5">{t('contexts.modal.audio.desc')}</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" class="sr-only peer" checked={enableAudio()} onChange={(e) => setEnableAudio(e.target.checked)} />
                          <div class="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      <div class="flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors">
                        <div>
                          <h4 class="text-sm font-medium text-foreground">{t('contexts.modal.fonts.title')}</h4>
                          <p class="text-[10px] text-muted-foreground mt-0.5">{t('contexts.modal.fonts.desc')}</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" class="sr-only peer" checked={enableFonts()} onChange={(e) => setEnableFonts(e.target.checked)} />
                          <div class="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                   </div>
                 </div>

              </div>

              <div class="px-6 py-4 border-t border-border/50 bg-secondary/10 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  class="px-5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-colors focus:outline-none">
                  {t('contexts.modal.cancel')}
                </button>
                <button 
                  onClick={handleAddContext} 
                  class="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/30 flex items-center gap-2 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                  <FingerprintIcon class="w-4 h-4 ml-0.5" />
                  {t('contexts.modal.submit')}
                </button>
              </div>

            </div>
         </div>
       </Show>

    </MainLayout>
  );
};

export default Contexts;
