import { Component, createSignal, For, onMount, onCleanup, createEffect } from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Terminal, Cpu, HardDrive, Trash2, Download } from 'lucide-solid';
import { cn } from '../lib/utils';

interface LogEntry {
  time: string;
  src: string;
  level: string;
  msg: string;
}

const Logs: Component = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  const [filter, setFilter] = createSignal('All');
  let terminalRef: HTMLDivElement | undefined;

  // CPU/MEM 实时数据（从全局布局同步或独立监听）
  const [metrics, setMetrics] = createSignal({ cpu: "0.0", mem: "0" });

  onMount(() => {
    // 监听系统日志
    const unlistenLog = listen('system-log', (event: any) => {
      const newEntry = event.payload as LogEntry;
      setLogs(prev => [...prev, newEntry].slice(-500)); // 保留最后500条
    });

    // 监听资源指标
    const unlistenMetrics = listen('system-metrics', (event: any) => {
      const data = event.payload;
      setMetrics({ cpu: data.cpu_percent, mem: data.ram_mb });
    });

    onCleanup(async () => {
      (await unlistenLog)();
      (await unlistenMetrics)();
    });
  });

  // 自动滚动到底部
  createEffect(() => {
    logs();
    if (terminalRef) {
      terminalRef.scrollTop = terminalRef.scrollHeight;
    }
  });

  const filteredLogs = () => {
    const currentFilter = filter();
    if (currentFilter === 'All') return logs();
    return logs().filter(l => l.src === currentFilter);
  };

  const getLogColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-yellow-500';
      case 'SUCCESS': return 'text-emerald-400';
      case 'ERROR': return 'text-red-500';
      case 'DEBUG': return 'text-purple-400 opacity-70';
      default: return 'text-foreground';
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <MainLayout>
      <div class="h-full flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto pb-4">
        
        {/* 页头 */}
        <div class="flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Terminal class="w-6 h-6 text-primary" />
              {t('logs.title')}
            </h2>
            <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
              Real-time monitoring of VeilBrowser V3 Agent OS kernel and CDP engine.
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-4 text-xs font-mono bg-secondary/30 px-4 py-2 rounded-lg border border-border/50 mr-4">
              <span class="flex items-center gap-1.5 text-muted-foreground"><Cpu class="w-3.5 h-3.5" /> CPU: <span class="text-foreground">{metrics().cpu}%</span></span>
              <span class="flex items-center gap-1.5 text-muted-foreground"><HardDrive class="w-3.5 h-3.5" /> MEM: <span class="text-foreground">{metrics().mem}MB</span></span>
            </div>
            
            <button onClick={clearLogs} class="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Clear Console">
              <Trash2 class="w-4 h-4" />
            </button>
            <button class="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Download Logs">
              <Download class="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 日志终端 */}
        <div class="flex-1 min-h-0 bg-[#0a0a0a] border border-border rounded-lg overflow-hidden flex flex-col shadow-2xl relative">
            {/* 过滤器栏 */}
            <div class="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5 shrink-0 text-[10px] font-mono uppercase tracking-widest">
               {[ 'All', 'Agent OS', 'CDP Engine', 'Identity Vault', 'MCP Server', 'Rust Core' ].map(name => (
                 <button 
                   onClick={() => setFilter(name)}
                   class={cn(
                     "px-3 py-1 rounded transition-all",
                     filter() === name ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-white"
                   )}
                 >
                   {name}
                 </button>
               ))}
               
               <div class="ml-auto flex items-center gap-2 text-emerald-500 font-bold">
                  <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> 
                  LIVE
               </div>
            </div>
            
            {/* 日志条目区域 */}
            <div 
              ref={terminalRef}
              class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed tracking-wide space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
            >
               <Show when={filteredLogs().length === 0}>
                 <div class="h-full flex items-center justify-center text-muted-foreground/30 italic">
                    Waiting for kernel signals...
                 </div>
               </Show>
               <For each={filteredLogs()}>
                  {(log) => (
                    <div class="flex items-start gap-4 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group border-l-2 border-transparent hover:border-primary/30">
                      <span class="text-muted-foreground/30 shrink-0 w-24">[{log.time}]</span>
                      <span class="text-muted-foreground/60 shrink-0 w-28 truncate">[{log.src}]</span>
                      <span class={cn("shrink-0 w-12 font-bold", getLogColor(log.level))}>{log.level}</span>
                      <span class="text-white/80 group-hover:text-white break-all flex-1">{log.msg}</span>
                    </div>
                  )}
               </For>
            </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Logs;
