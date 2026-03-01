# 01-ipc-model.md - 进程间通信模型

VeilBrowser 采用高效的多进程架构，各进程间通过 Electron 原生 IPC 和 Node.js 子进程 IPC 进行通信。**项目已彻底淘汰 ZMQ 通信方案。**

## 1. 进程拓扑

*   **Main Process (主进程)**: 核心枢纽，负责调度、数据库、安全校验。
*   **Renderer Process (渲染进程)**: Dashboard UI，负责用户交互和工作流编排 (L6)。
*   **Worker Process (子进程/执行器)**: 由主进程 spawn 出来的独立 Node.js 进程，负责 Playwright 执行。

## 2. 通信协议

### 2.1 Main ↔ Renderer (原生 IPC)
使用 Electron 的 `ipcMain` 和 `ipcRenderer` (通过 `contextBridge` 暴露)。
*   **模式**: Request/Response (Handle/Invoke) 或 One-way (Send)。
*   **职责**: Profile 管理、工作流提交、全局配置更新。

### 2.2 Main ↔ Worker (Node.js IPC)
通过 `child_process.spawn` 的 `stdio: ['inherit', 'inherit', 'inherit', 'ipc']` 建立连接。
*   **模式**: 双向 JSON 消息。
*   **职责**:
    *   主进程分发任务 (Layer 5a)。
    *   Worker 返回执行状态、截图数据、Cookie 变更。
*   **优势**: 相比 ZMQ，原生 IPC 性能损耗极低，无需管理复杂的端口和连接。

## 3. 核心机制

### 3.1 统一消息格式
所有 IPC 消息遵循以下结构：
```json
{
  "type": "event_or_command",
  "payload": { ... },
  "metadata": {
    "traceId": "uuid-v4",
    "profileId": "p-123",
    "timestamp": 123456789
  }
}
```

### 3.2 链路追踪 (Traceability)
所有跨进程通信必须携带 `traceId`，确保从 UI 操作到浏览器底层执行的日志可以被完整串联。

## 4. 安全性
*   **contextBridge**: 渲染进程无法直接访问 Node.js 内置模块。
*   **参数验证**: 主进程在处理 IPC 请求前必须进行严格的类型校验。
*   **权限隔离**: Worker 进程只拥有执行任务所需的最小权限。
