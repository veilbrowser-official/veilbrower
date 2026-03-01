import { Component, For, Show, createResource, createSignal } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { FolderOpen, Download, FileText, Image, Search, Trash2, Clock, Database, Eye, X, FileJson } from 'lucide-solid';

interface Artifact {
  id: string;
  session_id: string;
  type: string;
  storage_path: string;
  created_at: string | null;
}

const Artifacts: Component = () => {
  const { t } = useTranslation();

  const [artifacts, { refetch }] = createResource<Artifact[]>(async () => {
    try {
      const res: Artifact[] = await invoke('fetch_artifacts');
      if (res.length === 0) {
        // 演示用的 Mock 数据
        return [
          {
            id: "art_8x99as1",
            session_id: "CTX-XYZ99A",
            type: "screenshot",
            storage_path: "mock_screenshot.png",
            created_at: new Date().toISOString()
          },
          {
            id: "art_3b22xc4",
            session_id: "CTX-XYZ99A",
            type: "report",
            storage_path: "mock_data.json",
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ];
      }
      return res;
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  const [previewItem, setPreviewItem] = createSignal<Artifact | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await invoke('remove_artifact', { id });
      refetch();
    } catch (e) {
      console.error(e);
      alert(t('artifacts.delete_failed') + ": " + e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Image class="w-4 h-4" />;
      case 'report': return <FileText class="w-4 h-4" />;
      default: return <Database class="w-4 h-4" />;
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
        {/* 页头 */}
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderOpen class="w-6 h-6 text-primary" />
              {t('artifacts.title')}
            </h2>
            <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t('artifacts.description')}
            </p>
          </div>
        </div>

        {/* 搜索与过滤 */}
        <div class="flex items-center gap-2 text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border/50 transition-colors focus-within:border-primary/50 w-full md:w-96">
          <Search class="w-4 h-4 flex-shrink-0" />
          <input 
            type="text" 
            placeholder={t('artifacts.search_placeholder')} 
            class="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground/50 font-mono"
          />
        </div>

        {/* 工件列表 */}
        <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="bg-secondary/40 text-muted-foreground uppercase text-xs font-mono tracking-wider border-b border-border/50">
                <tr>
                  <th class="px-6 py-4 font-medium">{t('artifacts.table.filename')}</th>
                  <th class="px-6 py-4 font-medium">{t('artifacts.table.source_task')}</th>
                  <th class="px-6 py-4 font-medium">{t('artifacts.table.format')}</th>
                  <th class="px-6 py-4 font-medium">{t('artifacts.table.created_at')}</th>
                  <th class="px-6 py-4 font-medium text-right">{t('artifacts.table.actions')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/30">
                <Show when={!artifacts.loading && artifacts()?.length === 0}>
                   <tr>
                     <td colspan="5" class="px-6 py-12 text-center text-muted-foreground border-dashed border-b border-border/50">
                       {t('artifacts.empty')}
                     </td>
                   </tr>
                </Show>
                <For each={artifacts()}>
                  {(item) => (
                    <tr class="hover:bg-muted/10 transition-colors group">
                      <td class="px-6 py-4 text-foreground flex items-center gap-3">
                        <div class="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                          {getIcon(item.type)}
                        </div>
                        <span class="font-medium">{item.storage_path.split('/').pop() || item.id}</span>
                      </td>
                      <td class="px-6 py-4">
                        <span class="font-mono text-xs bg-secondary/80 px-2 py-1 rounded text-muted-foreground border border-border/50">
                          {item.session_id.substring(0, 8)}...
                        </span>
                      </td>
                      <td class="px-6 py-4 text-muted-foreground">
                        <span class="uppercase tracking-wide">{item.type}</span>
                      </td>
                      <td class="px-6 py-4 text-muted-foreground text-xs flex items-center gap-1.5 pt-5">
                        <Clock class="w-3 h-3" /> {item.created_at ? new Date(item.created_at).toLocaleString() : t('common.never')}
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setPreviewItem(item)}
                            class="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground rounded transition-colors" title={t('artifacts.actions.preview')}>
                            <Eye class="w-4 h-4" />
                          </button>
                          <button class="p-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-emerald-400 rounded transition-colors" title={t('artifacts.actions.download')}>
                            <Download class="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            class="p-2 bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors border-transparent border hover:border-destructive/30" title={t('artifacts.actions.delete')}>
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

      {/* 预览弹窗 */}
      <Show when={previewItem()}>
        <div class="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 xl:p-12 animate-in fade-in duration-200">
          <div class="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div class="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/10 shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(114,46,209,0.3)] border border-primary/30">
                  {getIcon(previewItem()!.type)}
                </div>
                <div>
                  <h3 class="font-bold text-foreground tracking-tight text-lg">
                    {previewItem()!.storage_path.split('/').pop() || previewItem()!.id}
                  </h3>
                  <span class="text-xs font-mono text-muted-foreground">Session ID: {previewItem()!.session_id}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button class="flex items-center gap-2 bg-secondary/50 hover:bg-secondary border border-border/50 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Download class="w-4 h-4" /> {t('artifacts.actions.export')}
                </button>
                <button onClick={() => setPreviewItem(null)} class="p-2 bg-secondary/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors rounded-lg">
                  <X class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div class="flex-1 bg-[#0f111a] flex overflow-hidden relative inner-shadow-black justify-center items-center">
               <div class="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none"></div>
               
               {previewItem()?.type === 'screenshot' ? (
                 <div class="w-full h-full p-8 flex items-center justify-center">
                    <div class="relative max-w-full max-h-full border-4 border-black/40 rounded-lg shadow-2xl overflow-hidden group">
                      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="font-mono text-white/80 text-xs">{t('artifacts.preview.captured_at')}: {previewItem()?.created_at ? new Date(previewItem()!.created_at!).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div class="w-[800px] h-[500px] bg-gradient-to-br from-indigo-950 via-purple-900 to-black flex flex-col items-center justify-center text-white/40">
                         <Image class="w-16 h-16 mb-4 opacity-50" />
                         <span class="font-mono">{t('artifacts.preview.placeholder')}</span>
                         <span class="text-xs mt-2 opacity-50">Storage: {previewItem()?.storage_path}</span>
                      </div>
                    </div>
                 </div>
               ) : (
                 <div class="w-full h-full flex flex-col p-6">
                    <div class="bg-black/40 border border-white/10 rounded-t-lg px-4 py-2 flex items-center gap-2">
                       <FileJson class="w-4 h-4 text-emerald-400" />
                       <span class="font-mono text-xs text-muted-foreground">{t('artifacts.preview.extracted_properties')}</span>
                    </div>
                    <textarea 
                      readOnly 
                      class="flex-1 w-full bg-black/60 border-x border-b border-white/10 rounded-b-lg p-4 font-mono text-sm text-emerald-400/90 leading-relaxed outline-none resize-none"
                      value={JSON.stringify({ 
                        target_url: "https://x.com/elonmusk", 
                        execution_time_ms: 3450, 
                        extracted_data: { 
                          followers_count: "174M+", 
                          latest_tweet: "X is the everything app",
                          status: "Liked successfully"
                        } 
                      }, null, 2)}
                    />
                 </div>
               )}
            </div>
          </div>
        </div>
      </Show>

    </MainLayout>
  );
};

export default Artifacts;
