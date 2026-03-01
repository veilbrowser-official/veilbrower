import { Component, For, createResource, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Puzzle, Upload, Trash2, Power, PowerOff, ShieldAlert, CheckCircle2, AlertCircle, Globe } from 'lucide-solid';
import { cn } from '../lib/utils';

interface Extension {
  id: string;
  name: string;
  version: string;
  policy: string;
  status: string;
  storage_path: string;
}

const Extensions: Component = () => {
  const { t } = useTranslation();

  const [extensions, { refetch }] = createResource<Extension[]>(async () => {
    try {
      return await invoke('fetch_extensions');
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const handleAction = async (action: string, id: string, currentStatus?: string) => {
    try {
      if (action === 'Toggle' && currentStatus) {
        await invoke('set_extension_status', { 
          id, 
          status: currentStatus === 'active' ? 'disabled' : 'active' 
        });
      } else if (action === 'Delete') {
        await invoke('remove_extension', { id });
      }
      refetch();
    } catch(e) {
      alert(`操作失败: ${e}`);
    }
  };

  const handleAddMockExtension = async () => {
    try {
      await invoke('add_extension', {
        extension: {
          id: `ext_${Math.random().toString(36).substring(2, 9)}`,
          name: "Fingerprint Defender Pro (Mock)",
          version: "3.2.1",
          policy: "optional",
          status: "active",
          storage_path: "/data/extensions/defender.crx"
        }
      });
      refetch();
    } catch(e) {
      alert("添加插件失败: " + e);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle2 class="w-4 h-4 text-emerald-500" />;
      case 'patched': return <ShieldAlert class="w-4 h-4 text-blue-400" />;
      case 'error': return <AlertCircle class="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const getPolicyColor = (policy: string) => {
    switch (policy) {
      case 'force_install': return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case 'optional': return "bg-secondary text-muted-foreground border-border";
      case 'forbidden': return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  return (
    <MainLayout>
       <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
          {/* 页头 */}
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Puzzle class="w-6 h-6 text-primary" />
                {t('extensions.title')}
              </h2>
              <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
                {t('extensions.description')}
              </p>
            </div>
            
            <div class="flex items-center gap-3">
              <button class="bg-secondary/60 hover:bg-secondary text-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 border border-border/50 transition-all active:scale-95">
                <Globe class="w-4 h-4 text-emerald-500" />
                {t('extensions.browse_store')}
              </button>
              <button 
                onClick={handleAddMockExtension}
                class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(114,46,209,0.3)]">
                <Upload class="w-4 h-4" />
                {t('extensions.add_extension')}
              </button>
            </div>
          </div>

          {/* 表格内容区 */}
          <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm mt-8">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-secondary/40 text-muted-foreground uppercase text-xs font-mono tracking-wider border-b border-border/50">
                  <tr>
                     <th class="px-6 py-4 font-medium">{t('extensions.table.name')}</th>
                     <th class="px-6 py-4 font-medium">{t('extensions.table.version')}</th>
                     <th class="px-6 py-4 font-medium">{t('extensions.table.policy')}</th>
                     <th class="px-6 py-4 font-medium">{t('extensions.table.status')}</th>
                     <th class="px-6 py-4 font-medium text-right">{t('extensions.table.actions')}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/30">
                   <Show when={!extensions.loading && extensions()?.length === 0}>
                     <tr>
                       <td colspan="5" class="px-6 py-12 text-center text-muted-foreground border-dashed border-b border-border/50">
                         {t('extensions.empty')}
                       </td>
                     </tr>
                   </Show>
                   <For each={extensions()}>
                    {(ext) => (
                      <tr class="hover:bg-muted/10 transition-colors group">
                        <td class="px-6 py-4">
                          <div class="flex flex-col">
                            <span class="font-medium text-foreground">{ext.name}</span>
                            <span class="text-xs text-muted-foreground/70 truncate max-w-xs">
                              {ext.storage_path}
                            </span>
                          </div>
                        </td>
                        <td class="px-6 py-4 font-mono text-muted-foreground text-xs">{ext.version}</td>
                        <td class="px-6 py-4">
                           <span class={cn(
                             "px-2 py-1 rounded w-fit text-[10px] font-bold tracking-wide uppercase border",
                             getPolicyColor(ext.policy)
                           )}>
                             {t(`extensions.policies.${ext.policy}`) || ext.policy}
                           </span>
                        </td>
                        <td class="px-6 py-4">
                           <div class="flex items-center gap-2">
                             {getStatusIcon(ext.status === 'active' ? 'ready' : 'error')}
                             <span class="text-xs text-muted-foreground">
                               {t(`extensions.status.${ext.status}`) || ext.status}
                             </span>
                           </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleAction('Toggle', ext.id, ext.status)}
                                class={cn(
                                  "p-2 rounded transition-colors",
                                  ext.status === 'active' 
                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" 
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                )}
                                title={ext.status === 'active' ? t('extensions.actions.disable') : t('extensions.actions.enable')}
                                disabled={ext.policy === 'forbidden'}
                              >
                                {ext.status === 'active' ? <Power class="w-4 h-4" /> : <PowerOff class="w-4 h-4" />}
                              </button>
                              
                              <button 
                                onClick={() => handleAction('Delete', ext.id)}
                                class="p-2 bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors"
                                title={t('extensions.actions.remove')}
                                disabled={ext.policy === 'force_install'}
                              >
                                <Trash2 class="w-4 h-4" />
                              </button>
                            </div>
                        </td>
                      </tr>
                    )}
                   </For>
                </tbody>
              </table>
            </div>
          </div>
       </div>
    </MainLayout>
  );
};

export default Extensions;
