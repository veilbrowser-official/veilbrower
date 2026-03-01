# 浏览器嵌入实现指南

## 📋 概述

本文档说明如何在 Dashboard 中嵌入浏览器实例，以及如何实现拖拽分离功能。

## 🎯 实现方案

### 方案1: Electron webview 标签（当前实现）

**优点：**
- 实现简单
- 原生支持
- 性能好

**缺点：**
- 需要启用 `webviewTag: true`
- 安全性考虑（需要 CSP）

**实现步骤：**

1. **主进程启用 webviewTag**

```typescript
// src/main/windows/mainWindow.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    webviewTag: true, // ✅ 启用 webview 标签
    // ...
  },
});
```

2. **渲染进程使用 webview 标签**

```tsx
// src/renderer/components/EmbeddedBrowser/EmbeddedBrowser.tsx
<webview
  src="about:blank"
  style={{ width: '100%', height: '100%' }}
  onDidFinishLoad={handleLoad}
/>
```

3. **加载浏览器内容**

```typescript
// 获取浏览器窗口的 URL
const browserUrl = await getBrowserUrl(profileId);
webviewRef.current.src = browserUrl;
```

### 方案2: BrowserView（推荐，更灵活）

**优点：**
- 更灵活的控制
- 更好的性能
- 支持拖拽分离

**缺点：**
- 实现复杂
- 需要主进程支持

**实现步骤：**

1. **主进程创建 BrowserView**

```typescript
// src/main/ipc/handlers/browser/embed.handler.ts
const view = new BrowserView({
  webPreferences: {
    // 使用 Profile 的 userDataPath
    partition: `persist:${profileId}`,
  },
});

// 设置 BrowserView 的位置和大小
mainWindow.setBrowserView(view);
view.setBounds({ x: 0, y: 0, width: 800, height: 600 });
```

2. **渲染进程通过 IPC 控制**

```typescript
// 创建 BrowserView
await window.electron.createBrowserView(profileId, mainWindowId);

// 分离 BrowserView
await window.electron.detachBrowser(profileId);
```

## 🔧 当前实现状态

### ✅ 已完成

1. **EmbeddedBrowser 组件**：框架已实现
2. **IPC Handlers**：浏览器嵌入相关 handlers 已实现
3. **CDP 服务**：热更新服务框架已实现

### ⏳ 待完善

1. **webview 标签支持**：需要在主进程启用 `webviewTag: true`
2. **BrowserView 实现**：需要完善 BrowserView 的创建和管理
3. **拖拽分离**：需要实现拖拽分离成独立窗口的功能

## 📝 使用示例

### 在 Dashboard 中使用

```tsx
<EmbeddedBrowser
  profileId={profileId}
  embedded={browserEmbedded}
  onDetach={() => setBrowserEmbedded(false)}
/>
```

### 分离浏览器窗口

```typescript
const handleDetach = async () => {
  if (window.electron) {
    await window.electron.detachBrowser(profileId);
    setBrowserEmbedded(false);
  }
};
```

## 🐛 已知问题

1. **webview 标签**：需要主进程启用 `webviewTag: true`
2. **BrowserView**：需要获取浏览器窗口的 webContentsId
3. **拖拽分离**：需要实现窗口管理逻辑

## 🎯 下一步

1. 在主进程启用 `webviewTag: true`
2. 完善 BrowserView 的创建和管理
3. 实现拖拽分离功能

---

**版本**：v2.0.0-beta  
**最后更新**：2025-01-XX

