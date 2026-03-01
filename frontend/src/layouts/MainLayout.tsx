import { Component, JSX, createSignal, onMount, onCleanup } from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import Sidebar from '../components/Sidebar';
import { Search, Cpu, MemoryStick, Activity, Bell } from 'lucide-solid';
import { useTranslation } from '../i18n';

interface MainLayoutProps {
  children?: JSX.Element;
}

const MainLayout: Component<MainLayoutProps> = (props) => {
  const { t } = useTranslation();
  
  const [cpuUsage, setCpuUsage] = createSignal("0.0");
  const [ramMb, setRamMb] = createSignal("0");
  const [netKbps, setNetKbps] = createSignal("0");

  onMount(() => {
    const unlisten = listen('system-metrics', (event: any) => {
      const data = event.payload;
      setCpuUsage(data.cpu_percent);
      setRamMb(data.ram_mb);
      setNetKbps(data.net_kbps);
    });

    onCleanup(async () => {
      (await unlisten)();
    });
  });

  return (
    <div class="flex h-screen bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-foreground overflow-hidden font-sans selection:bg-primary selection:text-white">
      <Sidebar />
      
      <main class="flex-1 flex flex-col min-w-0 relative bg-transparent">
        {/* 顶部导航栏 */}
        <header class="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/40 backdrop-blur-md sticky top-0 z-10 w-full shadow-sm">
            {/* 搜索框 */}
            <div class="flex items-center gap-3 text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 transition-colors hover:border-primary/30 w-64">
                <Search class="w-4 h-4" />
                <span class="text-xs font-mono opacity-50">{t('search.placeholder')}</span>
            </div>
            
            <div class="flex items-center gap-6">
                 {/* 系统资源指标 */}
                <div class="flex items-center gap-4 text-[10px] font-mono text-muted-foreground hidden lg:flex bg-secondary/30 px-3 py-1.5 rounded border border-border/30">
                    <div class="flex items-center gap-2">
                        <Cpu class="w-3 h-3" />
                        <span>{t('common.cpu')}: <span class="text-foreground">{cpuUsage()}%</span></span>
                    </div>
                    <div class="w-px h-3 bg-border"></div>
                    <div class="flex items-center gap-2">
                        <MemoryStick class="w-3 h-3" />
                        <span>{t('common.ram')}: <span class="text-foreground">{ramMb()}MB</span></span>
                    </div>
                    <div class="w-px h-3 bg-border"></div>
                    <div class="flex items-center gap-2">
                        <Activity class="w-3 h-3" />
                        <span>{t('common.net')}: <span class="text-emerald-400">{netKbps()} KB/s</span></span>
                    </div>
                </div>

                <div class="w-px h-4 bg-border hidden lg:block"></div>

                <button class="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors relative">
                    <Bell class="w-4 h-4" />
                    <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive border-2 border-background"></span>
                </button>
            </div>
        </header>

        {/* 内容区域 */}
        <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
          {props.children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
