import { Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { 
  LayoutDashboard, 
  PlayCircle, 
  Globe, 
  Puzzle, 
  Key, 
  FolderOpen, 
  Terminal,
  Box,
  Settings as SettingsIcon
} from 'lucide-solid';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';

const Sidebar: Component = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const NavItem = (props: { href: string; icon: any; label: string; badge?: string }) => {
    const isActive = () => location.pathname === props.href;
    
    return (
      <A 
        href={props.href}
        class={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium border border-transparent",
          isActive() 
            ? "bg-gradient-to-r from-primary/20 to-primary/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-primary/20" 
            : "text-muted-foreground hover:bg-white/5 hover:text-white"
        )}
      >
        <props.icon class={cn("w-4 h-4 transition-colors", isActive() ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")} />
        <span>{props.label}</span>
        {props.badge && (
          <span class="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {props.badge}
          </span>
        )}
      </A>
    );
  };

  return (
    <aside class="w-64 border-r border-white/5 flex flex-col bg-black/20 backdrop-blur-xl h-screen shadow-[4px_0_24px_rgba(0,0,0,0.4)] z-20">
      <div class="p-5 border-b border-border flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-primary/20 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(114,46,209,0.4)] ring-1 ring-white/10 overflow-hidden">
          <img src="/logo-vibrant.png" alt="VeilBrowser Logo" class="w-full h-full object-contain drop-shadow-md" />
        </div>
        <div class="flex flex-col">
           <span class="font-bold text-lg tracking-tight text-foreground leading-none">VeilBrowser</span>
           <span class="text-[10px] font-mono text-muted-foreground mt-1">Agent OS v3.0.0</span>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* 支柱一：中枢调度 */}
        <div>
          <h3 class="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-2 font-mono">
            {t('nav.sections.operate')}
          </h3>
          <div class="space-y-1">
            <NavItem href="/" icon={LayoutDashboard} label={t('nav.dashboard')} />
            <NavItem href="/taskruns" icon={PlayCircle} label={t('nav.taskruns')} badge={t('nav.live')} />
          </div>
        </div>

        {/* 支柱二：基础设施 */}
        <div>
          <h3 class="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-2 font-mono">
            {t('nav.sections.infrastructure')}
          </h3>
          <div class="space-y-1">
            <NavItem href="/contexts" icon={Box} label={t('nav.contexts')} />
            <NavItem href="/proxies" icon={Globe} label={t('nav.proxies')} />
            <NavItem href="/extensions" icon={Puzzle} label={t('nav.extensions')} />
          </div>
        </div>

        {/* 支柱三：业务资产 */}
        <div>
           <h3 class="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3 px-2 font-mono">
            {t('nav.sections.storage')}
          </h3>
          <div class="space-y-1">
            <NavItem href="/skills" icon={Terminal} label={t('nav.skills')} />
            <NavItem href="/identities" icon={Key} label={t('nav.identities')} />
            <NavItem href="/artifacts" icon={FolderOpen} label={t('nav.artifacts')} />
          </div>
        </div>
      </nav>

      <div class="p-4 border-t border-border bg-black/20 space-y-3">
        <NavItem href="/logs" icon={Terminal} label={t('nav.logs')} />
        <NavItem href="/settings" icon={SettingsIcon} label={t('nav.settings')} />
        
        <div class="flex items-center gap-3 pt-3 border-t border-border/50">
          <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
            <span class="text-xs font-bold text-muted-foreground">MA</span>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-foreground">{t('sidebar.master_agent')}</span>
            <span class="text-[10px] text-emerald-500 flex items-center gap-1.5 font-mono">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t('sidebar.status_online')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
