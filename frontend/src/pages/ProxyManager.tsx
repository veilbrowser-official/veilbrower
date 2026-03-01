import { Component, For, createSignal, createResource, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Plus, Activity, Trash2, Edit2, Globe2 } from 'lucide-solid';
import { cn } from '../lib/utils';

interface Proxy {
  id: string;
  alias: string;
  protocol: string;
  address: string;
  geo: string | null;
  latency: number | null;
  status: string;
}

const ProxyManager: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'manual' | 'providers'>('providers');
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  
  const [newAlias, setNewAlias] = createSignal('');
  const [newProtocol, setNewProtocol] = createSignal('SOCKS5');
  const [newAddress, setNewAddress] = createSignal('');

  const [proxies, { refetch }] = createResource<Proxy[]>(async () => {
    try {
      return await invoke('fetch_proxies');
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const providers = [
    { id: 'prov_1', name: 'BrightData', type: 'Residential', balance: '$124.50', status: 'connected', activeIPs: 14 },
    { id: 'prov_2', name: 'IPRoyal', type: 'Datacenter', balance: '$45.00', status: 'connected', activeIPs: 3 },
    { id: 'prov_3', name: 'Oxylabs', type: 'Mobile', balance: 'N/A', status: 'offline', activeIPs: 0 }
  ];

  const handleTest = async (id: string, alias: string) => {
    try {
      const fakeLatency = Math.floor(Math.random() * 200) + 10;
      await invoke('set_proxy_status', { id, status: 'connected', latency: fakeLatency });
      refetch();
      alert(t('proxy_manager.test_success', { alias, latency: fakeLatency }));
    } catch (e) {
      console.error(e);
      alert(t('proxy_manager.test_failed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('remove_proxy', { id });
      refetch();
    } catch (e) {
      console.error(e);
      alert(t('common.actions.delete_failed') + ": " + e);
    }
  };

  const handleSave = async () => {
    if (!newAlias() || !newAddress()) return alert(t('proxy_manager.fill_fields'));
    
    const proxyId = `prx_${Math.random().toString(36).substring(2, 9)}`;
    const newProxy: Proxy = {
      id: proxyId,
      alias: newAlias(),
      protocol: newProtocol(),
      address: newAddress(),
      geo: "🌎 Local / Custom",
      latency: null,
      status: "offline"
    };

    try {
      await invoke('add_proxy', { proxy: newProxy });
      setIsAddModalOpen(false);
      setNewAlias('');
      setNewAddress('');
      refetch();
    } catch (e) {
      console.error(e);
      alert(t('proxy_manager.create_failed') + ": " + e);
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
        
        {/* 页头 */}
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe2 class="w-6 h-6 text-primary" />
              {t('proxy_manager.title')}
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {t('proxy_manager.description')}
            </p>
          </div>
          
          <div class="flex gap-2">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              class="bg-secondary/50 hover:bg-secondary text-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all border border-border/50"
            >
              <Plus class="w-4 h-4" />
              {t('proxy_manager.add_static')}
            </button>
            <button class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)]">
              <Globe2 class="w-4 h-4" />
              {t('proxy_manager.bind_vendor')}
            </button>
          </div>
        </div>

        <div class="relative flex inline-flex bg-secondary/20 p-1 rounded-lg border border-border/40 backdrop-blur-sm self-start">
           <button 
              onClick={() => setActiveTab('providers')} 
              class={cn(
                "relative z-10 px-5 py-1.5 text-sm font-medium rounded-md transition-all duration-300", 
                activeTab() === 'providers' ? "bg-card text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] border border-border/50" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {t('proxy_manager.tabs.dynamic')}
            </button>
           <button 
              onClick={() => setActiveTab('manual')} 
              class={cn(
                "relative z-10 px-5 py-1.5 text-sm font-medium rounded-md transition-all duration-300", 
                activeTab() === 'manual' ? "bg-card text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] border border-border/50" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {t('proxy_manager.tabs.manual')}
            </button>
        </div>

        {/* 节点列表表格 */}
        <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            {activeTab() === 'manual' ? 
              <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-secondary/40 text-muted-foreground uppercase text-xs font-mono tracking-wider border-b border-border/50">
                <tr>
                  <th class="px-6 py-4 font-medium">{t('proxy_manager.table.alias')}</th>
                  <th class="px-6 py-4 font-medium">{t('proxy_manager.table.protocol')}</th>
                  <th class="px-6 py-4 font-medium">{t('proxy_manager.table.address')}</th>
                  <th class="px-6 py-4 font-medium">{t('proxy_manager.table.geo')}</th>
                  <th class="px-6 py-4 font-medium">{t('proxy_manager.table.status')}</th>
                  <th class="px-6 py-4 font-medium text-right">{t('proxy_manager.table.actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <Show when={!proxies.loading && proxies()?.length === 0}>
                   <tr>
                     <td colspan="6" class="px-6 py-12 text-center text-muted-foreground border-dashed border-b border-border/50">
                       {t('proxy_manager.empty_manual')}
                     </td>
                   </tr>
                </Show>
                <For each={proxies()}>
                  {(node) => (
                    <tr class="hover:bg-muted/10 transition-colors group">
                      <td class="px-6 py-4 font-medium text-foreground">
                        {node.alias}
                        <div class="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-50">{node.id}</div>
                      </td>
                      <td class="px-6 py-4">
                        <span class={cn(
                          "px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase border",
                          node.protocol === 'SOCKS5' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>
                          {node.protocol}
                        </span>
                      </td>
                      <td class="px-6 py-4 font-mono text-muted-foreground">{node.address}</td>
                      <td class="px-6 py-4 text-muted-foreground flex items-center gap-2">
                        {node.geo}
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          {node.status === 'connected' ? (
                            <>
                              <span class="relative flex h-2.5 w-2.5">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                              <span class="text-emerald-400 font-mono">{node.latency} ms</span>
                            </>
                          ) : (
                            <>
                              <span class="h-2.5 w-2.5 rounded-full bg-muted-foreground/30"></span>
                              <span class="text-muted-foreground">{t('proxy_manager.status.offline')}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleTest(node.id, node.alias)}
                            class="p-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-emerald-400 rounded transition-colors"
                            title={t('proxy_manager.actions.test')}
                          >
                            <Activity class="w-4 h-4" />
                          </button>
                          <button 
                            class="p-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-colors"
                            title={t('proxy_manager.actions.edit')}
                          >
                            <Edit2 class="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(node.id)}
                            class="p-2 bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors border-transparent border hover:border-destructive/30"
                            title={t('proxy_manager.actions.delete')}
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
             : 
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-secondary/40 text-muted-foreground uppercase text-xs font-mono tracking-wider border-b border-border/50">
                  <tr>
                    <th class="px-6 py-4 font-medium">{t('proxy_manager.table_vendor.name')}</th>
                    <th class="px-6 py-4 font-medium">{t('proxy_manager.table_vendor.type')}</th>
                    <th class="px-6 py-4 font-medium">{t('proxy_manager.table_vendor.balance')}</th>
                    <th class="px-6 py-4 font-medium">{t('proxy_manager.table_vendor.distribution')}</th>
                    <th class="px-6 py-4 font-medium text-right">{t('proxy_manager.table_vendor.active_ips')}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/30">
                  <For each={providers}>
                   {(prov) => (
                    <tr class="hover:bg-muted/10 transition-colors">
                      <td class="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                        <Globe2 class="w-4 h-4 text-primary opacity-60" /> {prov.name}
                      </td>
                      <td class="px-6 py-4 text-muted-foreground">{prov.type}</td>
                      <td class="px-6 py-4 font-mono text-emerald-400">{prov.balance}</td>
                      <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded bg-secondary text-xs text-muted-foreground border border-border">Global Mixed</span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <span class="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{prov.activeIPs}</span>
                      </td>
                    </tr>
                   )}
                  </For>
                </tbody>
              </table>
            }
          </div>
          <div class="p-4 border-t border-border/50 bg-secondary/20 flex justify-between items-center text-xs text-muted-foreground">
            <span>{activeTab() === 'manual' ? t('proxy_manager.footer.total_manual', { count: proxies()?.length || 0 }) : t('proxy_manager.footer.total_vendor', { count: providers.length })}</span>
            <span class="font-mono">{t('proxy_manager.footer.gateway_status')}: <span class="text-emerald-400">[ TCP:10800 ]</span> {t('proxy_manager.footer.ready')}</span>
          </div>
        </div>

      </div>

      {/* 添加节点弹窗 */}
      {isAddModalOpen() && (
        <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/10">
              <h3 class="font-semibold text-foreground flex items-center gap-2">
                <Globe2 class="w-4 h-4 text-primary" />
                {t('proxy_manager.modal.title')}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} class="text-muted-foreground hover:text-foreground transition-colors text-xl">
                &times;
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('proxy_manager.modal.alias')}</label>
                <input type="text" value={newAlias()} onInput={(e) => setNewAlias(e.target.value)} placeholder="e.g. US-Residential-01" class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('proxy_manager.modal.protocol')}</label>
                <select value={newProtocol()} onChange={(e) => setNewProtocol(e.target.value)} class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all appearance-none cursor-pointer">
                  <option value="SOCKS5">SOCKS5</option>
                  <option value="HTTP">HTTP/HTTPS</option>
                  <option value="SSH">SSH Tunnel</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('proxy_manager.modal.address')}</label>
                <input type="text" value={newAddress()} onInput={(e) => setNewAddress(e.target.value)} placeholder="127.0.0.1:1080" class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all font-mono" />
              </div>
            </div>
            <div class="px-6 py-4 border-t border-border/50 bg-secondary/5 flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                {t('proxy_manager.modal.cancel')}
              </button>
              <button onClick={handleSave} class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)]">
                {t('proxy_manager.modal.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ProxyManager;
