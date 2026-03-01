# 日志规范 (Logging Standards)

## 🪵 2025 年日志系统约定（生产级可观测性）

### ⚠️ 核心原则

```text
2025 年 VeilBrowser 日志铁律：
「结构化 JSON + 7 层分类 + traceId 全链路 + 高频采样 + 子进程隔离」—— 日志为可观测性服务，非调试洪水；dev 详细，prod 精简，异常必 log
→ 违反将导致日志噪声 >1MB/s，影响性能和维护。
```

**技术栈确认**：
- **进程隔离架构**（2025-12 重构）：
  - `src/shared/log/`：纯接口层（类型、常量、context），零 winston 依赖
  - `src/main/log/`：主进程实现（Winston + 文件轮转），从 `../log/index.js` 导入
  - `src/renderer/log/`：已废弃，渲染进程现在直接使用 console
  - `src/processes/log/`：Worker 进程实现（原生 IPC 传输），零 winston，从 `./log/index.js` 导入
- **统一 API**：所有进程使用 `lazyLoggers` + `log.info/debug/warn/error()` 格式
- **Worker 日志传输**：统一通过原生 IPC 通道推送，移除 stdout JSON

---

### 20. 日志级别与环境控制（基础层）

#### ✅ 全局 LOG_LEVEL 控制（env 变量）
- **级别标准**：debug < info < warn < error（5 级，无 verbose/fatal）。
  - **debug**：开发调试/高频监控（e.g., CDP 刷新），prod 禁用。
  - **info**：业务事件（e.g., Profile 启动、注入成功），采样后输出。
  - **warn**：可恢复异常（e.g., 内存 >85%、注入失败 <5%），必 log。
  - **error**：严重故障（e.g., 注入回滚、uncaughtException），必 log + 告警。
- **环境隔离**：
  - **开发**：默认 `debug`，用 `LOG_LEVEL=info` 过滤噪声。
  - **生产**：默认 `warn`，只 log warn+（info 采样 20%）。
  - **用法**：`LOG_LEVEL=info npm run electron:dev`（终端/文件过滤）；子进程继承 env。
- **性能**：异步输出（Winston transport），I/O <1ms/日志；高频事件采样率 10-20%（Math.random()）。

#### ✅ 子进程隔离（Adapter 模式）
- **禁止**：子进程直接 import 主进程 logger（路径冲突、安全污染、winston 依赖污染）。
- **必须**：使用进程隔离架构，每个进程从各自的 log 目录导入：
  - **Main 进程**：`import { lazyLoggers } from '../log/index.js'`（Winston + 文件）
  - **Worker 进程**：`import { lazyLoggers } from './log/index.js'`（DataBus 传输，零 winston）
  - **Renderer 进程**：`import { lazyLoggers } from '../log/index.js'`（IPC 转发，零 winston）
- **使用方式**：
  ```typescript
  // Worker 进程 (worker.ts):
  import { lazyLoggers, EVENTS } from './log/index.js';
  const log = lazyLoggers.worker;
  log.info(EVENTS.PROFILE_LAUNCHED, { profileId: 'p1', duration: 25 });
  
  // Main 进程通过 child.on('message') 自动接收并聚合 Worker 日志
  ```
- **Worker 日志传输**：统一通过原生 IPC (`LOG_BATCH` 消息) 传输，移除 stdout JSON

---

### 21. 结构化日志约定（核心层）

#### ✅ 统一 API 与 Meta 结构
- **推荐用法**：使用预配置的 `lazyLoggers`（懒加载，避免初始化顺序问题）
  ```typescript
  // 主进程
  import { lazyLoggers, EVENTS } from '../log/index.js';
  const log = lazyLoggers.proxy;
  
  // Worker 进程
  import { lazyLoggers } from './log/index.js';
  const log = lazyLoggers.worker;
  
  // 渲染进程
  import { lazyLoggers, EVENTS } from '../log/index.js';
  const log = lazyLoggers.ui;
  
  // 基础用法（自动 module/source，支持 Icon，无需 layer 参数）
  log.info(EVENTS.PROXY_HEALTH_CHECK, { status: 'healthy', latency: 50 });
  
  // ✅ 参数传递原则：所有参数直接放在 context 中，无需定义辅助函数
  log.info(EVENTS.PROXY_POOL_UPDATED, {
    provider: this.getProviderName(),  // 局部参数直接在 context 中传递
    proxyId: proxy.id,                 // 通用参数也在 context 中传递
    profileId: profileId,             // 所有参数统一在 context 中
    count: proxies.length,
  });
  
  // ❌ 禁止：定义辅助函数（如 logProxy、logProvider）来传递参数
  // ❌ 禁止：传递 layer 参数（新 API 自动推断）
  ```
  - **traceId 管理架构（2025 版）**：
  - **入口点创建策略**：
    - ✅ **IPC handlers（核心入口点）** - 必须创建 traceId：
      - 用户操作：创建类、启动类、批量操作。
    - ✅ **Worker message handlers** - 异步任务入口点（必须恢复或创建 traceId）。
    - ❌ 禁止在业务逻辑层、服务层、工具函数中直接创建 traceId。
  - **全局上下文传播**：✅ 使用 `runWithTraceIdAsync` 包装入口函数，通过 AsyncLocalStorage 自动传播。
  - **进程间传递**：✅ 通过 IPC 消息对象携带 `traceId`，Worker 从消息体恢复。
  
  ```typescript
  // ✅ 正确：Worker 消息处理从消息体提取 traceId
  worker.on('message', async (message) => {
    const traceId = message.traceId || uuidv4();
    return await runWithTraceIdAsync(traceId, async () => {
      const log = lazyLoggers.worker; 
      log.info(EVENTS.EXECUTION_TASK_START, { taskId: message.taskId });
    });
  });
  ```- **JSON 结构**：
  ```json
  {
    "timestamp": "2025-12-10T19:45:00.000Z",
    "level": "info",
    "module": "proxy",
    "layer": "L2",
    "source": "main",
    "traceId": "abc123-def456",
    "profileId": "p001",
    "msg": "🔍 Proxy health check",
    "context": { "status": "healthy", "latency": 50 }
  }
  ```
- **Icon 支持**：所有事件消息自动包含 Icon（🚀 ✅ ❌ 🔍 等），提升可读性
- **高频采样**：debug 10%，info 20%，warn/error 100%（自动处理）

#### ✅ 输出与存储
- **主进程**：Console (dev pretty 彩色) + 文件轮转 (`logs/main/%DATE%.log`) + 错误日志 (`logs/errors/%DATE%.error.log`)
- **Worker 进程**：原生 IPC 批量传输 → 主进程接收 → 文件轮转 (`logs/workers/{profileId}/%DATE%.log`)
- **Renderer 进程**：直接使用 console，无文件存储

---

### 22. 采样与阈值约定（增强层）

#### ✅ 高频事件采样
- **采样率**：debug 10%、info 20%（可调 env SAMPLE_RATE）。异常必 log。
- **阈值控制**：
  - 内存监控：>85% warn。
  - 注入失败：>5% error log。

---

### 23.2 代码审查强制检查项

#### 日志系统检查
- [ ] 使用 `lazyLoggers` 预配置 logger。
- [ ] 使用 `EVENTS` 常量作为消息 ID。
- [ ] **traceId 管理**：
  - [ ] 核心入口点必须创建 traceId。
  - [ ] 进程间通过 IPC 消息对象传递 traceId。
  - [ ] 使用 `runWithTraceIdAsync` 自动传播。
- [ ] **参数传递原则**：所有参数直接放在 context 中传递。
- [ ] **进程隔离导入**：
  - 主进程：从 `../log/index.js` 导入。
  - Worker 进程：从 `./log/index.js` 导入。
- [ ] Worker 进程日志通过原生 IPC 传输，无 stdout JSON。
- [ ] 文件存储路径：`~/Library/Application Support/VeilBrowser/logs/`。

#### 通信安全检查
- [ ] 日志无 `__veil` 等检测关键词。
- [ ] 敏感数据（如密码）已通过 DLP 自动脱敏。

---

### 23.1 进程日志使用规则（必须遵守）

#### ✅ 渲染进程：只使用 console.log
- **核心原则**：渲染进程（UI层）只使用原生 `console.log/error/warn/debug`
- **原因**：避免复杂的日志系统依赖，保持UI层轻量化

#### ✅ 主进程 & 子进程：使用结构化日志体系
- **主进程**：使用 `lazyLoggers` + Winston 文件轮转
- **子进程**：使用 `lazyLoggers` + 原生 IPC 传输

#### ❌ 严格禁止
- **渲染进程禁止使用 lazyLoggers**。
- **主/子进程禁止使用 console**。
- **禁止跨进程日志直接导入**。

