# Fingerprint Assessment Architecture Refactor

## 执行摘要

响应“指纹评估进程也应使用 UtilityProcess + RPC 体系”的架构建议，我们对 L4 层指纹评估功能进行了彻底的后端重构。

## 变更详情

### 1. Worker 升级 (`src/processes/detectionWorker.ts`)
*   **兼容性增强**：引入 `worker_threads.parentPort`，使其同时支持 Node.js `child_process` (旧模式) 和 Electron `utilityProcess` (新模式)。
*   **通信层抽象**：封装了 `communicator` 对象，屏蔽了底层 IPC 差异（`process.send` vs `parentPort.postMessage`）。

### 2. 新增 RPC 处理器 (`src/main/ipc/handlers/profile/assessment.handler.ts`)
*   **专用 Handler**：实现了 `profile:assessFingerprintSecurity` 接口。
*   **进程隔离**：使用 `utilityProcess.fork` 启动独立的评估进程，确保主进程 UI 不受高负载计算影响。
*   **RPC 实现**：实现了完整的请求/响应生命周期管理，包括超时控制、错误处理和资源清理。
*   **事件桥接**：将 Worker 的 `PROGRESS_UPDATE` 实时转发给渲染进程。

### 3. 注册集成 (`src/main/core/business.ts`)
*   在 `initializeAntiDetectionLayer` 中注册了新的 Handler，确保应用启动时服务就绪。

## 架构收益

*   **性能**：评估任务现在运行在完全独立的 V8 实例中，不再阻塞主线程事件循环。
*   **安全**：Worker 运行在受限环境中。
*   **一致性**：与 L5 执行引擎 (`TaskExecutor`) 采用了相同的 `WorkerRPC` 架构模式。
