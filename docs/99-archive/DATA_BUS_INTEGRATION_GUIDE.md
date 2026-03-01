# Data Bus 集成指南

## 📋 概述

本文档说明如何完成 Data Bus 传输层的集成，包括主进程消息处理、IPC handlers 注册，以及子进程发送代码的集成。

**当前状态**：
- ✅ 消息类型定义完成（`DataMessageType` + Payload 接口）
- ✅ 主进程消息处理完成（`messageHandler.handleDataMessage`）
- ✅ IPC handlers 完成（`src/main/ipc/handlers/data/index.ts`）
- ⚠️ 待完成：注册 IPC handlers、IPC 消息路由、子进程发送代码

---

## 🔧 待完成步骤

### 步骤 1：注册 IPC Handlers

**文件**：`src/main/ipc/register.ts`

**添加**：
```typescript
import { registerDataHandlers } from './handlers/data/index.js';

export function registerIpcHandlers(mainWindow: BrowserWindow | null): void {
  // ... 现有 handlers ...
  registerDataHandlers(mainWindow);
}
```

### 步骤 2：在 IPC 消息处理中路由 Data Bus 消息

**文件**：`src/main/services/execution/execution.service.ts` 或相关 IPC 监听代码

**查找位置**：IPC 消息接收和解析的地方（通常在 `execution.service.ts` 中）

**添加**：
```typescript
import { MessageHandler } from './messageHandler.js';
import { DataMessageType } from '@shared/types/message.js';
import { isBaseMessage } from '@shared/types/message.js';

// 在 IPC 消息处理逻辑中
if (isBaseMessage(parsedData)) {
  const messageType = parsedData.header.type;
  
  // 检查是否为 Data Bus 消息
  if (Object.values(DataMessageType).includes(messageType as DataMessageType)) {
    // 路由到 Data Bus 处理器
    MessageHandler.handleDataMessage(parsedData);
    return; // 不继续处理为 Event Bus 消息
  }
  
  // 其他消息继续原有处理逻辑...
}
```

### 步骤 3：子进程发送代码集成

#### 3.1 日志发送（子进程）

**文件**：`src/processes/utils/logger.ts` 或相关日志文件

**添加**：
```typescript
import { createMessage } from '../../../shared/utils/messageSerializer.js';
import { DataMessageType } from '../../../shared/types/message.js';
import { ipcClient } from '../ipc-client/ipcClient.service.js';

// 日志缓冲（采样 20%）
const logBuffer: Array<{
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  meta?: Record<string, string | number>;
}> = [];

// 采样率：普通日志 20%，错误日志 100%
function shouldSampleLog(level: string): boolean {
  if (level === 'error') return true; // 错误日志不采样
  return Math.random() > 0.8; // 20% 采样
}

// 在 simpleLog 函数中添加缓冲逻辑
export function simpleLog(level: string, message: string, context?: any) {
  // ... 现有日志逻辑 ...
  
  // 采样后加入缓冲
  if (shouldSampleLog(level)) {
    logBuffer.push({
      level: level as any,
      message, // 确保已脱敏（密码/密钥已移除）
      timestamp: Date.now(),
      meta: context ? { ...context } : undefined,
    });
    
    // 每 10 条或 10s 批量发送
    if (logBuffer.length >= 10) {
      const profileId = context?.profileId || 'unknown';
      const message = createMessage({
        type: DataMessageType.LOG_BATCH,
        source: 'Worker',
        payload: {
          profileId, // 完整 ID，用于业务匹配
          logs: [...logBuffer],
          batchSize: logBuffer.length,
        },
      });
      
      ipcClient.send(message);
      logBuffer.length = 0; // 清空缓冲
    }
  }
}

// 定时发送（10s 间隔）
setInterval(() => {
  if (logBuffer.length > 0) {
    const profileId = 'unknown'; // 从 context 获取
    const message = createMessage({
      type: DataMessageType.LOG_BATCH,
      source: 'Worker',
      payload: {
        profileId,
        logs: [...logBuffer],
        batchSize: logBuffer.length,
      },
    });
    zmqClient.send(message);
    logBuffer.length = 0;
  }
}, 10000);
```

#### 3.2 指标发送（子进程）

**文件**：`src/processes/worker.ts` 或相关监控代码

**添加**：
```typescript
import { createMessage } from '../../shared/utils/messageSerializer.js';
import { DataMessageType } from '../../shared/types/message.js';
import { zmqClient } from './zmq-client/zmqClient.service.js';

// 每 5s 聚合指标
setInterval(async () => {
  try {
    const memory = process.memoryUsage();
    const cpuUsage = await getCpuUsage(); // 自定义函数，计算 5s 平均 CPU
    
    const metrics = createMessage({
      type: DataMessageType.METRICS_SNAPSHOT,
      source: 'Worker',
      payload: {
        profileId: profileContext.profileId, // 从 context 获取
        timestamp: Date.now(),
        cpu: { usage: cpuUsage },
        memory: {
          rss: memory.rss,
          heapUsed: memory.heapUsed,
        },
        network: {
          rx: 0, // 需要自定义网络监控
          tx: 0,
        },
        pages: {
          count: browserContext?.pages().length || 0,
          active: browserContext?.pages().filter(p => !p.isClosed()).length || 0,
        },
      },
    });
    
    ipcClient.send(metrics);
  } catch (error) {
    // 指标收集失败，静默丢弃（非阻塞）
  }
}, 5000);
```

#### 3.3 截图发送（子进程）

**文件**：`src/processes/execution/actions/screenshot.action.ts` 或相关截图代码

**添加**：
```typescript
import { createMessage } from '../../../../shared/utils/messageSerializer.js';
import { DataMessageType } from '../../../../shared/types/message.js';
import { zmqClient } from '../../zmq-client/zmqClient.service.js';

// 在截图函数中
export async function captureScreenshot(page: Page, profileId: string) {
  try {
    // 捕获截图
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80, // 压缩质量
    });
    
    const base64Data = screenshot.toString('base64');
    const size = screenshot.length;
    
    // 如果 >1MB，分块传输
    if (size > 1e6) {
      const chunks = splitBase64(base64Data, 1e6); // 自定义分块函数
      const traceId = generateTraceId();
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkMessage = createMessage({
          type: DataMessageType.SCREENSHOT_CHUNK,
          source: 'Worker',
          payload: {
            profileId,
            chunkId: i,
            totalChunks: chunks.length,
            data: chunks[i],
            traceId,
          },
        });
        ipcClient.send(chunkMessage);
      }
    } else {
      // 直接发送
      const screenshotMessage = createMessage({
        type: DataMessageType.SCREENSHOT_CAPTURED,
        source: 'Worker',
        payload: {
          profileId,
          timestamp: Date.now(),
          format: 'jpeg',
          quality: 80,
          width: await page.viewportSize()?.width || 1920,
          height: await page.viewportSize()?.height || 1080,
          data: base64Data,
        },
      });
      ipcClient.send(screenshotMessage);
    }
  } catch (error) {
    // 截图失败，静默丢弃（非阻塞）
  }
}

// 辅助函数：分块 base64
function splitBase64(base64: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }
  return chunks;
}
```

---

## 📝 注意事项

1. **profileId 不脱敏**：保留完整 ID，用于业务匹配（如网格预览）
2. **采样率**：日志 20%（错误 100%），指标 5s/次
3. **压缩**：截图 JPEG 80% 质量
4. **分块**：截图 >1MB 时分块传输
5. **容错**：传输失败时丢弃，不重试（非阻塞）

---

## 🧪 测试建议

1. **日志传输测试**：
   - 子进程发送日志批次
   - 主进程转发到 UI
   - UI 实时显示日志

2. **指标传输测试**：
   - 子进程每 5s 发送指标
   - UI 更新仪表盘

3. **截图传输测试**：
   - 触发截图请求
   - 子进程发送截图
   - UI 显示截图

---

**最后更新**: 2025-12-08  
**维护者**: VeilBrowser Team

