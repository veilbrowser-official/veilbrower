# Event System Integrity Fix Report

## 核心问题

用户指出 `workflow:log` 用途不明，且质疑 `Task` 和 `Action` 事件的完整性。
经排查，确实存在以下问题：
1.  **Action 事件缺失**：Worker 在执行原子 Action 时，未发送任何事件，导致 UI 无法展示细粒度进度。
2.  **Bridge 策略僵化**：`TaskDispatcher` 使用硬编码白名单过滤 IPC 消息，导致新事件无法通过。

## 修复内容

### 1. 补全 Worker 事件发送 (`TaskExecutor.ts`)
在 `executeTask` 的 Action 循环中，新增了两个关键事件点位：
*   **Action 开始前**：发送 `action:started` (包含 actionId, type, index)。
*   **Action 结束后**：发送 `action:status-changed` (包含 duration, status, result/error)。

### 2. 优化 IPC 桥接策略 (`TaskDispatcher.service.ts`)
将 `setupEventBridge` 的过滤逻辑从“白名单”升级为“前缀匹配”：
*   **旧逻辑**：`['task:progress', ...].includes(msg.type)`
*   **新逻辑**：`msg.type.startsWith('task:') || .startsWith('action:') || .startsWith('workflow:')`

## 事件体系现状

现在，整个工作流执行的事件体系已完整覆盖 L5-L7 各个层级，并已融入统一事件总线：

| 层级 | 事件前缀 | 包含事件 | 用途 |
| :--- | :--- | :--- | :--- |
| **Workflow (L6)** | `workflow:` | `started`, `progress`, `log`, `step-completed` | 宏观流程控制与用户日志 |
| **Task (L5)** | `task:` | `started`, `progress`, `status-changed`, `failed` | 任务单元生命周期 |
| **Action (L5b)** | `action:` | `started`, `status-changed` | **(新增)** 原子操作级实时反馈 |

此变更确保了前端可以实现“像素级”的实时执行可视化。
