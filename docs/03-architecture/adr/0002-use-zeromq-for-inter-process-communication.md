# ADR 0002: 使用 ZeroMQ 进行进程间通信

## 状态

已废弃 - 已迁移至直接 IPC 通信

## 更新说明

2025年初，经 ADR 0004 决策，已从 ZeroMQ 通信方案迁移至直接 IPC 通信。原因：
- **性能提升 60%**: 移除异步通信和序列化开销
- **代码简化**: 减少 2000+ 行复杂抽象代码
- **维护性**: 原生 IPC 稳定可靠，无额外依赖
- **类型安全**: 编译时检查所有消息结构

## 背景

VeilBrowser 需要主进程和多个 Playwright 子进程之间进行高效通信，主要用于：
1. 截图推送（从子进程到主进程）
2. 任务执行结果反馈（从子进程到主进程）
3. 任务下发（从主进程到子进程）

在选择进程间通信方案时，我们评估了多种方案。

## 决策

我们选择 **ZeroMQ (ZMQ)** 作为主进程和 Playwright 子进程之间的通信机制。

## 理由

### 1. 高性能和低延迟

- **ZeroMQ** 是高性能消息队列库，延迟极低（< 1ms）
- 支持多种通信模式（PUSH/PULL、PUB/SUB、REQ/REP）
- **IPC** 虽然简单，但性能较差，不适合高频通信

### 2. 异步非阻塞

- **ZeroMQ** 是完全异步的，不会阻塞主进程
- 支持批量消息处理
- **IPC** 是同步的，可能阻塞主进程

### 3. 跨平台支持

- **ZeroMQ** 支持 Windows、macOS、Linux
- 与 Electron 完美集成
- **IPC** 虽然也跨平台，但功能有限

### 4. 灵活的通信模式

- **PUSH/PULL**：用于截图推送（一对多）
- **PUB/SUB**：用于广播消息（一对多）
- **REQ/REP**：用于请求/响应（一对一）

### 5. 成熟稳定

- **ZeroMQ** 是成熟的消息队列库，被广泛使用
- 社区活跃，问题响应快
- **IPC** 虽然简单，但功能有限

### 6. 适合我们的场景

- 截图推送：高频、低延迟、一对多
- 任务反馈：异步、非阻塞、一对多
- 任务下发：异步、非阻塞、一对多

## 后果

### 正面影响

- ✅ 高性能和低延迟（截图推送 < 1ms）
- ✅ 异步非阻塞（不阻塞主进程）
- ✅ 灵活的通信模式（支持多种场景）
- ✅ 跨平台支持（Windows、macOS、Linux）

### 负面影响

- ⚠️ 需要安装 native 模块（`electron-rebuild`）
- ⚠️ 学习曲线稍陡（但文档完善）

### 风险

- **低风险**：ZeroMQ 是成熟稳定的库
- **缓解措施**：充分测试，确保跨平台兼容性

## 替代方案

### 方案 A：使用 Electron IPC

**优点**：
- 简单易用
- 无需额外依赖

**缺点**：
- 性能较差（不适合高频通信）
- 同步阻塞（可能阻塞主进程）
- 功能有限（不支持一对多）

### 方案 B：使用 WebSocket

**优点**：
- 跨平台支持
- 支持双向通信

**缺点**：
- 性能较差（HTTP 协议开销）
- 配置复杂（需要服务器）
- 不适合进程间通信

### 方案 C：使用共享内存

**优点**：
- 性能极高
- 零拷贝

**缺点**：
- 实现复杂
- 跨平台兼容性差
- 不适合我们的场景

## 实施

- ✅ 已集成 ZeroMQ（`package.json`）
- ✅ 已实现截图推送（`screenshotService.ts`）
- ✅ 已实现任务反馈（`executionManager.ts`）
- ✅ 已实现 ZMQ 优化（详见 [ZeroMQ Optimization](../zmq-optimization.md)）

## 通信模式

### 截图推送（PUSH/PULL）

```
Playwright 子进程 (PUSH) → ZMQ Socket → 主进程 (PULL)
```

### 任务反馈（PUSH/PULL）

```
Playwright 子进程 (PUSH) → ZMQ Socket → 主进程 (PULL)
```

### 任务下发（REQ/REP）

```
主进程 (REQ) → ZMQ Socket → Playwright 子进程 (REP)
```

## 参考

- [ZeroMQ 官方文档](https://zeromq.org)
- [ZeroMQ Optimization](../zmq-optimization.md)
- [子进程自治 CDP 方案](../subprocess-autonomous-cdp-design.md)

---

**创建日期**: 2025-01-XX  
**最后更新**: 2025-01-XX  
**决策者**: VeilBrowser Team

