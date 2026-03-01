# Data Bus 架构文档（实时版）

## 📋 概述

Data Bus 是 VeilBrowser 的**数据总线**，负责实时传输非关键数据：日志、指标、截图等。与 Event Bus 形成「双总线」架构，满足不同场景需求。

**核心原则**：
- ✅ **实时优先**：数据传输延迟 <500ms，支持 UI 实时渲染
- ✅ **无持久化**：当前阶段不存储到 DB/File，仅实时传输（减少负载）
- ✅ **容错传输**：失败时丢弃，不阻塞业务执行
- ✅ **负载控制**：采样、压缩、聚合，避免过载

---

## 🏗️ 架构设计

### 双总线对比

| 特性 | Event Bus | Data Bus |
|------|-----------|----------|
| **用途** | 业务流程控制 | 观察/记录数据 |
| **消息大小** | <1KB | >10KB（甚至 MB 级） |
| **可靠性** | 高（需 ACK） | 低（可丢失） |
| **延迟** | <100ms | <500ms |
| **频率** | 低频（事件驱动） | 高频（>10 条/秒） |
| **持久化** | 可选 | 无（当前阶段） |

### 整体架构图

```
┌─────────────────┐    IPC (chunking)    ┌─────────────────┐    IPC (direct)   ┌─────────────────┐
│   Renderer UI   │  ←─────────────      │   Main Process   │  ←─────────────   │   Worker Proc   │
│   (Browser)     │                      │   (Data Bridge)  │                   │   (Child Proc)  │
│                 │                      │                 │                   │                 │
│ - Subscribe     │                      │ - Forward Data  │                   │ - Capture Logs  │
│   'data:logs'   │                      │ - Chunk Large   │                   │ - Collect Metrics│
│ - Display UI    │                      │ - No Storage    │                   │ - Take Screenshot│
└─────────────────┘                      └─────────────────┘                   └─────────────────┘
```

---

## 📨 消息类型

### DataMessageType 枚举

```typescript
export enum DataMessageType {
  LOG_BATCH = 'data.log.batch',                    // 日志批次（采样 20%，批量传输）
  METRICS_SNAPSHOT = 'data.metrics.snapshot',      // 指标快照（5s/次，聚合传输）
  SCREENSHOT_CAPTURED = 'data.screenshot.captured', // 截图（压缩 base64，<5MB）
  SCREENSHOT_CHUNK = 'data.screenshot.chunk',      // 截图分块（>1MB 时分块传输）
}
```

### Payload 接口

详见 `src/shared/types/dataMessages.ts`：
- `LogBatchData` - 日志批次
- `MetricsSnapshotData` - 指标快照
- `ScreenshotData` - 截图数据
- `ScreenshotChunkData` - 截图分块

---

## 🔄 传输流程

### 1. Worker → Main (IPC)

**通道**：IPC 直接通信（进程间消息）

**示例**：日志批次传输
```typescript
// 子进程代码
import { createMessage } from '../../../shared/utils/messageSerializer.js';
import { DataMessageType } from '../../../shared/types/message.js';
import { ipcClient } from './ipcClient.service.js';

// 缓冲日志，采样 20%
const bufferedLogs = [];
if (Math.random() > 0.8) {
  bufferedLogs.push({ level: 'info', message: 'User action', timestamp: Date.now() });
}

if (bufferedLogs.length >= 10) {
  const message = createMessage({
    type: DataMessageType.LOG_BATCH,
    source: 'Worker',
    payload: {
      profileId: profileId, // 完整 ID，用于业务匹配
      logs: bufferedLogs,
      batchSize: bufferedLogs.length,
    }
  });
  ipcClient.send(message);
  bufferedLogs.length = 0; // 清空缓冲
}
```

### 2. Main → Renderer (IPC)

**通道**：Electron IPC（小数据直接发送，大数据分块）

**实现位置**：
- `src/main/services/execution/messageHandler.ts` - 处理 IPC 消息，转发到 IPC
- `src/main/core/preload.ts` - 暴露 IPC API 到 Renderer

**示例**：主进程转发日志
```typescript
// 在 messageHandler.ts 中
static handleDataMessage(data: BaseMessage<any>) {
  const { type, payload } = data;
  switch (type) {
    case DataMessageType.LOG_BATCH:
      mainWindow?.webContents.send('data:logs', payload);
      break;
    case DataMessageType.METRICS_SNAPSHOT:
      mainWindow?.webContents.send('data:metrics', payload);
      break;
    case DataMessageType.SCREENSHOT_CAPTURED:
      mainWindow?.webContents.send('data:screenshot', payload);
      break;
  }
}
```

### 3. Renderer 订阅

**示例**：UI 组件订阅日志
```tsx
// 在 React 组件中
useEffect(() => {
  const unsubscribeLogs = window.electron.onDataLogs((logs) => {
    setLogs(prev => [...prev, ...logs]); // 实时追加
  });
  return () => unsubscribeLogs();
}, []);
```

---

## 📊 具体场景实现

### 场景 1：日志传输

**流程**：
1. 子进程：缓冲日志，采样 20%，每 10 条或 10s 批量发送
2. 主进程：直接 IPC 转发，无存储
3. UI：订阅 `data:logs`，追加到列表（滚动显示，保留最近 100 条）

**采样规则**：
- 高频事件（如 CDP 刷新）：采样 10%
- 普通日志：采样 20%
- 错误日志：100%（不采样）

### 场景 2：指标传输

**流程**：
1. 子进程：每 5s 聚合指标（CPU/Memory/Network）
2. 主进程：IPC 转发
3. UI：订阅 `data:metrics`，更新仪表盘

**聚合指标**：
- CPU：5s 平均值
- Memory：当前值（RSS, Heap）
- Network：5s 增量（bytes/5s）
- Pages：当前计数

### 场景 3：截图传输

**流程**：
1. 触发：UI 点击"截图" 或定时（Event Bus `SCREENSHOT_REQUESTED`）
2. 子进程：`page.screenshot()` + 压缩（JPEG 80% 质量）+ base64
3. 主进程：如果 >1MB 分块 IPC 转发
4. UI：订阅 `data:screenshot`，显示 base64 图像

**压缩规则**：
- 格式：JPEG（默认）或 PNG
- 质量：80%（JPEG）
- 最大大小：5MB（超限分块或丢弃）

---

## 🔒 安全与性能

### 安全性

1. **数据保护**：
   - `profileId` 保留完整（用于业务匹配，如网格预览）
   - 日志中移除密码/密钥（在日志层处理）
   - 截图不包含敏感信息（如输入框密码）
   - ⚠️ 注意：当前阶段不脱敏 profileId，避免影响业务匹配

2. **编码**：
   - 二进制数据（截图）使用 base64 编码
   - 确保 JSON 序列化安全

### 性能优化

1. **采样**：
   - 日志：20% 采样率
   - 指标：5s 聚合（降低频率）

2. **压缩**：
   - 截图：JPEG 80% 质量
   - 日志：JSON 格式（无需压缩，文本小）

3. **分块**：
   - 截图 >1MB 时分块传输（每块 <1MB）
   - 避免单次传输过大消息

4. **负载控制**：
   - 单消息上限：5MB
   - 队列上限：100 条（超限丢弃旧数据）

---

## 🔗 与 Event Bus 协作

### Event Bus 触发 Data Bus

**示例**：截图请求
```typescript
// Event Bus 事件
emitScreenshotRequested({
  profileId: 'p123',
  timestamp: Date.now(),
});

// 子进程监听 Event Bus，触发截图
eventBus.on(EventMessageType.SCREENSHOT_REQUESTED, async (message) => {
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
  // 通过 Data Bus 发送
  ipcClient.send(createMessage({
    type: DataMessageType.SCREENSHOT_CAPTURED,
    payload: { profileId, data: screenshot.toString('base64'), ... }
  }));
});
```

---

## 📝 规则约定

### 代码审查检查项

- [ ] Data Bus 消息使用 `DataMessageType`（非 `EventMessageType`）
- [ ] 实时传输，无 DB/File 写入
- [ ] 日志采样率 >=20%（错误日志 100%）
- [ ] 截图压缩质量 <=80%
- [ ] 分块传输 >1MB 数据
- [ ] `profileId` 脱敏（截断）

### 传输规则

- **采样率**：日志 20%，指标 5s/次
- **最大大小**：5MB/消息（超限分块或丢弃）
- **延迟要求**：<500ms（Worker → Main → Renderer）
- **容错**：失败丢弃，不重试（非阻塞）

---

## 🚀 未来扩展

### 阶段 2：持久化（未来）

- SQLite 存储日志/指标（用于历史查询）
- 文件系统存储截图（用于审计）
- 数据归档（定期清理旧数据）

### 阶段 3：高级功能（未来）

- 实时流式传输（WebSocket）
- 数据压缩（GZIP）
- 批量传输优化

---

## 📚 相关文档

- [事件总线架构文档](./workflow/EVENT_BUS_ARCHITECTURE.md)
- [统一消息格式设计](./shared/MESSAGE_FORMAT.md)（待创建）

---

**最后更新**: 2025-12-08  
**维护者**: VeilBrowser Team

