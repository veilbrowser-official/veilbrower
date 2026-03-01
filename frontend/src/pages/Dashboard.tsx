import { Component, createSignal, For, onMount, Show } from 'solid-js';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Bot, User, Send, ExternalLink, Zap, TerminalSquare, Loader2, Monitor } from 'lucide-solid';
import { cn } from '../lib/utils';
import { useAgentStore } from '../store/agentStore';
import { sendAgentMessage } from '../api/agent.api';

const Dashboard: Component = () => {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = createSignal('');
  
  const store = useAgentStore();
  
  onMount(() => {
    store.initStore();
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const txt = inputVal().trim();
    if (!txt) return;

    store.addMessage({ role: 'user', content: txt });
    setInputVal('');
    store.setIsProcessing(true);

    try {
      await sendAgentMessage(txt, store.activeMissionId() || undefined);

      // 关键修复：不再手动调用 startSession。
      // 后端的 send_agent_message 已经根据意图路由自动处理了“新开会话”或“接管活跃会话”。
      // 这里的 payload 仅用于前端 UI 状态反馈。

    } catch (err: any) {
      store.addMessage({ 
        role: 'agent', 
        content: `Error: Failed to connect to Agent OS. Reason: ${err}` 
      });
      store.setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
       <div class="h-full flex flex-col xl:flex-row gap-6 animate-in fade-in zoom-in-95 duration-500 pb-4 max-w-[1600px] mx-auto overflow-y-auto xl:overflow-hidden">
          
          {/* 聊天区域 (左侧) */}
          <div class="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px] min-w-0 xl:min-w-[600px]">
             {/* 头部 */}
             <div class="px-6 py-4 border-b border-border/50 bg-secondary/10 shrink-0 flex items-center justify-between">
               <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                   <Bot class="w-4 h-4" />
                 </div>
                 <div>
                   <h2 class="font-semibold text-foreground tracking-tight">{t('dashboard.title')}</h2>
                   <span class="text-xs text-muted-foreground">{t('dashboard.ephemeral_mode')}</span>
                 </div>
               </div>
               <span class="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wide">
                 <Zap class="w-3 h-3" /> {t('dashboard.system_ready')}
               </span>
             </div>

             {/* 聊天消息流 */}
             <div class="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                <For each={store.messages()}>
                  {(msg) => (
                    <div class={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                       <div class={cn(
                         "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1",
                         msg.role === 'user' ? "bg-secondary text-muted-foreground border-border" : "bg-primary text-primary-foreground border-primary/80 shadow-[0_0_10px_rgba(114,46,209,0.5)]"
                       )}>
                         {msg.role === 'user' ? <User class="w-4 h-4" /> : <Bot class="w-4 h-4" />}
                       </div>
                       <div class="space-y-2 flex-1 min-w-0">
                          {/* 思维链展示 (Agent 专用) */}
                          <Show when={msg.thought}>
                            <div class="bg-black/80 rounded-lg p-3 border border-white/5 font-mono text-xs text-muted-foreground/80 whitespace-pre-wrap leading-relaxed max-w-full overflow-x-auto">
                               {msg.thought}
                            </div>
                          </Show>
                          
                          {/* 内容或任务卡片 */}
                          <Show when={msg.role === 'card' && msg.cardData} fallback={
                            <Show when={msg.content}>
                              <div class={cn(
                                "p-4 rounded-xl text-sm leading-relaxed",
                                msg.role === 'user' 
                                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                  : "bg-secondary/40 text-foreground border border-border/50 rounded-tl-sm"
                              )}>
                                {msg.content}
                              </div>
                            </Show>
                          }>
                            <div class="bg-card border border-primary/30 shadow-[0_4px_20px_rgba(114,46,209,0.1)] rounded-xl overflow-hidden mt-2 max-w-sm">
                              <div class="px-4 py-2 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
                                <span class="text-xs font-semibold text-foreground flex items-center gap-2">
                                  <Zap class="w-3.5 h-3.5 text-primary" /> {t('dashboard.mission_assigned')}
                                </span>
                                <span class="text-[10px] font-mono text-muted-foreground">{msg.cardData?.missionId}</span>
                              </div>
                              <div class="p-4 space-y-3 bg-secondary/5">
                                <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                  <div>
                                    <span class="text-muted-foreground block mb-0.5">{t('dashboard.target_skill')}</span>
                                    <span class="font-medium text-foreground">{msg.cardData?.skill}</span>
                                  </div>
                                  <div>
                                    <span class="text-muted-foreground block mb-0.5">{t('dashboard.allocated_context')}</span>
                                    <span class="font-medium text-foreground">{msg.cardData?.context}</span>
                                  </div>
                                  <div class="col-span-2 pt-2 border-t border-border/50">
                                    <span class="text-muted-foreground block mb-0.5">{t('dashboard.network_route')}</span>
                                    <span class="font-mono text-emerald-400">{msg.cardData?.proxy}</span>
                                  </div>
                                </div>
                              </div>
                              <div class="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center gap-2">
                                <Loader2 class="w-3.5 h-3.5 text-primary animate-spin" />
                                <span class="text-xs font-semibold text-primary">{msg.cardData?.status}</span>
                              </div>
                            </div>
                          </Show>
                       </div>
                    </div>
                  )}
                </For>
                
                <Show when={store.isProcessing()}>
                  <div class="flex gap-4">
                     <div class="w-8 h-8 rounded-full bg-primary/50 text-primary-foreground border-primary/80 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(114,46,209,0.3)] mt-1">
                        <Loader2 class="w-4 h-4 animate-spin" />
                     </div>
                     <div class="bg-secondary/20 border border-border/30 rounded-xl rounded-tl-sm p-4 h-12 flex items-center">
                        <span class="flex gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"></span>
                          <span class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce delay-75"></span>
                          <span class="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce delay-150"></span>
                        </span>
                     </div>
                  </div>
                </Show>
             </div>

             {/* 输入区域 */}
             <div class="p-4 bg-background border-t border-border shrink-0">
               <form onSubmit={handleSubmit} class="relative flex items-center">
                 <input 
                   type="text" 
                   value={inputVal()}
                   onInput={(e) => setInputVal(e.currentTarget.value)}
                   placeholder={t('dashboard.chat.placeholder') || "Command the agent..."}
                   class="w-full bg-secondary/30 border border-border/60 hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-4 pr-12 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={store.isProcessing()}
                 />
                 <button 
                   type="submit"
                   disabled={!inputVal().trim() || store.isProcessing()}
                   class="absolute right-2 p-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                 >
                   <Send class="w-4 h-4 ml-0.5" />
                 </button>
               </form>
               <div class="text-center mt-2">
                 <span class="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
                    <TerminalSquare class="w-3 h-3" /> {t('dashboard.core_footer')}
                 </span>
               </div>
             </div>
          </div>

          {/* 实时浏览器帧 (右侧) */}
          <div class="w-full xl:w-[450px] shrink-0 flex flex-col gap-6">
             
             <div class="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px] relative">
                <div class="px-4 py-3 border-b border-border/50 bg-secondary/10 flex items-center justify-between shrink-0 z-20 absolute top-0 left-0 right-0">
                   <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                     <span class="relative flex h-2 w-2">
                        {store.isProcessing() ? (
                           <>
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                           </>
                        ) : (
                           <span class="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/50"></span>
                        )}
                     </span>
                     {t('dashboard.live_browser_frame')}
                   </h3>
                   <button class="text-muted-foreground hover:text-primary transition-colors">
                     <ExternalLink class="w-4 h-4" />
                   </button>
                </div>
                
                <div class="flex-1 bg-[#15202b] flex items-center justify-center relative inner-shadow-black">
                   <div class="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]"></div>
                   
                   <Show when={store.latestFrame()} fallback={
                      <div class="z-10 text-center opacity-30 select-none flex flex-col items-center">
                         <Monitor class="w-12 h-12 text-white/50 mx-auto mb-3" />
                         <span class="font-mono text-xs text-white/60 tracking-widest uppercase break-words block px-4">
                           {store.isProcessing() ? t('dashboard.waiting_cdp') : t('dashboard.awaiting_command')}
                         </span>
                      </div>
                   }>
                      <img 
                        src={store.latestFrame()!} 
                        alt="CDP Live Frame" 
                        class="w-full h-full object-contain z-10" 
                      />
                   </Show>
                </div>
             </div>

             {/* 会话上下文快照 */}
             <div class="h-[200px] bg-secondary/20 border border-border rounded-xl p-5 shrink-0 flex flex-col">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('dashboard.current_session_context')}</h3>
                
                <div class="flex-1 flex flex-col justify-center space-y-3 font-mono text-xs">
                   <div class="flex justify-between items-center border-b border-border/30 pb-2">
                     <span class="text-muted-foreground">{t('dashboard.context_id')}</span>
                     <span class="text-foreground font-semibold">{store.isProcessing() ? "TEMP-8A9X..." : "None"}</span>
                   </div>
                   <div class="flex justify-between items-center border-b border-border/30 pb-2">
                     <span class="text-muted-foreground">{t('dashboard.connection')}</span>
                     <div class="flex items-center gap-1.5">
                       <span class={cn("w-2 h-2 rounded-full", store.isProcessing() ? "bg-emerald-500" : "bg-destructive/50")}></span>
                       <span class="text-foreground">{store.isProcessing() ? t('dashboard.socks5_intercepted') : t('dashboard.detached')}</span>
                     </div>
                   </div>
                   <div class="flex justify-between items-center pb-1">
                     <span class="text-muted-foreground">{t('dashboard.fingerprint')}</span>
                     <span class="text-foreground text-right max-w-[150px] truncate">
                        {store.isProcessing() ? "macOS_14_Chrome_122.0" : t('dashboard.waiting_allocation')}
                     </span>
                   </div>
                </div>
             </div>
             
          </div>
       </div>
    </MainLayout>
  );
};

export default Dashboard;
