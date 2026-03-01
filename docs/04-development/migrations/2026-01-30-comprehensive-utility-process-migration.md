# Comprehensive UtilityProcess Migration Report

## 执行摘要

根据“彻底干掉 Node.js child_process 模式，只用最新的 UtilityProcess”的指令，我们完成了对全系统 Worker 进程启动机制的深度重构。

## 迁移详情

### 1. 通信基础设施重构 (`ProcessCommunicatorService.ts`)
*   **移除遗留逻辑**：彻底删除了 `child_process` 的类型引用和运行时分支。
*   **API 锁定**：`registerProcess` 和 `sendToChild` 现在仅支持 `UtilityProcess` 类型。
*   **协议对齐**：统一使用 `postMessage` 取代 `process.send`。

### 2. 批量创建器重构 (`profileCreatorWorker.ts` & `profileQueue.ts`)
*   **进程模型切换**：将原本运行在 `worker_threads` (共享内存线程) 的创建任务迁移到了 `UtilityProcess` (独立进程)。
*   **初始化协议**：由于 `UtilityProcess` 不支持 `workerData`，引入了 `INIT` 消息机制，确保 Worker 启动后正确接收任务列表。

### 3. 指纹评估 Worker 纯净化 (`detectionWorker.ts`)
*   **移除兼容层**：删除了 `communicator` 适配器中的 `process.send` 逻辑。
*   **强制执行**：在进程顶部增加了 `parentPort` 存在性检查，若非 UtilityProcess 环境直接抛出异常。

### 4. 执行引擎 Worker 纯净化 (`WorkerProcess.ts`)
*   **构造函数约束**：强制要求 `process.parentPort` 必须可用。
*   **自毁增强**：优化了 `parentPort.on('close')` 的监听逻辑，确保父进程崩溃时子进程绝对自毁。

## 遗留保留说明

以下地方保留了 `child_process` 引用，因为它们属于 OS 级交互，不在 UtilityProcess 替代范围内：
1.  **硬件识别** (`hardware.ts`): 使用 `execSync` 调用系统查询命令。
2.  **窗口控制** (`windowFocus.ts`): 使用 `exec` 调用系统 AppleScript/CMD。
3.  **构建脚本** (`scripts/`): 运行在纯 Node 环境下。

## 架构收益

*   **极简代码**：移除了大量的 `if (isUtilityProcess)` 判断逻辑。
*   **性能提升**：所有重负载任务现在均在完全独立的进程空间运行，主进程稳定性显著增强。
*   **标准化**：全系统通信协议统一为 `UtilityProcess Message` 风格。
