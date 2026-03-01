# VeilBrowser 统一消息格式设计文档

## 📋 概述

本文档详细说明 VeilBrowser 的统一消息格式设计，这是系统级的基础设施，用于统一 ZMQ、EventBus、IPC 等所有通信通道的消息格式。

## 🎯 设计目标

1. **统一格式**：所有消息（ZMQ、EventBus、IPC）遵循相同的 `BaseMessage<T>` 格式
2. **全链路追踪**：通过 traceId 实现跨进程的消息追踪
3. **类型安全**：TypeScript 泛型支持，编译时检查
4. **向后兼容**：自动检测和迁移旧格式消息，无需立即更新所有代码
5. **版本化**：支持未来协议升级（version 字段）

## 📐 消息格式定义

### BaseMessage<T> 结构

```typescript
interface BaseMessage<T> {
  header: {
    traceId: string;      // UUID v4，全链路追踪
    timestamp: number;    // 时间戳（毫秒）
    type: string;         // 消息类型，e.g., 'task.started'
    version: string;      // 协议版本，当前 '1.0'
    source: 'L5B' | 'Main' | 'Renderer';
  };
  payload: T;             // 业务数据（类型安全）
  error?: MessageError;   // 错误信息（可选）
}
```

### 消息类型枚举

```typescript
enum MessageType {
  // 任务相关
  TASK_STARTED = 'task.started',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_STATUS_CHANGED = 'task.status-changed',
  
  // Profile 相关
  PROFILE_CREATED = 'profile.created',
  PROFILE_UPDATED = 'profile.updated',
  // ...
  
  // 工作流相关
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  // ...
}
```

## 🔧 工具函数

### 创建消息

```typescript
import { createMessage } from '@shared/utils/messageSerializer.js';

const message = createMessage(
  { taskId: '123', status: 'running' },  // payload
  'task.started',                         // type
  'Main',                                 // source
  'custom-trace-id'                       // traceId (可选)
);
```

### 序列化/反序列化

```typescript
import { serializeMessage, parseMessage } from '@shared/utils/messageSerializer.js';

// 序列化
const serialized = serializeMessage(message);  // JSON 字符串

// 反序列化
const parsed = parseMessage<{ taskId: string; status: string }>(serialized);
```

### 向后兼容处理

```typescript
import { safeParseMessage, isLegacyFormat } from '@shared/utils/messageSerializer.js';

// 安全解析（自动检测新旧格式）
const message = safeParseMessage(data, 'task.started', 'Main');

// 检查是否为旧格式
if (isLegacyFormat(data)) {
  // 迁移旧格式
  const newMessage = migrateLegacyMessage(data, 'task.started', 'Main');
}
```

## 🔄 集成点

### 1. ZMQ 层（L5B ↔ Main）

**发送端**（execution.service.ts）：
```typescript
const taskMessage = createMessage(taskPayload, 'task.distribute', 'Main', task.traceId);
const frames = buildRouterSendFrame(profileId, 'TASK', taskMessage, seq.toString());
```

**接收端**（execution.service.ts）：
```typescript
const { payload: resultData, traceId } = parseZMQMessageData(parsedData, 'TASK_RESULT', profileId);
```

### 2. EventBus 层（Main Process）

**发射事件**（eventBus.ts）：
```typescript
export function emitTaskStarted(data: TaskStartedEventData): void {
  const message = createMessage(data, TaskEventType.STARTED, 'Main', data.traceId);
  eventBus.emit(TaskEventType.STARTED, message);
}
```

### 3. IPC 层（Main ↔ Renderer）

**桥接器转发**（eventBusBridge.ts）：
```typescript
function forwardToSubscribers(topic: string, payload: any): void {
  let serializedPayload: string;
  if (isBaseMessage(payload)) {
    serializedPayload = serializeMessage(payload);
  } else {
    serializedPayload = JSON.stringify(payload);  // 向后兼容
  }
  contents.send(`event:${topic}`, serializedPayload);
}
```

**Renderer 订阅**（preload.ts）：
```typescript
const handler = (_event: unknown, payload: string | any) => {
  // 自动解析统一消息格式，提取 payload
  let parsedPayload: any;
  if (typeof payload === 'string') {
    const parsed = JSON.parse(payload);
    if (parsed.header && parsed.payload !== undefined) {
      parsedPayload = parsed.payload;  // 新格式
    } else {
      parsedPayload = parsed;  // 旧格式
    }
  }
  callback(parsedPayload);
};
```

## ✅ 优势

1. **全链路追踪**：traceId 跨进程传递，便于调试和监控
2. **类型安全**：TypeScript 泛型支持，编译时检查
3. **向后兼容**：自动检测旧格式，无需立即更新所有代码
4. **版本化**：支持未来协议升级（version 字段）
5. **统一调试**：所有消息格式一致，便于日志分析
6. **减少错误**：Schema 验证（Zod），运行时检查

## 🚨 注意事项

1. **向后兼容**：旧格式消息会自动迁移，但建议逐步更新所有代码
2. **性能**：序列化/反序列化开销 <0.1ms，可忽略
3. **traceId 传递**：确保在创建消息时传递 traceId，否则会自动生成新的
4. **版本升级**：未来协议升级时，通过 version 字段处理兼容性

## 📝 实施状态

- ✅ **阶段 1**：类型定义和工具函数（已完成）
- ✅ **阶段 2**：ZMQ 层集成（已完成）
- ✅ **阶段 3**：EventBus + IPC 层集成（已完成）
- ⏳ **阶段 4**：全面测试和验证（进行中）

## 🔗 相关文档

- [事件总线架构文档](./EVENT_BUS_ARCHITECTURE.md)
- [L6-L5 兼容性分析](./L6_L5_COMPATIBILITY.md)

