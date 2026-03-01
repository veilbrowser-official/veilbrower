# Workflow Event Feedback Bridge Fix

## 问题描述

用户反馈工作流执行的事件反馈链路似乎是断裂的，UI 无法收到 `WorkflowMonitor` 的进度更新。同时对 RPC 与事件流程的关系感到困惑。

## 原因分析

1.  **架构断层**：项目从 EventBus 迁移到 RPC (`WorkerRPC`) 架构时，只完成了“控制指令”的迁移。
    *   **RPC 负责**：发送任务 (`executeTask`)，等待最终结果。
    *   **缺失部分**：Worker 在执行过程中通过 IPC 发回的 `task:progress` 等中间状态消息，**没有被主进程捕获并转发**。
2.  **监听错位**：业务层的 `MonitorService` 依然监听 `AppEventBus`，但底层通信层 (`ProcessCommunicator`) 收到消息后没有透传给 `AppEventBus`。

## 修复内容

修改了 `src/main/execution/services/task-dispatcher.service.ts`：

1.  **新增 `setupEventBridge` 方法**：
    *   在 `TaskDispatcher` 初始化时，订阅 `processCommunicator.onMessage`。
    *   筛选出工作流相关事件 (`task:progress`, `task:status-changed`, `workflow:log`)。
2.  **事件转发**：
    *   将收到的 IPC 消息直接 `emit` 到 `AppEventBus`。
    *   打通了 `Worker Process` -> `IPC` -> `TaskDispatcher` -> `AppEventBus` -> `MonitorService` 的完整链路。

## 架构澄清

*   **RPC**：用于**控制流**（开始/停止/获取最终结果）。
*   **Events**：用于**数据流**（实时进度/日志/遥测）。
*   本次修复确保了两者在 L5 执行层的正确协同。
