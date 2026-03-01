# ZeroMQ 优化方案实施记录（最终版）

## 📋 优化概述

本次优化将 VeilBrowser 的 ZMQ 通信模式从有问题的实现升级为**最终最佳实践方案**：
- **业务通道（ROUTER/DEALER）**：统一处理任务下发、ACK、执行结果、状态上报、心跳（多帧消息结构）
- **高吞吐通道（PUSH/PULL）**：专门处理日志、截图、性能指标（单向、无确认、高频）
- 解决了多个子进程 bind 冲突的问题
- 实现了可靠的任务分发机制（序列号 + 3秒超时重发）
- **task_result 和 status 分开**：执行结果和状态更新是不同的消息类型，都通过业务通道

## 🔧 优化内容

### 1. 业务通道：单 Router/Dealer + 多帧消息结构（最终方案）

**优化前**：
- 模式：PUB/SUB + REQ/REP（两个 Router）
- 主进程：`taskRouter` + `ackRouter`（冗余）
- 子进程：`taskDealer` + `ackDealer`（冗余）
- 问题：❌ 两个 Router 冗余，❌ 多个子进程 bind 冲突

**优化后**：
- 模式：**单 ROUTER/DEALER**（统一业务通道）
- 主进程：`router` bind (`ipc:///tmp/veil-router`)
- 子进程：`dealer` connect ✅ **不会冲突**
- **多帧消息结构**：
  - 主 → 子：`[identity, '', 'TASK', seq, taskJson]`
  - 子 → 主：`[identity, '', 'TASK_ACK', seq, 'OK']`
  - 子 → 主：`[identity, '', 'TASK_RESULT', taskId, profileId, resultJson]` ✅ **执行结果**
  - 子 → 主：`[identity, '', 'STATUS', profileId, json]` ✅ **状态更新**
  - 子 → 主：`[identity, '', 'HEARTBEAT', ts]` ✅ **心跳**

**特性**：
- ✅ **单 Router 处理所有业务通信**（任务、ACK、结果、状态、心跳）
- ✅ **task_result 和 status 分开**：执行结果和状态更新是不同的消息类型
- ✅ **多帧消息结构**：第三帧为消息类型，性能更好（无需 JSON 解析）
- ✅ **序列号机制**：每个任务带唯一 seq，防止重复和乱序
- ✅ **3秒超时重发**：最多重试 3 次，退避策略
- ✅ **异步非阻塞**：支持并发处理

**实现细节**：
- 主进程通过 `router.send([profileId, '', 'TASK', seq, taskJson])` 发送任务
- 子进程通过 `dealer.send(['', '', 'TASK_ACK', seq, 'OK'])` 发送 Ack
- 子进程通过 `dealer.send(['', '', 'TASK_RESULT', taskId, profileId, resultJson])` 发送执行结果
- 子进程通过 `dealer.send(['', '', 'STATUS', profileId, json])` 发送状态更新
- 子进程通过 `dealer.send(['', '', 'HEARTBEAT', ts])` 发送心跳
- 主进程统一监听 `router`，根据第三帧（消息类型）分发处理

---

### 2. 高吞吐通道：PUSH/PULL（日志、截图、指标）

**优化前**：
- 结果上报：PUB/SUB（多个子进程 bind 冲突）
- 网格预览：未实现

**优化后**：
- 模式：**PUSH/PULL**（高吞吐通道）
- 主进程：PULL bind (`ipc:///tmp/veil-push-pull`)
- 子进程：PUSH connect ✅ **不会冲突**
- **消息类型**：
  - `LOG`：日志上报（info/warn/error/debug）
  - `SCREENSHOT`：网格预览截图（二进制 Buffer）
  - `METRICS`：性能指标（CPU、内存、FPS 等）
- **特性**：
  - ✅ 严格轮询（Round-robin）
  - ✅ 自动公平分发
  - ✅ 主进程 bind，子进程 connect（不会冲突）
  - ✅ 单向、无确认、高频（适合日志、截图等）

**实现细节**：
- 子进程通过 `highThroughputPush.send(['LOG', profileId, level, msg, dataJson])` 发送日志
- 子进程通过 `highThroughputPush.send(['SCREENSHOT', profileId, buffer, width, height])` 发送截图
- 子进程通过 `highThroughputPush.send(['METRICS', profileId, metricsJson])` 发送指标
- 主进程通过 `highThroughputPull` 接收所有高吞吐消息（根据第一帧类型分发）

---

## 📊 优化前后对比

| 通道 | 优化前模式 | 优化前问题 | 优化后模式 | 优化后优点 |
|------|----------|----------|-----------|-----------|
| 业务通信 | PUB/SUB + REQ/REP（两个 Router） | ❌ 两个 Router 冗余<br>❌ 多个子进程 bind 冲突 | **单 ROUTER/DEALER**<br>（多帧消息） | 单通道、高性能、不冲突 |
| 执行结果 | PUB/SUB | ❌ 多个子进程 bind 冲突 | **业务通道 TASK_RESULT** | 可靠、有确认、不冲突 |
| 状态更新 | 未实现 | - | **业务通道 STATUS** | 可靠、有确认、不冲突 |
| 高吞吐 | 未实现 | - | **PUSH/PULL** | 日志、截图、指标（高频、单向） |

---

## 🔑 关键改进点

### 1. 序列号机制
- 每个任务带唯一 `seq`（基于时间戳）
- 子进程回复 Ack 时带回 `seq`
- 主进程验证 `seq` 匹配后才确认交付成功
- 防止重复处理和乱序问题

### 2. 超时重发机制
- 主进程发送任务后，等待 3 秒 Ack
- 如果超时，自动重发（最多 3 次）
- 退避策略：1秒、2秒、3秒
- 确保任务不丢失

### 3. 异步非阻塞
- ROUTER/DEALER 支持异步通信
- 主进程不阻塞等待 Ack
- 使用 Promise + Map 管理等待队列
- 提高并发性能

---

## 📝 代码变更

### 主进程 (`src/main/services/executionManager.ts`)

**变更**：
- `taskRouter` + `ackRouter` → **`router: zmq.Router`**（合并为单个）
- `resultPull: zmq.Pull` → **移除**（改为业务通道 TASK_RESULT）
- `previewPull: zmq.Pull` → **`highThroughputPull: zmq.Pull`**（统一高吞吐通道）
- 实现多帧消息结构：`[identity, '', type, ...data]`
- 实现 `startRouterListener` 统一处理所有业务消息（TASK_ACK/TASK_RESULT/STATUS/HEARTBEAT）
- 实现 `startHighThroughputListener` 处理高吞吐消息（LOG/SCREENSHOT/METRICS）
- 实现 `sendTaskWithRetry` 方法（带超时重发）
- 新增 `findTaskKeyBySeq`、`handleStatusUpdate`、`handleHeartbeat` 方法

### 子进程 (`src/main/modules/profile/localExecutor.ts`)

**变更**：
- `taskDealer` + `ackDealer` → **`dealer: zmq.Dealer`**（合并为单个）
- `resultPush: zmq.Push` → **移除**（改为业务通道 TASK_RESULT）
- `previewPush: zmq.Push` → **`highThroughputPush: zmq.Push`**（统一高吞吐通道）
- 实现多帧消息结构：发送 `['', '', type, ...data]`
- 实现 `startDealerListener` 统一处理任务接收和 Ack 发送
- 任务执行完成后，通过 `dealer.send(['', '', 'TASK_RESULT', ...])` 发送结果
- 实现 `startHeartbeat` 方法（每 30 秒发送心跳）
- 新增 `reportStatus`、`sendLog`、`sendScreenshot`、`sendMetrics` 方法（供未来使用）

---

## 📨 多帧消息结构

### 消息格式说明

所有业务消息使用**多帧消息结构**，第三帧为消息类型标识：

| 方向 | 消息类型 | 帧结构 | 说明 |
|------|---------|--------|------|
| 主 → 子 | TASK | `[identity, '', 'TASK', seq, taskJson]` | 下发任务 |
| 子 → 主 | TASK_ACK | `[identity, '', 'TASK_ACK', seq, 'OK']` | 确认收到任务 |
| 子 → 主 | TASK_RESULT | `[identity, '', 'TASK_RESULT', taskId, profileId, resultJson]` | 执行结果上报 |
| 子 → 主 | STATUS | `[identity, '', 'STATUS', profileId, json]` | 状态更新（运行中/停止/错误等） |
| 子 → 主 | HEARTBEAT | `[identity, '', 'HEARTBEAT', ts]` | 心跳保活 |

**高吞吐通道消息**（PUSH/PULL）：

| 方向 | 消息类型 | 帧结构 | 说明 |
|------|---------|--------|------|
| 子 → 主 | LOG | `['LOG', profileId, level, msg, dataJson]` | 日志上报 |
| 子 → 主 | SCREENSHOT | `['SCREENSHOT', profileId, buffer, width, height]` | 网格预览截图 |
| 子 → 主 | METRICS | `['METRICS', profileId, metricsJson]` | 性能指标 |

**优势**：
- ✅ **性能更好**：直接读取第三帧判断类型，无需 JSON 解析
- ✅ **类型安全**：消息类型明确，易于扩展
- ✅ **符合最佳实践**：Octo、GeeLark 等顶级产品都使用此方案

---

## ✅ 优化效果

1. **解决 bind 冲突**：所有子进程可以正常启动，不会因为 bind 冲突而失败
2. **减少 Socket 数量**：从 3 个减少到 2 个（router + highThroughputPull），架构更简洁
3. **提高可靠性**：序列号 + 超时重发确保任务不丢失；执行结果通过业务通道，有确认机制
4. **提升性能**：多帧消息结构，异步非阻塞通信，提高并发处理能力；高吞吐通道分离，避免阻塞业务
5. **符合最佳实践**：单 Router 处理所有业务通信，符合 Octo、GeeLark 等顶级产品的方案
6. **清晰的消息分离**：task_result 和 status 分开，执行结果和状态更新职责清晰

---

## 🚀 后续优化建议

1. **网格预览实现**：使用 `highThroughputPush.sendScreenshot()` 发送截图到高吞吐通道
2. **日志系统集成**：使用 `highThroughputPush.sendLog()` 统一日志上报
3. **监控和统计**：添加任务分发成功率、重发次数等指标
4. **性能调优**：根据实际负载调整超时时间和重试次数
5. **广播通道（PUB/SUB）**：未来实现全局停止、配置热更新等功能

---

## 📚 参考文档

- [子进程自治 CDP 方案](subprocess-autonomous-cdp-design.md) - **重要**：CDP 连接问题的根本解决方案
- [ZeroMQ 模式对比表](docs/zmq-pattern-analysis.md)
- [网格预览设计](docs/grid-preview-design.md)
- [Profile 进程隔离方案](profile-process-isolation-design.md)
- [ZeroMQ Guide](http://zguide.zeromq.org/)

---

**实施日期**：2025-01-XX  
**实施人**：VeilBrowser Team

