### Layer 5 分拆设计详细图

以下是针对"Layer 5 分拆为任务管理/队列（主进程，Layer 5a） + 执行引擎（子进程，Layer 5b）"的详细设计图。我使用纯文本 ASCII 艺术表示，确保清晰、可复制（无需工具渲染）。设计基于 VeilBrowser 的 Electron 架构，Layer 4（反检测）一并移到子进程（preload 注入）。**v1.1+ 已实现 ZMQ 通信方案**，替换 CDP fallback，实现真正的异步任务分发。

设计原则：
- **主进程 (Layer 5a)**：全局协调、低负载（队列 + 分发），访问 DB/日志。
- **子进程 (Layer 5b)**：本地执行、高隔离（Playwright + 反检测），每个 Profile 一个。
- **通信**：ZMQ Pub/Sub + Ack (主 → 子推送任务，子 → 主上报结果)，轻量 JSON（params/result），本地 ipc:// 模式，延迟 <1ms。
- **全局状态**：主进程聚合子进程反馈（Map<profileId, status>）。
- **内存方案**：无 DB 依赖，任务/结果在内存队列，重启时丢失（可 UI 提示重发）。

#### 图 1: 进程层级与组件分布（整体架构）
展示主/子进程分工，Layer 5 分拆后如何分布。

```
┌─────────────────────────────────────────────────────────────────┐
│ 主进程 (Main Process) - 全局协调层 (Layer 1-3 + Layer 5a)       │
│                                                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Layer 1: 基础设施           │ │ Layer 2: 代理网络            │ │
│ │ - SQLite DAO (tasks/logs)   │ │ - 健康检查 + IP 分配         │ │
│ │ - winston 日志 (traceId)    │ │ - emit 'changeProxy'         │ │
│ │ - 内存监控/告警             │ └─────────────────────────────┘ │
│ └─────────────────────────────┘                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Layer 3: 环境隔离           │ │ Layer 5a: 任务管理 (全局)    │ │
│ │ - 子进程 spawn + stdout 注册│ │ - 全局队列 (MemoryQueue)     │ │
│ │ - TabManager (多 Tab)       │ │ - 任务分发 (ZMQ Pub)         │ │
│ │ - getActiveContext()        │ │ - 状态聚合 (getQueueStatus)  │ │
│ └─────────────────────────────┘ │ - 结果监听 (ZMQ Sub)         │ │
│                                 │ - 优先级/SJF (v1.1+)        │ │
│ ┌─────────────────────────────┐ └─────────────────────────────┘ │
│ │ 通信枢纽: ZMQ + IPC Router  │                                 │
│ │ - ZMQ Pub: 'tasks:profileId'│                                │
│ │ - ZMQ Req/Rep: Ack 确认     │                                 │
│ │ - ZMQ Sub: 'results:profileId'│                              │
│ │ - IPC: execution:run (Layer 6)│                               │
│ │ - 聚合反馈 → Layer 6 (IPC)  │                                 │
│ └─────────────────────────────┘                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │ ZMQ Pub/Sub (任务/结果 JSON) + Req/Rep (Ack)
                  │ ipc:// 模式 (本地文件系统 socket)
                  ▼ (多个子进程，并行)
┌─────────────────────────────┐   ┌─────────────────────────────┐   ┌─────────────────────────────┐
│ 子进程 1 (Profile p1)       │   │ 子进程 2 (Profile p2)       │   │ ... 子进程 N (Profile pN)   │
│ ┌───────────────────────────┐ │   ┌───────────────────────────┐ │   ┌───────────────────────────┐ │
│ │ Layer 5b: 执行引擎 (本地) │ │   │ Layer 5b: 执行引擎 (本地) │ │   │ Layer 5b: 执行引擎 (本地) │ │
│ │ - ZMQ Sub: 监听任务      │ │   │ - ZMQ Sub: 监听任务      │ │   │ - ZMQ Sub: 监听任务      │ │
│ │ - ZMQ Rep: Ack 确认      │ │   │ - ZMQ Rep: Ack 确认      │ │   │ - ZMQ Rep: Ack 确认      │ │
│ │ - ZMQ Pub: 结果反馈      │ │   │ - ZMQ Pub: 结果反馈      │ │   │ - ZMQ Pub: 结果反馈      │ │
│ │ - localExecutor.run()    │ │   │ - localExecutor.run()    │ │   │ - localExecutor.run()    │ │
│ │   (actions 数组执行)      │ │   │   (actions 数组执行)      │ │   │   (actions 数组执行)      │ │
│ │ - TabManager 多 Tab 支持 │ │   │ - TabManager 多 Tab 支持 │ │   │ - TabManager 多 Tab 支持 │ │
│ └───────────────────────────┘ │   └───────────────────────────┘ │   └───────────────────────────┘ │
│ ┌───────────────────────────┐ │   ┌───────────────────────────┐ │   ┌───────────────────────────┐ │
│ │ Layer 4: 反检测 (本地)    │ │   │ Layer 4: 反检测 (本地)    │ │   │ Layer 4: 反检测 (本地)    │ │
│ │ - preload initScript      │ │   │ - preload initScript      │ │   │ - preload initScript      │ │
│ │   (stealth + 噪声注入)    │ │   │   (stealth + 噪声注入)    │ │   │   (stealth + 噪声注入)    │ │
│ │ - applyAntiDetection      │ │   │ - applyAntiDetection      │ │   │ - applyAntiDetection      │ │
│ │   (Profile 特定)          │ │   │   (Profile 特定)          │ │   │   (Profile 特定)          │ │
│ └───────────────────────────┘ │   └───────────────────────────┘ │   └───────────────────────────┘ │
│ ┌───────────────────────────┐ │   ┌───────────────────────────┐ │   ┌───────────────────────────┐ │
│ │ Playwright (本地)         │ │   │ Playwright (本地)         │ │   │ Playwright (本地)         │ │
│ │ - page 对象 (多 Tab)      │ │   │ - page 对象 (多 Tab)      │ │   │ - page 对象 (多 Tab)      │ │
│ │ - 无 CDP 代理 (直接执行)  │ │   │ - 无 CDP 代理 (直接执行)  │ │   │ - 无 CDP 代理 (直接执行)  │ │
│ └───────────────────────────┘ │   └───────────────────────────┘ │   └───────────────────────────┘ │
└───────────────────────────────┘   └───────────────────────────────┘   └───────────────────────────────┘
```

**图说明**：
- **主进程**：协调全局（队列 + ZMQ Pub），低负载（调度/聚合）。
- **子进程**：每个 Profile 独立执行（Layer 5b + 4），高并行（本地 Playwright）。
- **数据流**：主推送任务（ZMQ Pub "tasks:profileId"），子返回结果（ZMQ Pub "results:profileId"），Ack 确认交付（ZMQ Req/Rep）。
- **规模**：100 Profile = 100 子进程，每个子进程 ~200-300MB，执行隔离。
- **通信**：ZMQ ipc:// 模式（本地文件系统 socket），延迟 <1ms，无端口管理负担。

#### 图 2: 任务分发与执行流程（时序图，文本版）
展示一个任务从 Layer 6 到执行的完整流程，突出拆分后的交互。

```
时间轴 → (主进程 | 子进程 p1 | Layer 6)
1. Layer 6: execution.run([{id: 'p1'}, {id: 'p2'}], actions)  [渲染进程 IPC]
   ↓ IPC (execution:run)
2. 主进程 Layer 5a: executionManager.run() → ZMQ Pub 任务
   - 全局队列: MemoryQueue (状态查询)
   - ZMQ Pub: "tasks:p1" + "tasks:p2" (JSON: {taskId, actions, options})
   - ZMQ Req: 等待 Ack (确认交付，不等待执行)
   ↓ ZMQ Pub/Sub (ipc:///tmp/veil-tasks-pub)
3. 子进程 p1 Layer 5b: ZMQ Sub 接收任务 → 立即 Ack
   - ZMQ Rep: 回复 'ACKED' (10ms，不阻塞)
   - 异步执行 localExecutor.run(actions):
     - for step in actions:
       - applyAntiDetection (Layer 4, preload 注入)
       - TabManager.executeInTab(tabId, step)  [本地 CDP，多 Tab 支持]
     - result = TaskResult[] (per-tab 结果)
   ↓ ZMQ Pub (ipc:///tmp/veil-results-pub)
4. 主进程 Layer 5a: ZMQ Sub 接收结果 → handleResult()
   - 更新 activeTasks (聚合 per-profile 结果)
   - getQueueStatus() 包含子进程反馈
   ↓ IPC 事件 (可选，通知 Layer 6)
5. Layer 6: 轮询 getTaskStatus() 或监听 IPC 事件 → Zustand 更新 UI
   - 如果失败: 评估条件 → 重试或 Layer 7 自愈

错误路径 (e.g., step 失败):
- 子进程: catch → Pub 失败结果 ({success: false, error})
- 主进程: handleResult() → mark failed → 通知 Layer 6
- Layer 6: 重新编排 (DAG 调整) → 新任务回主队列 (ZMQ Pub)
```

**流程说明**：
- **分发逻辑**：主 Layer 5a 用 ZMQ Pub 广播任务到 "tasks:profileId" topic，子进程 Sub 订阅自己的 topic。
- **执行**：子 Layer 5b 异步执行（不阻塞 Ack），支持多 Tab 并行（TabManager），Layer 4 注入无缝（initScript）。
- **反馈**：ZMQ Pub/Sub 异步（延迟 <1ms），结果通过 "results:profileId" topic 返回，主进程 Sub 聚合。
- **时序**：单任务 ~50ms (ZMQ Pub 1ms + Ack 10ms + 执行 40ms)，批量 <200ms（并行）。
- **可靠性**：Ack 确认交付（Req/Rep），p-retry 重发（3 次 backoff），结果无 Ack（单向通知）。

#### 图 3: 关键接口与数据流（组件视图）
非图形，但表格化说明接口（主/子间），确保类型安全。

| 组件 | 位置 | 接口/方法 | 输入 | 输出 | 通信类型 | 说明 |
|------|------|-----------|------|------|----------|------|
| **全局队列** | 主 Layer 5a | enqueue(task: ExecutionTask) | Layer 6 IPC | - | 内部 (MemoryQueue) | 状态查询和向后兼容，实际分发通过 ZMQ |
| **任务分发器** | 主 Layer 5a | distributeTask(task) | run() 调用 | ZMQ Pub | ZMQ Pub/Sub | Pub 任务到 "tasks:profileId" topic，Req Ack 确认 |
| **Ack 确认** | 主 Layer 5a | ackReq.send/receive() | distributeTask | 'ACKED' | ZMQ Req/Rep | 确认任务交付（不等待执行），p-retry 重发 |
| **本地执行器** | 子 Layer 5b | localExecutor.run(actions, tabs) | ZMQ Sub | TaskResult[] | ZMQ Sub + 本地执行 | 监听 "tasks:profileId"，执行 actions，Pub 结果 |
| **结果监听** | 主 Layer 5a | startResultListener() | ZMQ Sub | handleResult() | ZMQ Pub/Sub | Sub "results:profileId"，聚合到 activeTasks |
| **结果发布** | 子 Layer 5b | resultPub.send() | run() 完成 | JSON | ZMQ Pub/Sub | Pub 结果到 "results:profileId"（无 Ack，异步） |
| **反检测注入** | 子 Layer 4 | applyLocalAntiDetection(page) | run() 内 | 伪装 page | 内部 (preload) | initScript (stealth + 噪声)，Profile 特定 |

**数据流示例** (actions 数组任务)：
- 主: execution.run([{id: 'p1'}], [{action: 'goto', params: {...}}, {action: 'click', params: {...}}])
- 主: ZMQ Pub "tasks:p1" + JSON({taskId, actions, options}) → ZMQ Req Ack (等待 'ACKED')
- 子: ZMQ Sub 接收 → ZMQ Rep 'ACKED' (立即) → 异步执行 localExecutor.run(actions)
- 子: for step in actions: TabManager.executeInTab() → collect results → ZMQ Pub "results:p1" + JSON({taskId, result})
- 主: ZMQ Sub 接收结果 → handleResult() → aggregate → Layer 6 UI (轮询或 IPC 事件)

#### 实施注意
- **ZMQ 配置**：ipc:// 模式（本地文件系统 socket），endpoints: `/tmp/veil-tasks-pub`, `/tmp/veil-ack-req`, `/tmp/veil-results-pub`。
- **Ack 机制**：立即 Ack（确认交付），不等待执行完成，避免阻塞。p-retry 重发（3 次，exponential backoff）。
- **内存方案**：无 DB 持久化，任务/结果在内存（activeTasks Map），重启时丢失（可 UI 提示重发）。
- **错误处理**：子崩溃 → 主检测无 Ack，标记失败；结果丢失 → 主超时处理（5min 无结果标记失败）。
- **监控**：主聚合子进程指标（ZMQ 消息计数），可选心跳（ZMQ Pub "heartbeat:profileId"）。
- **成本**：ZMQ 轻量（~1MB），无外部服务，本地延迟 <1ms，适合 100+ Profile 并发。

#### ZMQ 实现细节（v1.1+）

**主进程 (executionManager.ts)**：
- **初始化**：constructor 中创建 ZMQ sockets（Publisher, Request, Subscriber），bind/connect endpoints。
- **任务分发**：`distributeTask()` 方法为每个 Profile pub 任务到 "tasks:profileId" topic，然后 req ack（等待 'ACKED'）。
- **结果监听**：`startResultListener()` 异步循环 sub "results:*" topic，收到结果调用 `handleResult()` 更新任务状态。

**子进程 (localExecutor.ts)**：
- **初始化**：`initZmq(profileId)` 创建 sockets（Subscriber, Reply, Publisher），connect/bind endpoints，订阅 "tasks:profileId"。
- **任务监听**：`startTaskListener()` 异步循环 sub 任务，收到后立即 rep 'ACKED'，然后异步执行 `run()`。
- **结果发布**：执行完成后 pub 结果到 "results:profileId" topic（无 Ack，单向通知）。

**优势**：
- **异步非阻塞**：主进程不等待执行完成，立即返回 taskId。
- **轻量高效**：本地 ipc:// 模式，延迟 <1ms，无端口管理。
- **可扩展**：未来可桥接 Redis（云版），无缝迁移。

**注意事项**：
- ZMQ sockets 需要在进程退出时正确关闭（避免文件锁）。
- 多个子进程共享同一个 ack-req endpoint，需要正确处理并发（ZMQ 自动处理）。
- 结果通道无 Ack，依赖主进程超时处理（5min 无结果标记失败）。

这个设计图全面覆盖了分拆思路和 ZMQ 实现。如果需要 Mermaid 代码版（可复制到工具渲染）或特定部分的放大图，请告知！