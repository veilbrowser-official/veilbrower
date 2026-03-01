import { Component, createSignal, createResource, For, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from '../layouts/MainLayout';
import { KeyRound, ShieldCheck, Lock, Search, Plus, Copy, RefreshCw, Trash2, Users, Cookie } from 'lucide-solid';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { PLATFORMS, getPlatformIcon } from '../constants/platforms';

interface Identity {
  id: string;
  platform: string; 
  username: string; 
  encrypted_secret: number[]; 
  type: 'account' | 'api_key'; 
  created_at: string | null;
  session_cookies: string | null;
}

const Identities: Component = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = createSignal<'accounts' | 'api_keys'>('accounts');
  const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = createSignal(false);
  const [selectedIdentityForCookie, setSelectedIdentityForCookie] = createSignal<Identity | null>(null);
  const [cookieJson, setCookieJson] = createSignal('');
  
  const [newPlatformId, setNewPlatformId] = createSignal('');
  const [newUsername, setNewUsername] = createSignal('');
  const [newSecret, setNewSecret] = createSignal('');

  // 映射后端旧版接口字段以兼容 UI
  const [identities, { refetch }] = createResource<Identity[]>(async () => {
    try {
      const resp: any[] = await invoke('get_identities');
      return resp.map(item => ({
        ...item,
        platform: item.domain, // Here domain actually stores the platform ID now
        encrypted_secret: item.encrypted_password,
        type: 'account' 
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  // 演示用的 API 密钥数据
  const apiKeys = [
    {
      id: "api_01",
      platform: "OpenAI",
      purpose: "GPT-4 Master Agent",
      username: "sk-proj-...",
      lastUsed: "2 mins ago",
      status: "active",
      type: 'api_key'
    }
  ];

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_identity', { id });
      refetch();
    } catch (e) {
      console.error(e);
      alert(t('identities.delete_failed') + ": " + e);
    }
  };

  const handleCopy = async (_id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(t('identities.copy_success'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!newPlatformId() || !newUsername() || !newSecret()) {
      return alert(t('identities.fill_all_fields'));
    }
    const credId = `cred_${Math.random().toString(36).substring(2, 9)}`;
    try {
      await invoke('add_identity', {
        id: credId,
        domain: newPlatformId(),
        username: newUsername(),
        password: newSecret()
      });
      setIsAddModalOpen(false);
      setNewPlatformId('');
      setNewUsername('');
      setNewSecret('');
      refetch();
    } catch(e) {
      console.error(e);
      alert(t('identities.save_failed') + ": " + e);
    }
  };

  const handleOpenCookieModal = (identity: Identity) => {
    setSelectedIdentityForCookie(identity);
    setCookieJson(identity.session_cookies || '');
    setIsCookieModalOpen(true);
  };

  const handleSaveCookies = async () => {
    const identity = selectedIdentityForCookie();
    if (!identity) return;

    try {
      // Basic JSON validation
      if (cookieJson().trim()) {
         JSON.parse(cookieJson());
      }
      
      await invoke('update_identity_cookies', {
        id: identity.id,
        cookiesJson: cookieJson().trim() || null
      });
      
      setIsCookieModalOpen(false);
      refetch();
    } catch (e) {
      console.error(e);
      alert("Invalid JSON format or save failed: " + e);
    }
  };

  const renderTable = (data: any[], type: 'account' | 'api_key') => (
    <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-secondary/40 text-muted-foreground uppercase text-xs font-mono tracking-wider border-b border-border/50">
            <tr>
               <th class="px-6 py-4 font-medium">{type === 'account' ? t('identities.table.platform') : t('identities.table.provider')}</th>
               <th class="px-6 py-4 font-medium">{t('identities.table.purpose')}</th>
               <th class="px-6 py-4 font-medium">{type === 'account' ? t('identities.table.username') : t('identities.table.key_prefix')}</th>
               <th class="px-6 py-4 font-medium">{t('identities.table.status')}</th>
               <th class="px-6 py-4 font-medium">{t('identities.table.last_used')}</th>
               <th class="px-6 py-4 font-medium text-right">{t('identities.table.actions')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/30">
             <Show when={data && data.length === 0}>
               <tr>
                 <td colspan="6" class="px-6 py-12 text-center text-muted-foreground border-dashed border-b border-border/50">
                   {type === 'account' ? t('identities.empty_accounts') : t('identities.empty_apikeys')}
                 </td>
               </tr>
             </Show>
             <For each={data}>
              {(item: any) => {
                const platformInfo = type === 'account' ? PLATFORMS.find(p => p.id === item.platform) : null;
                const platformName = platformInfo ? platformInfo.name : item.platform;
                const platformIcon = type === 'account' ? getPlatformIcon(item.platform) : '';
                const hasCookies = type === 'account' && item.session_cookies && item.session_cookies.length > 5;

                return (
                  <tr class="hover:bg-muted/10 transition-colors group">
                    <td class="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      {type === 'account' ? (
                        <span class="text-lg w-5 h-5 flex items-center justify-center">{platformIcon}</span>
                      ) : (
                        <KeyRound class="w-4 h-4 text-emerald-500 opacity-70" />
                      )}
                      {platformName}
                    </td>
                    <td class="px-6 py-4 text-muted-foreground">{item.purpose || t('common.automation')}</td>
                    <td class="px-6 py-4 font-mono text-muted-foreground">
                       <div class="flex items-center gap-2">
                         <span>{item.username}</span>
                         <button onClick={() => handleCopy(item.id, item.username)} class="text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                           <Copy class="w-3 h-3" />
                         </button>
                       </div>
                    </td>
                    <td class="px-6 py-4">
                       <span class={cn(
                         "flex items-center gap-1.5 px-2 py-1 rounded w-fit text-[10px] font-bold tracking-wide uppercase border",
                         hasCookies || item.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                       )}>
                         {hasCookies || item.status === 'active' ? <RefreshCw class="w-3 h-3" /> : <Lock class="w-3 h-3" />}
                         {hasCookies ? "Cookies Active" : t(`common.status.${item.status || 'encrypted'}`)}
                       </span>
                    </td>
                    <td class="px-6 py-4 text-muted-foreground text-xs">{item.lastUsed || t('common.never')}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {type === 'account' && (
                            <button 
                              onClick={() => handleOpenCookieModal(item)}
                              class={cn(
                                "p-2 rounded transition-colors border",
                                hasCookies 
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border-transparent"
                              )}
                              title="Manage Cookies"
                            >
                              <Cookie class="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(item.id)}
                            class="p-2 bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors border-transparent border hover:border-destructive/30"
                            title={t('common.actions.delete')}
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </div>
                    </td>
                  </tr>
                );
              }}
             </For>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <MainLayout>
       <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
          {/* 页头 */}
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck class="w-6 h-6 text-primary" />
                {t('identities.title')}
              </h2>
              <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
                Manage your cross-platform accounts, cookies, and API keys securely in the local vault.
              </p>
            </div>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(114,46,209,0.3)]"
            >
              <Plus class="w-4 h-4" />
              {t('identities.add_identity')}
            </button>
          </div>

          {/* 选项卡 */}
          <div class="flex items-center justify-between mt-8 mb-4">
             <div class="flex bg-secondary/50 p-1 rounded-md border border-border/50">
               <button 
                 onClick={() => setActiveTab('accounts')}
                 class={cn(
                   "px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2",
                   activeTab() === 'accounts' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 <Users class="w-4 h-4" />
                 {t('identities.tabs.accounts')}
               </button>
               <button 
                 onClick={() => setActiveTab('api_keys')}
                 class={cn(
                   "px-4 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-2",
                   activeTab() === 'api_keys' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 <KeyRound class="w-4 h-4" />
                 {t('identities.tabs.api_keys')}
               </button>
             </div>

             {/* 搜索 */}
             <div class="flex items-center gap-2 text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-md border border-border/50 transition-colors focus-within:border-primary/50 w-64">
                <Search class="w-4 h-4 flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder={t('identities.search')} 
                  class="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/50 font-mono"
                />
             </div>
          </div>

          {/* 表格区域 */}
          <div class="transition-all duration-300">
             {activeTab() === 'accounts' ? renderTable(identities() || [], 'account') : renderTable(apiKeys, 'api_key')}
          </div>
       </div>

       {/* 添加凭证弹窗 */}
       {isAddModalOpen() && (
        <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/10">
              <h3 class="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-primary" />
                {t('identities.modal.title')}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} class="text-muted-foreground hover:text-foreground transition-colors text-xl">
                &times;
              </button>
            </div>
            
            <div class="p-6 space-y-4">
              <div class="bg-primary/10 border border-primary/20 p-3 rounded-lg flex gap-3 text-sm text-primary mb-2">
                <Lock class="w-5 h-5 shrink-0 mt-0.5" />
                <p>{t('identities.modal.danger_desc')}</p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</label>
                <select 
                  value={newPlatformId()} 
                  onChange={(e) => setNewPlatformId(e.target.value)} 
                  class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all appearance-none"
                >
                  <option value="" disabled selected>Select a platform...</option>
                  <For each={PLATFORMS}>
                    {(platform) => (
                      <option value={platform.id}>{platform.icon} {platform.name}</option>
                    )}
                  </For>
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('identities.modal.username')}</label>
                <input type="text" value={newUsername()} onInput={(e) => setNewUsername(e.target.value)} placeholder={t('identities.modal.username_holder')} class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all" />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>{t('identities.modal.secret')}</span>
                  <span class="text-[10px] text-emerald-500 font-normal flex items-center gap-1"><Lock class="w-3 h-3" /> {t('identities.modal.encryption')}</span>
                </label>
                <input type="password" value={newSecret()} onInput={(e) => setNewSecret(e.target.value)} placeholder={t('identities.modal.secret_holder')} class="w-full bg-secondary/30 border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all font-mono" />
              </div>
            </div>
            <div class="px-6 py-4 border-t border-border/50 bg-secondary/5 flex justify-end gap-3">
              <button onClick={() => setIsAddModalOpen(false)} class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                {t('identities.modal.cancel')}
              </button>
              <button onClick={handleSave} class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)]">
                {t('identities.modal.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie 管理弹窗 */}
      {isCookieModalOpen() && selectedIdentityForCookie() && (
        <div class="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/10 shrink-0">
              <h3 class="font-semibold text-foreground flex items-center gap-2">
                <Cookie class="w-4 h-4 text-emerald-500" />
                Manage Session Cookies
              </h3>
              <button onClick={() => setIsCookieModalOpen(false)} class="text-muted-foreground hover:text-foreground transition-colors text-xl">
                &times;
              </button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div class="flex items-center gap-3 mb-2">
                 <span class="text-2xl">{getPlatformIcon(selectedIdentityForCookie()?.platform)}</span>
                 <div>
                   <h4 class="font-medium text-foreground">{PLATFORMS.find(p => p.id === selectedIdentityForCookie()?.platform)?.name || selectedIdentityForCookie()?.platform}</h4>
                   <p class="text-xs text-muted-foreground font-mono">{selectedIdentityForCookie()?.username}</p>
                 </div>
              </div>

              <div class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-sm text-blue-400">
                Paste JSON array exported from extensions like EditThisCookie. VeilBrowser will automatically inject these cookies when launching tasks for this identity to bypass login.
              </div>

              <div class="flex-1 flex flex-col min-h-[200px]">
                <label class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex justify-between">
                  <span>Cookie JSON</span>
                  <span class="text-[10px] text-muted-foreground/70 normal-case">Array format required: [{`{"name": "...", "value": "..."}`}]</span>
                </label>
                <textarea 
                  value={cookieJson()} 
                  onInput={(e) => setCookieJson(e.target.value)} 
                  placeholder="[\n  {\n    &#34;domain&#34;: &#34;.twitter.com&#34;,\n    &#34;name&#34;: &#34;auth_token&#34;,\n    &#34;value&#34;: &#34;...&#34;\n  }\n]" 
                  class="flex-1 w-full bg-[#0a0a0a] border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-4 text-xs text-emerald-400 outline-none transition-all font-mono resize-none" 
                  spellcheck={false}
                />
              </div>
            </div>

            <div class="px-6 py-4 border-t border-border/50 bg-secondary/5 flex justify-between items-center shrink-0">
              <button onClick={() => setCookieJson('')} class="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1">
                Clear All
              </button>
              <div class="flex gap-3">
                <button onClick={() => setIsCookieModalOpen(false)} class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveCookies} class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(114,46,209,0.3)]">
                  Save Cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Identities;
