import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { Terminal, Plus, Folder, FileCode, Play, Edit3, Trash2, X, Save, Bot } from 'lucide-solid';
import { cn } from '../lib/utils';

interface SkillParameter {
  name: string;
  description: string;
}

interface SkillStep {
  index: number;
  intent: string;
}

interface SkillScript {
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  steps: SkillStep[];
  raw_markdown: string;
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  script: SkillScript;
}

const Skills: Component = () => {
  const { t } = useTranslation();
  
  const [skills, setSkills] = createSignal<SkillInfo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedCategory, setSelectedCategory] = createSignal<string>('All');
  
  const [isEditorOpen, setIsEditorOpen] = createSignal(false);
  const [editingSkill, setEditingSkill] = createSignal<Partial<SkillInfo> | null>(null);
  const [markdownContent, setMarkdownContent] = createSignal("");

  const loadSkills = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const res = await invoke<SkillInfo[]>('get_skills');
      
      if (res.length === 0) {
        setSkills([
          {
            id: 'xiaohongshu/post',
            name: '小红书自动发图文',
            description: '自动登录小红书，输入标题内容并上传图片，最后完成发布。',
            category: '小红书套件',
            script: {
              name: '小红书自动发图文',
              description: '自动登录小红书，输入标题内容并上传图片，最后完成发布。',
              category: '小红书套件',
              parameters: [
                { name: 'title', description: '字符串' },
                { name: 'content', description: '长文本' }
              ],
              steps: [
                { index: 1, intent: '打开 creator.xiaohongshu.com' },
                { index: 2, intent: '点击上传图片' }
              ],
              raw_markdown: '# 技能: 小红书发文\n\n## 步骤\n1. 打开发文页\n2. 点击发布'
            }
          },
          {
            id: 'twitter/like',
            name: '推特自动养号',
            description: '模拟人类滚动推文，随机点赞和停留。',
            category: 'Twitter自动化套件',
            script: {
              name: '推特自动养号',
              description: '...',
              category: 'Twitter自动化套件',
              parameters: [],
              steps: [],
              raw_markdown: ''
            }
          }
        ]);
      } else {
        setSkills(res);
      }
    } catch (e) {
      console.error("Failed to load skills", e);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadSkills();
  });

  const categories = () => {
    const cats = new Set(skills().map(s => s.category));
    return ['All', ...Array.from(cats)];
  };

  const filteredSkills = () => {
    if (selectedCategory() === 'All') return skills();
    return skills().filter(s => s.category === selectedCategory());
  };

  const openEditor = (skill?: SkillInfo) => {
    if (skill) {
      setEditingSkill(skill);
      setMarkdownContent(skill.script.raw_markdown);
    } else {
      setEditingSkill({ name: t('skills.editor.new_skill_name'), category: t('skills.editor.new_skill_category') });
      setMarkdownContent(t('skills.editor.new_skill_template'));
    }
    setIsEditorOpen(true);
  };

  const saveSkill = async () => {
    try {
      const cat = editingSkill()?.category || 'Uncategorized';
      const file = editingSkill()?.name || 'new_skill';
      
      await invoke('save_skill', {
        categorySlug: cat,
        fileName: file.replace(/\s+/g, '_').toLowerCase(),
        markdown: markdownContent()
      });
      
      setIsEditorOpen(false);
      loadSkills(); 
    } catch (e) {
      console.error(e);
      alert(t('skills.save_failed') + ": " + e);
    }
  };

  const runSkill = async (skill: SkillInfo) => {
    try {
      await invoke('run_skill', {
        skillId: skill.id
      });
      alert(`${t('skills.execution_complete')}: ${skill.name}`);
    } catch (e) {
      console.error(e);
      alert(`${t('skills.dynamic_inference_warning')} ${e}`);
    }
  };

  return (
    <MainLayout>
      <div class="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 relative">
        
        {/* 页头 */}
        <div class="flex items-center justify-between shrink-0 mb-6">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Terminal class="w-6 h-6 text-primary" />
              {t('skills.title')}
            </h2>
            <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t('skills.description')}
            </p>
          </div>
          
          <button 
            onClick={() => openEditor()}
            class="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(114,46,209,0.3)]"
          >
            <Plus class="w-4 h-4" />
            {t('skills.new_skill')}
          </button>
        </div>

        {/* 主内容区域 */}
        <div class="flex-1 flex gap-6 overflow-hidden">
          
          {/* 左侧栏：技能包分类 */}
          <div class="w-64 flex flex-col bg-card border border-border rounded-lg shadow-sm">
            <div class="p-4 border-b border-border/50">
              <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Folder class="w-4 h-4 text-muted-foreground" />
                {t('skills.packs')}
              </h3>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <For each={categories()}>
                {(cat) => (
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    class={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-left",
                      selectedCategory() === cat
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <Folder class={cn("w-4 h-4", selectedCategory() === cat ? "text-primary fill-primary/20" : "")} />
                    <span class="truncate">{cat === 'All' ? t('skills.all_categories') : cat}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* 右侧主区域：技能卡片网格 */}
          <div class="flex-1 bg-card/40 border border-border rounded-lg p-6 overflow-y-auto">
            <Show when={!loading()} fallback={<div class="flex items-center justify-center h-full text-muted-foreground animate-pulse">{t('skills.status.scanning')}</div>}>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={filteredSkills()}>
                  {(skill) => (
                    <div class="group relative flex flex-col bg-background border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(114,46,209,0.1)] transition-all duration-300">
                      
                      <div class="flex justify-between items-start mb-3">
                        <div class="p-2 bg-primary/10 rounded-lg shrink-0">
                          <FileCode class="w-5 h-5 text-primary" />
                        </div>
                        <span class="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 border border-emerald-500/20">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {t('skills.status.ready')}
                        </span>
                      </div>
                      
                      <div class="flex-1">
                        <h4 class="font-bold text-base text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">{skill.name}</h4>
                        <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                          {skill.description}
                        </p>
                      </div>

                      <div class="flex flex-wrap gap-2 mt-4 mb-5">
                        <Show when={skill.script?.parameters?.length > 0}>
                          <span class="px-2 py-1 bg-secondary text-secondary-foreground text-[10px] rounded-md border border-border/50 font-mono">
                            {t('skills.card.params', { count: skill.script.parameters.length })}
                          </span>
                        </Show>
                        <span class="px-2 py-1 bg-secondary text-secondary-foreground text-[10px] rounded-md border border-border/50 font-mono">
                          {t('skills.card.cached')}
                        </span>
                      </div>

                      <div class="flex items-center gap-2 pt-3 border-t border-border/50">
                        <button 
                          onClick={() => runSkill(skill)}
                          class="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground py-1.5 rounded transition-colors text-xs font-semibold"
                        >
                          <Play class="w-3.5 h-3.5" /> {t('skills.card.run')}
                        </button>
                        <button 
                          onClick={() => openEditor(skill)}
                          class="w-8 h-8 flex items-center justify-center bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                        >
                          <Edit3 class="w-3.5 h-3.5" />
                        </button>
                        <button class="w-8 h-8 flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors">
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>

      </div>

      {/* 技能编辑器抽屉 */}
      <Show when={isEditorOpen()}>
        <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end transition-all">
          <div class="w-[800px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div class="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div class="flex items-center gap-3">
                <div class="p-1.5 bg-primary/20 rounded-md">
                  <Terminal class="w-4 h-4 text-primary" />
                </div>
                <h3 class="font-bold text-foreground">{t('skills.editor.title')}</h3>
              </div>
              <button onClick={() => setIsEditorOpen(false)} class="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex-1 flex flex-col p-4 overflow-hidden gap-4">
              
              <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 text-sm">
                <Bot class="w-5 h-5 text-blue-400 shrink-0" />
                <div class="text-blue-200">
                  <p class="font-semibold text-blue-400 mb-1">{t('skills.editor.cache_title')}</p>
                  <p class="text-xs leading-relaxed opacity-90">{t('skills.editor.cache_desc')}</p>
                </div>
              </div>

              <div class="flex-1 flex flex-col bg-[#1e1e1e] rounded-lg border border-border shadow-inner overflow-hidden">
                 <div class="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-black/40 text-xs font-mono text-gray-400">
                    <FileCode class="w-3.5 h-3.5" />
                    <span>{editingSkill()?.name ? `skills/${editingSkill()?.name}.md` : 'untitled.md'}</span>
                 </div>
                 <textarea 
                    value={markdownContent()}
                    onInput={(e) => setMarkdownContent(e.currentTarget.value)}
                    class="flex-1 w-full bg-transparent text-gray-300 font-mono text-sm p-4 resize-none outline-none leading-relaxed"
                    spellcheck={false}
                 />
              </div>
            </div>

            <div class="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditorOpen(false)}
                class="px-4 py-2 hover:bg-secondary rounded-md text-sm font-medium transition-colors"
              >
                {t('skills.editor.cancel')}
              </button>
              <button 
                onClick={saveSkill}
                class="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-primary/20"
              >
                <Save class="w-4 h-4" />
                {t('skills.editor.save')}
              </button>
            </div>
            
          </div>
        </div>
      </Show>

    </MainLayout>
  );
};

export default Skills;
