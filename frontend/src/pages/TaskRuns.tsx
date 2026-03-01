import { Component, createSignal, For, onMount, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { PlayCircle, Plus, Activity, CheckCircle2, XCircle, AlertTriangle, TerminalSquare, Clock, Bot, XOctagon, Hand } from 'lucide-solid';
import { cn } from '../lib/utils';

interface TelemetryLog {
  time: string;
  level: string;
  msg: string;
}

interface TaskRun {
  id: string;
  script: string;
  target: string;
  status: string;
  runtime: string;
  lastUpdate: string;
  errorCode?: string;
}

const TaskRuns: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'active' | 'history'>('active');
  const [selectedTaskRun, setSelectedTaskRun] = createSignal<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [telemetry, setTelemetry] = createSignal<Record<string, TelemetryLog[]>>({});
  const [frames, setFrames] = createSignal<Record<string, string>>({});
  const [taskRuns, setTaskRuns] = createSignal<TaskRun[]>([]);

  const loadTaskRuns = async () => {
    try {
      const runs: any[] = await invoke('fetch_task_runs');
      const formattedRuns = runs.map(r => ({
        id: r.id,
        script: r.skill_id || "Unknown Skill",
        target: r.context_id || "Ephemeral",
        status: r.status.toLowerCase(),
        runtime: "00:00",
        lastUpdate: new Date(r.updated_at + "Z").toLocaleString('zh-CN'),
        errorCode: r.error_code
      }));
      setTaskRuns(formattedRuns);
      if (formattedRuns.length > 0 && !selectedTaskRun()) {
        setSelectedTaskRun(formattedRuns[0].id);
      }
    } catch (e) {
      console.error("Failed to load task runs", e);
    }
  };

  onMount(() => {
    loadTaskRuns();

    // 监听来自后端的流状态更新，如果任务状态变了，可以刷新一下列表
    const unlistenAgent = listen('agent_stream_chunk', (event: any) => {
      const payload = event.payload;
      if (payload.type === 'card' || payload.status === 'COMPLETED' || payload.status === 'FAILED') {
         loadTaskRuns();
      }
      
      if (payload.type === 'thought' && payload.chunk) {
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const newLog = { 
          time: now, 
          level: 'INFO', 
          msg: `[Agent] ${payload.chunk.trim()}` 
        };
        const sid = selectedTaskRun() || "latest";
        setTelemetry(prev => ({
          ...prev,
          [sid]: [...(prev[sid] || []), newLog].slice(-100)
        }));
      }
    });
    const unlistenLog = listen('cdp-log', (event: any) => {
      const { method, params } = event.payload;
      const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const newLog = { 
        time: now, 
        level: method.includes('error') ? 'ERROR' : 'INFO', 
        msg: `${method}: ${JSON.stringify(params)}` 
      };
      
      const sid = selectedTaskRun() || "latest";

      setTelemetry(prev => ({
        ...prev,
        [sid]: [...(prev[sid] || []), newLog].slice(-100)
      }));
    });

    const unlistenFrame = listen('screencast-frame', (event: any) => {
      const { data, sessionId, missionId } = event.payload;
      const sid = missionId || sessionId || selectedTaskRun() || "latest";
      setFrames(prev => ({
        ...prev,
        [sid]: data
      }));
    });

    onCleanup(async () => {
      (await unlistenLog)();
      (await unlistenFrame)();
      (await unlistenAgent)();
    });
  });

  const handleStartTaskRun = async () => {
    try {
      const id = `task_${Math.random().toString(36).substring(2, 8)}`;
      setTaskRuns(prev => [...prev, {
        id,
        script: "Generic_Discovery_Task",
        target: "New_Session",
        status: "running",
        runtime: "00:00",
        lastUpdate: t('taskruns.demo.just_now')
      }]);
      setSelectedTaskRun(id);
      setIsAddModalOpen(false);

      await invoke('start_session', { 
        missionId: id,
        skillId: "dynamic_query",
        initialPrompt: "System Discovery Test" 
      });
    } catch (e) {
      console.error(e);
      alert(t('common.status.failed') + ": " + e);
    }
  };

  const getStatusIcon = (status: string, errorCode?: string) => {
    if (errorCode === 'captcha_required') return <Hand class="w-4 h-4 text-orange-500 animate-bounce" />;
    switch (status) {
      case 'running': return <Activity class="w-4 h-4 text-emerald-400 animate-pulse" />;
      case 'completed': return <CheckCircle2 class="w-4 h-4 text-blue-400" />;
      case 'failed': return <XCircle class="w-4 h-4 text-destructive" />;
      case 'aborted': return <XOctagon class="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getLogColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-muted-foreground';
      case 'WARN': return 'text-yellow-500';
      case 'SUCCESS': return 'text-emerald-400';
      case 'ERROR': return 'text-destructive';
      default: return 'text-foreground';
    }
  };

  const filteredTaskRuns = () => taskRuns().filter((m: TaskRun) => 
    activeTab() === 'active' 
      ? (m.status === 'running' || m.status === 'initializing') 
      : (m.status !== 'running' && m.status !== 'initializing')
  );

  return (
    <MainLayout>
       <div class="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-[1400px] mx-auto pb-4">
          
          <div class="flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <PlayCircle class="w-6 h-6 text-primary" />
                {t('taskruns.title')}
              </h2>
              <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
                {t('taskruns.description')}
              </p>
            </div>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(114,46,209,0.3)]"
            >
              <Plus class="w-4 h-4" />
              {t('taskruns.test_launch')}
            </button>
          </div>

          <div class="flex-1 min-h-0 flex gap-6 mt-6">
            
            {/* 左侧：任务列表 */}
            <div class="w-1/3 flex flex-col bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div class="flex items-center border-b border-border/50 bg-secondary/20 p-2 shrink-0">
                <button 
                  onClick={() => setActiveTab('active')}
                  class={cn(
                    "flex-1 py-2 text-sm font-medium rounded transition-colors text-center relative",
                    activeTab() === 'active' ? "text-foreground bg-background shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t('taskruns.tabs.active')}
                  {activeTab() === 'active' && <span class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  class={cn(
                    "flex-1 py-2 text-sm font-medium rounded transition-colors text-center",
                    activeTab() === 'history' ? "text-foreground bg-background shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t('taskruns.tabs.history')}
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-3 space-y-2">
                 <For each={filteredTaskRuns()}>
                  {(taskRun) => (
                    <div 
                      onClick={() => setSelectedTaskRun(taskRun.id)}
                      class={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer group",
                        selectedTaskRun() === taskRun.id 
                          ? "bg-primary/10 border-primary/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                          : "bg-background border-border hover:border-primary/50 hover:bg-secondary/40"
                      )}
                    >
                      <div class="flex items-start justify-between mb-2">
                        <span class="font-mono text-xs text-muted-foreground/80">{taskRun.id}</span>
                        {getStatusIcon(taskRun.status, taskRun.errorCode)}
                      </div>
                      <h4 class="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">{taskRun.script}</h4>
                      <p class="text-xs text-muted-foreground font-mono bg-secondary/50 w-fit px-1.5 py-0.5 rounded truncate max-w-full">
                        @{taskRun.target}
                      </p>
                      {taskRun.errorCode === 'captcha_required' && (
                        <div class="mt-2 text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded inline-flex items-center gap-1">
                           <AlertTriangle class="w-3 h-3" /> {t('taskruns.captcha_badge')}
                        </div>
                      )}
                      <div class="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span class="flex items-center gap-1.5"><Clock class="w-3 h-3" /> {taskRun.runtime}</span>
                        <span>{taskRun.lastUpdate}</span>
                      </div>
                    </div>
                  )}
                 </For>
                 {filteredTaskRuns().length === 0 && (
                   <div class="p-8 text-center text-muted-foreground text-sm">{t('taskruns.empty')}</div>
                 )}
              </div>
            </div>

            {/* 右侧：遥测面板 & 屏幕流 */}
            <div class="flex-1 flex flex-col gap-4">
              
              <div class="flex-1 bg-black/90 border border-border rounded-lg overflow-hidden flex flex-col shadow-inner shadow-black relative group">
                  <div class="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                    <TerminalSquare class="w-4 h-4 text-muted-foreground" />
                    <span class="font-mono text-sm font-medium text-muted-foreground">{t('taskruns.telemetry.title')}</span>
                    
                    <div class="ml-auto flex items-center gap-2">
                       <span class="font-mono text-[10px] text-emerald-500/80 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10">{t('taskruns.telemetry.connected')}</span>
                       {activeTab() === 'active' && (
                         <button class="flex items-center gap-1 font-mono text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/20 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 transition-colors">
                           <XOctagon class="w-3 h-3" /> {t('taskruns.emergency_stop')}
                         </button>
                       )}
                    </div>
                  </div>
                  
                  <div class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed tracking-wide space-y-1.5 flex flex-col-reverse">
                     {selectedTaskRun() && telemetry()[selectedTaskRun()!]?.length ? (
                        <For each={[...telemetry()[selectedTaskRun()!]].reverse()}>
                          {(log) => (
                            <div class="flex items-start gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-all">
                              <span class="text-muted-foreground/50 shrink-0">[{log.time}]</span>
                              <span class={cn("shrink-0 min-w-[60px]", getLogColor(log.level))}>{log.level}</span>
                              <span class="text-white/80">{log.msg}</span>
                            </div>
                          )}
                        </For>
                     ) : (
                        <div class="h-full flex items-center justify-center text-muted-foreground/50 italic">
                          {t('taskruns.telemetry.waiting')}
                        </div>
                     )}
                  </div>
              </div>

              <div class="h-64 bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
                 <div class="flex items-center px-4 py-2 border-b border-border/50 bg-secondary/30">
                    <span class="text-xs font-medium text-muted-foreground flex items-center gap-2">
                       <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                       </span>
                       {t('taskruns.screencast.title')}
                    </span>
                 </div>
                 <div class="flex-1 bg-[#15202b] flex items-center justify-center relative overflow-hidden">
                     {activeTab() === 'active' && selectedTaskRun() ? (
                      frames()[selectedTaskRun()!] ? (
                        <div class="relative w-full h-full">
                          <img 
                            src={`data:image/jpeg;base64,${frames()[selectedTaskRun()!]}`} 
                            class="w-full h-full object-contain" 
                            alt="Live Frame" 
                          />
                          {taskRuns().find(t => t.id === selectedTaskRun())?.errorCode === 'captcha_required' && (
                            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                               <Hand class="w-16 h-16 text-orange-500 mb-4 animate-bounce" />
                               <h3 class="text-xl font-bold text-white mb-2">{t('taskruns.manual_intercept.title')}</h3>
                               <p class="text-white/70 text-sm mb-6 max-w-sm">{t('taskruns.manual_intercept.desc')}</p>
                               <button class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                                 <Activity class="w-4 h-4" /> {t('taskruns.manual_intercept.button')}
                               </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div class="absolute inset-0 flex items-center justify-center flex-col gap-4 opacity-50">
                          <svg viewBox="0 0 24 24" aria-hidden="true" class="w-16 h-16 fill-[#1d9bf0]"><g><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"></path></g></svg>
                          <div class="w-48 h-1 bg-white/10 rounded overflow-hidden">
                             <div class="h-full bg-primary/50 animate-[pulse_2s_ease-in-out_infinite] w-1/3"></div>
                          </div>
                        </div>
                      )
                    ) : (
                      <span class="text-sm text-white/30 font-mono">{t('common.no_signal')}</span>
                    )}
                 </div>
              </div>
            </div>

          </div>
       </div>

       {/* 启动确认弹窗 */}
       {isAddModalOpen() && (
        <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div class="p-8 pb-6 flex flex-col items-center">
              <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6 shadow-[0_0_30px_rgba(114,46,209,0.5)]">
                <Bot class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-bold text-foreground tracking-tight mb-3">{t('taskruns.modal.title')}</h3>
              <p class="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                {t('taskruns.modal.desc')}
              </p>
            </div>
            <div class="px-6 py-5 border-t border-border/50 bg-secondary/10 flex flex-col gap-3">
              <button 
                onClick={handleStartTaskRun}
                class="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)] flex justify-center items-center gap-2"
              >
                {t('taskruns.modal.force_start')}
              </button>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                class="w-full py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary border border-transparent hover:border-border transition-colors"
              >
                {t('taskruns.modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TaskRuns;
