# 统一事件架构规范 (VEA v2.0)

> **核心原则**：单一事实来源 (Single Source of Truth) —— 状态变更只有一种表达方式。

## ⚠️ 废弃警告

旧的生命周期事件（如 `TASK_STARTED`, `TASK_COMPLETED`, `TASK_FAILED`）已被标记为 **Deprecated**。请在后续开发中逐步迁移到 v2.0 标准。

---

## 1. 核心设计理念：状态机驱动 (FSM)

在分布式系统（Electron 多进程架构）中，为了避免状态不一致和通信冗余，我们采用 **Kubernetes / Temporal** 风格的事件模型：

*   ❌ **反模式 (Discrete Lifecycle Events)**：
    *   发送 `started`
    *   发送 `completed`
    *   发送 `failed`
    *   *缺点：逻辑分散，容易出现“发了 failed 却没更新 DB 状态”的情况。*

*   ✅ **最佳实践 (State Transition Events)**：
    *   只发送 **`status-changed`**
    *   载荷包含 `{ from: 'running', to: 'failed', error: '...' }`
    *   *优点：原子性，接收端只需处理这一种消息即可重建完整状态。*

---

## 2. 标准事件三元组

对于任何可执行实体（Workflow / Task / Action / Job），仅保留以下三类事件：

### 2.1. 状态变更 (`*:status-changed`)

唯一负责生命周期流转的事件。

*   **Topic**: `task:status-changed` / `workflow:status-changed`
*   **Payload 规范**:
    ```typescript
    interface StatusChangedEvent {
      id: string;
      fromStatus: 'pending' | 'running';
      toStatus: 'running' | 'completed' | 'failed' | 'cancelled';
      timestamp: number;
      // 附加信息（根据 toStatus 变化）
      result?: any;        // if completed
      error?: string;      // if failed
      duration?: number;   // if terminal state
    }
    ```

### 2.2. 进度遥测 (`*:progress`)

负责在 `running` 状态下更新进度条，**不改变状态**。

*   **Topic**: `task:progress`
*   **Payload 规范**:
    ```typescript
    interface ProgressEvent {
      id: string;
      percentage: number; // 0-100
      current: number;    // 当前步骤
      total: number;      // 总步骤
      message?: string;   // 可选的进度描述（如 "正在下载..."）
    }
    ```

### 2.3. 业务日志 (`*:log`) (可选)

负责向用户展示纯文本流水，不影响状态逻辑。

*   **Topic**: `workflow:log`
*   **Payload**: `{ level: 'info'|'error', message: string, timestamp: number }`

---

## 3. 迁移指南

### 发送端 (Backend / Worker)

**Old Code:**
```typescript
// ❌ 废弃写法
emit('task:started');
// ...
if (success) {
  emit('task:completed', result);
} else {
  emit('task:failed', error);
}
```

**New Code (v2.0):**
```typescript
// ✅ 标准写法
emit('task:status-changed', { to: 'running' });
// ...
if (success) {
  emit('task:status-changed', { to: 'completed', result });
} else {
  emit('task:status-changed', { to: 'failed', error });
}
```

### 接收端 (Frontend / Monitor)

**Old Code:**
```typescript
// ❌ 冗余监听
on('task:started', () => setSpinning(true));
on('task:completed', () => showSuccess());
on('task:failed', () => showError());
```

**New Code (v2.0):**
```typescript
// ✅ 统一监听
on('task:status-changed', (event) => {
  switch (event.toStatus) {
    case 'running': setSpinning(true); break;
    case 'completed': showSuccess(event.result); break;
    case 'failed': showError(event.error); break;
  }
});
```

---

**最后更新**: 2026-01-30
