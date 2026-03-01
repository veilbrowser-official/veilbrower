# 事件系统架构标准

> **版本**: v2.0  
> **最后更新**: 2026-01-28  
> **维护者**: VeilBrowser Team

## 📋 概述

VeilBrowser 采用**统一事件体系**,基于优秀厂商 (Microsoft Power Automate, UiPath) 的最佳实践,实现完全闭合的事件生命周期管理。

### 核心原则

1. **单一事实来源 (Single Source of Truth)**: 所有事件常量统一定义在 `@shared/events`
2. **职责分离 (Separation of Concerns)**: 事件系统、日志系统、基础设施各司其职
3. **分层清晰 (Clear Layering)**: 基础设施、业务事件、日志系统分层管理

---

## 🏗️ 架构设计

### 目录结构

```
src/shared/
├── infra/                    # 基础设施 (计划中)
│   ├── event-emitter.ts      # EventEmitter 基类
│   ├── tracing.ts            # TraceId 生成器
│   └── index.ts
├── events/                   # 业务事件体系
│   ├── constants.ts          # ✅ 事件常量定义 (原 system-events.ts)
│   ├── base.ts               # 统一事件类型 (原 base.events.ts)
│   ├── profile.ts            # Profile 域事件
│   ├── workflow.ts           # Workflow 域事件
│   ├── job.ts                # Job 域事件
│   ├── proxy.ts              # Proxy 域事件
│   ├── cookie.ts             # Cookie 域事件
│   ├── license.ts            # License 域事件
│   ├── ack.ts                # ACK 域事件
│   ├── README.md             # 架构文档
│   └── index.ts              # 统一导出
└── log/                      # 日志类型定义
    └── types.ts
```

---

## 📦 事件常量规范

### 文件: `constants.ts`

**导出**:

- `SystemEvents` (向后兼容)
- `Events` (推荐使用)

### 使用示例

```typescript
// ✅ 推荐: 使用 Events
import { Events } from "@shared/events/constants.js";

log.info(Events.PROFILE.LAUNCHED, { profileId });
log.info(Events.WORKFLOW.STARTED, { workflowId });
log.info(Events.JOB.COMPLETED, { jobId });

// ⚠️ 向后兼容: 使用 SystemEvents (不推荐)
import { SystemEvents } from "@shared/events/constants.js";
log.info(SystemEvents.PROFILE.LAUNCHED, { profileId });
```

### 事件常量结构

```typescript
export const Events = {
  /** Profile 域: 环境生命周期管理 */
  PROFILE: {
    // Commands (用于 Messenger RPC)
    LAUNCH: "profile:launch",
    STOP: "profile:stop",

    // Events (用于 EventBus/Log)
    LAUNCHING: "profile:launching",
    LAUNCHED: "profile:launched",
    READY: "profile:ready",
    STOPPED: "profile:stopped",
    FAILED: "profile:failed",
  },

  /** Workflow 域: 工作流编排 (L6) */
  WORKFLOW: {
    // Commands
    RUN: "workflow:run",
    PAUSE: "workflow:pause",
    CANCEL: "workflow:cancel",

    // Events
    STARTED: "workflow:started",
    COMPLETED: "workflow:completed",
    FAILED: "workflow:failed",
    PAUSED: "workflow:paused",
    CANCELLED: "workflow:cancelled",
  },

  /** Job 域: 批量作业调度 (L7) */
  JOB: {
    // Commands
    SUBMIT: "job:submit",
    PAUSE: "job:pause",
    STOP: "job:stop",

    // Events
    STARTED: "job:started",
    PROGRESS: "job:progress",
    COMPLETED: "job:completed",
    FAILED: "job:failed",
  },

  /** System 域: 基础设施服务 */
  SYS: {
    LOG: "sys:log",
    HEARTBEAT: "sys:heartbeat",
    ERROR: "sys:error",
  },
} as const;
```

---

## 🎯 事件类型定义

### 文件: `base.ts`

定义统一的事件类型体系,支持完整的生命周期管理。

### 核心类型

#### 1. BaseEvent (基础事件)

```typescript
interface BaseEvent {
  eventId: string; // 唯一事件ID
  timestamp: number; // 事件时间戳
  traceId: string; // 全链路追踪ID
  type: EventType; // 事件类型
  workflowId?: string; // 工作流ID
  taskId?: string; // 任务ID
  profileId?: string; // Profile ID
  data: Record<string, any>; // 业务数据
}
```

#### 2. StatusChangedEvent (状态变更事件)

```typescript
interface StatusChangedEvent extends BaseEvent {
  data: {
    fromStatus: TaskStatus; // 起始状态
    toStatus: TaskStatus; // 目标状态
    duration: number; // 执行时长
    error?: string; // 错误信息 (失败时)
    result?: any; // 执行结果 (成功时)
    statistics?: {
      // 执行统计
      totalActions?: number;
      completedActions?: number;
      failedActions?: number;
    };
  };
}
```

#### 3. ProgressEvent (进度事件)

```typescript
interface ProgressEvent extends BaseEvent {
  data: {
    progress: {
      percentage: number; // 0-100 百分比
      completed: number; // 已完成数量
      total: number; // 总数
      current: number; // 当前索引
      estimatedTimeRemaining?: number; // 预计剩余时间(ms)
    };
    currentStep?: {
      name: string; // 步骤描述
      type: string; // 步骤类型
      status: TaskStatus; // 步骤状态
    };
  };
}
```

### 使用示例

```typescript
import { createProgressEvent } from "@shared/events/base.js";

const progressEvent = createProgressEvent(
  "task:progress",
  traceId,
  {
    percentage: 60,
    completed: 3,
    total: 5,
    current: 2,
  },
  { taskId, profileId },
  {
    name: "点击登录按钮",
    type: "click",
    status: "running",
  },
);

await eventDispatcher.dispatch(progressEvent);
```

---

## 🔄 事件生命周期

### 完整事件流

```
工作流执行完整事件流:
├── workflow:started (executionId: xxx, totalTasks: 2)
├── task:started (taskId: task1, totalActions: 3)
│   ├── action:started (actionId: act1, type: 'goto')
│   ├── action:status-changed (from: running, to: completed)
│   ├── task:progress (percentage: 33)
│   ├── action:started (actionId: act2, type: 'click')
│   ├── action:status-changed (from: running, to: completed)
│   ├── task:progress (percentage: 67)
│   ├── action:started (actionId: act3, type: 'type')
│   ├── action:status-changed (from: running, to: failed)
│   └── task:status-changed (from: running, to: failed)
└── workflow:status-changed (from: running, to: failed)
```

### 生命周期原则

1. **闭合生命周期**: `started` → `progress*` → `status-changed`
2. **统一终态**: 所有终态通过 `status-changed` 表达 (completed/failed/cancelled)
3. **百分比进度**: 所有 progress 事件包含 0-100 的百分比
4. **全链路追踪**: 每个事件包含完整的 traceId

---

## 🛠️ 与日志系统集成

### 日志记录事件

```typescript
import { getLogger } from "@main/infra/logger";
import { Events } from "@shared/events/constants.js";

const log = getLogger("workflow");

// ✅ 正确: 使用事件常量作为日志标签
log.info(Events.WORKFLOW.STARTED, {
  workflowId,
  profileId,
  input,
});

log.error(Events.WORKFLOW.FAILED, {
  workflowId,
  error: error.message,
  stack: error.stack,
});
```

### 日志 vs 事件

| 维度         | 日志系统                      | 事件系统                              |
| ------------ | ----------------------------- | ------------------------------------- |
| **职责**     | 记录和格式化日志              | 定义业务事件和事件通信                |
| **导出**     | `getLogger()`, `ScopedLogger` | `Events`, `BaseEvent`, `EventEmitter` |
| **位置**     | `@main/infra/logger`          | `@shared/events`                      |
| **使用场景** | 日志记录、调试、监控          | 事件驱动、状态管理、进程通信          |

---

## ✅ 最佳实践

### 1. 使用 Events 常量

```typescript
// ✅ 推荐
import { Events } from "@shared/events/constants.js";
log.info(Events.PROFILE.LAUNCHED, { profileId });

// ❌ 避免
log.info("profile:launched", { profileId }); // 硬编码字符串
```

### 2. 使用类型安全的事件创建函数

```typescript
// ✅ 推荐
import { createStatusChangedEvent } from "@shared/events/base.js";

const event = createStatusChangedEvent(
  "task:status-changed",
  traceId,
  "running",
  "completed",
  1500,
  { taskId, profileId },
);

// ❌ 避免
const event = {
  type: "task:status-changed",
  // ... 手动构造,容易出错
};
```

### 3. 保持事件命名一致性

- **Commands**: 使用动词 (如 `LAUNCH`, `STOP`, `RUN`)
- **Events**: 使用过去式 (如 `LAUNCHED`, `STOPPED`, `STARTED`)
- **Progress**: 使用 `PROGRESS` 后缀

### 4. 使用 TraceId 进行全链路追踪

```typescript
import { randomUUID } from "crypto";

const traceId = randomUUID();

// 在整个工作流执行过程中传递 traceId
log.info(Events.WORKFLOW.STARTED, { traceId, workflowId });
log.info(Events.TASK.STARTED, { traceId, taskId });
log.info(Events.TASK.COMPLETED, { traceId, taskId });
log.info(Events.WORKFLOW.COMPLETED, { traceId, workflowId });
```

---

## 🔧 迁移指南

### 从旧版 EVENTS 迁移

```typescript
// ❌ 旧代码
import { getLogger, EVENTS } from "@main/infra/logger";
log.info(EVENTS.PROFILE_LAUNCH);

// ✅ 新代码
import { getLogger } from "@main/infra/logger";
import { Events } from "@shared/events/constants.js";
log.info(Events.PROFILE.LAUNCH);
```

### 从 system-events.ts 迁移

```typescript
// ❌ 旧代码
import { SystemEvents } from "@shared/events/system-events.js";

// ✅ 新代码
import { Events } from "@shared/events/constants.js";
// 或向后兼容
import { SystemEvents } from "@shared/events/constants.js";
```

---

## 📚 相关文档

- [事件体系 README](../../../src/shared/events/README.md)
- [日志规范](./logging-standard.md)
- [架构约束](./architecture-constraints.md)

---

**更新时间**: 2026-01-28  
**维护者**: VeilBrowser Team
