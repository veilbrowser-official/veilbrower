# VEA v2.0 Migration Report

## 执行摘要

响应“全方位重构”的号召，我们对 VeilBrowser 的事件架构进行了彻底的标准化升级（VEA v2.0）。
本次重构的核心目标是**消除事件语义冗余**，建立以 **状态机 (State Machine)** 为核心的通信机制。

## 变更详情

### 1. Worker 层 (L5 Execution)
*   **文件**: `src/processes/execution/TaskExecutor.ts`
*   **变更**:
    *   移除 `task:started` 事件发送，替换为 `task:status-changed { from: 'pending', to: 'running' }`。
    *   移除 `action:started` 事件发送，替换为 `action:status-changed { from: 'pending', to: 'running' }`。
    *   **收益**: 保证了 Worker 输出的事件流纯净、统一，符合 K8s/Temporal 等业界标准。

### 2. Main 层 (L6 Orchestration)
*   **文件**: `src/main/workflow/application/monitor.service.ts`
*   **变更**:
    *   新增监听 `TaskEvents.STATUS_CHANGED`。
    *   实现了基于状态变更的进度更新逻辑（Completed -> 100%, Failed -> Marked Done）。
    *   **收益**: 修复了“任务完成后进度条卡在 99%”的潜在 Bug（因为之前没监听完成事件）。

### 3. Renderer 层 (UI Hooks)
*   **文件**: `src/renderer/hooks/useUIEventManager.ts`
*   **变更**:
    *   为 `useTaskEvents` 增加了 **Adapter 层**。
    *   当组件请求 `onStarted/onCompleted/onFailed` 时，自动订阅底层的 `status-changed` 事件并过滤状态。
    *   **收益**: 前端组件代码无需任何修改，即可享受新架构带来的红利，实现了无痛迁移。

### 4. 规范层
*   **文件**: `src/shared/events/constants.ts`
*   **变更**: 将所有非 `STATUS_CHANGED/PROGRESS` 的生命周期事件标记为 `@deprecated`。

## 后续建议

虽然系统已兼容运行，但建议在后续开发中：
1.  前端新组件直接使用 `useTaskEvents().onStatusChanged`。
2.  逐步清理后端其他模块（如 JobCenter）中的旧事件发送逻辑。
