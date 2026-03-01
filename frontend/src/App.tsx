import { Component, onMount } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { invoke } from '@tauri-apps/api/core';
import Dashboard from './pages/Dashboard';
import ProxyManager from './pages/ProxyManager';
import Identities from './pages/Identities';
import Extensions from './pages/Extensions';
import TaskRuns from './pages/TaskRuns';
import Contexts from './pages/Contexts';
import Artifacts from './pages/Artifacts';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Skills from './pages/Skills';


// 404 页面
const NotFound = () => <div class="p-10 text-center text-muted-foreground">页面未找到 (Page Not Found)</div>;

const App: Component = () => {
  onMount(() => {
    // 稍微等待以确保 Tailwind 类和暗黑模式主题已解析，防止白屏闪烁
    setTimeout(() => {
      invoke('close_splashscreen').catch(console.error);
    }, 200);
  });

  return (
    <Router>
      {/* 中枢调度 */}
      <Route path="/" component={Dashboard} />
      <Route path="/taskruns" component={TaskRuns} />
      
      {/* 核心能力 */}
      <Route path="/skills" component={Skills} />

      {/* 基础设施 */}
      <Route path="/contexts" component={Contexts} />
      <Route path="/proxies" component={ProxyManager} />
      <Route path="/extensions" component={Extensions} />
      
      {/* 业务资产 */}
      <Route path="/identities" component={Identities} />
      <Route path="/artifacts" component={Artifacts} />
      
      {/* 系统配置 */}
      <Route path="/logs" component={Logs} />
      <Route path="/settings" component={Settings} />
      
      <Route path="*404" component={NotFound} />
    </Router>
  );
};

export default App;
