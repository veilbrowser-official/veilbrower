# 架构约束 (Architecture Constraints)

## 🔄 工作流变量替换规则

### ⚠️ 核心原则

```text
2025 年工作流变量替换铁律：
「两阶段替换、职责分离、统一解析器」—— 初始变量在任务创建时替换，运行时变量在步骤执行时替换
→ 任何违反将导致变量替换混乱、性能下降、维护困难。
```

---

### 26. 变量替换架构

#### ✅ 两阶段替换策略

- **阶段 1：任务创建时替换初始变量**（`executionCoordinator.coordinateExecution()`）
  - **职责**：替换已知的初始变量（工作流启动时已知的变量）
  - **时机**：任务创建前，在 `coordinateExecution()` 中完成
  - **变量来源**：`initialVars`（工作流定义中的 `variables` + 用户传入的 `initialVars`）
  - **优点**：提前替换，减少运行时开销，任务对象中已包含替换后的值

- **阶段 2：步骤执行时替换运行时变量**（`stepRunner.runStepAsExecution()`）
  - **职责**：替换动态生成的运行时变量（步骤执行时产生的变量）
  - **时机**：步骤执行前，在 `runStepAsExecution()` 中完成
  - **变量来源**：合并 `initialVars` 和 `context.variables`（运行时变量优先级更高）
  - **优点**：支持依赖前序步骤结果的场景（如 `extractData` 提取的数据）

#### ✅ 统一变量解析器

- **必须使用 `VariableResolver`**：所有变量替换必须使用 `VariableResolver.replaceVariables()` 静态方法
- **语法支持**：统一支持 `{{ $var }}` 和 `{{$var}}` 两种格式（兼容空格）
- **未找到变量**：保持原样（`{{$varName}}`），不抛出错误

#### ❌ 禁止行为

- **禁止重复替换**：初始变量已在任务创建时替换，步骤执行时只替换运行时变量
- **禁止使用 `resolveVariables()` 函数**：已废弃，必须使用 `VariableResolver.replaceVariables()`
- **禁止混用不同的变量替换逻辑**：所有变量替换必须通过 `VariableResolver` 统一处理

---

## 👤 L6 层单 Profile 原则

### ⚠️ 核心原则

```text
2025 年 L6 层架构铁律：
「L6 层只支持单 Profile，多 Profile 在应用层循环调用」—— 职责清晰、代码简洁、易于维护
→ 任何违反将导致架构混乱、职责不清、维护困难。
```

---

### 30. L6 层单 Profile 架构

#### ✅ L6 层单 Profile 原则

- **workflowRunner.execute()**：只接受单个 `profileId: string`
- **executionCoordinator.coordinateExecution()**：只接受单个 `profileId: string`
- **executionCoordinator.createTask()**：只接受单个 `profileId: string`（不再使用 `createSingleTask`）
- **stepRunner.runStepAsExecution()**：只接受单个 `profileId: string`

#### ✅ 多 Profile 处理策略

- **应用层（workflowScheduler）**：负责多 Profile 批量调度（Facade 模式）
  - 单个 profile：直接调用 `workflowManager.runWorkflow()`（简单直接，调试方便）
  - 多个 profiles：并发控制 + 循环调用 `workflowManager.runWorkflow()`
- **L5 层（executionManager）**：支持多 Profile 并发执行（接口设计，用于未来扩展）
- **L6 层**：只处理单个工作流实例，不处理批量调度

---

## 🎯 应用层调度器架构原则

### ⚠️ 核心原则

```text
2025 年应用层架构铁律：
「调度器作为统一入口（Facade 模式），workflowManager 只处理单个工作流实例」—— 职责清晰、代码简洁、易于维护
→ 任何违反将导致架构混乱、职责不清、维护困难。
```

---

### 32. Facade 模式调度器架构

#### ✅ 调度器作为统一入口（Facade 模式）

- **workflowScheduler.runWorkflow()**：统一对外接口（单任务和批量任务都通过这里）
- **内部路由**：
  - 单任务：直接调用 `workflowManager.runWorkflow()`（简单直接，调试方便）
  - 批量任务：并发控制 + 循环调用 `workflowManager.runWorkflow()`
- **职责**：
  - 统一接口：所有工作流执行都通过调度器
  - 内部优化：单任务无额外开销，批量任务并发控制
  - 易于扩展：优先级、重试、限流等

#### ✅ workflowManager 单工作流实例原则

- **workflowManager.runWorkflow()**：只接受单个 `profileId: string`
- **职责**：单个工作流实例的完整生命周期
  - 加载/验证/规划
  - 协调执行（创建任务，替换初始变量）
  - 注册状态
  - 执行工作流

---

## 🔌 渲染进程通信架构原则

### ⚠️ 核心原则

```text
2025 年渲染进程通信铁律：
「渲染进程 ↔ 主进程直接使用 IPC，不用事件总线中转」—— 性能更好、更稳定、代码更清晰
→ 任何违反将导致性能下降、架构混乱、调试困难。
```

---

### 33. 直接 IPC 通信架构

#### ✅ 直接 IPC 通信架构

- **渲染进程 ↔ 主进程**：使用 `sendToRenderer(channel, data)` 工具函数（封装 `getMainWindow().webContents.send()`），渲染进程使用 `ipcRenderer.on` 监听。
- **主进程 ↔ Worker 进程**：必须使用 Node.js 原生 IPC (`process.send()` / `child.on('message')`)，严禁使用 ZMQ 或其他外部消息队列。
- **优势**：
  - **性能更好**：直接 IPC，无 ZMQ/EventBus 抽象层和序列化开销。
  - **更稳定**：减少外部依赖，利用 Electron/Node.js 原生通信机制。
  - **代码更清晰**：业务逻辑直接交互，链路短，调试友好。

#### ❌ 禁止行为

- **禁止使用 ZMQ**：单机版产品已彻底移除 ZMQ 依赖。
- **禁止通过 EventBus 转发到渲染进程**：所有渲染进程事件必须直接通过 Electron IPC 发送。
- **禁止在主进程与 Worker 之间建立复杂的订阅模型**：优先使用请求-响应式或单向事件推送。

#### ✅ 主进程内部通信

- **进程内事件**：使用 `InternalEventEmitterService` (基于 Node.js 原生 `EventEmitter`) 处理主进程模块间的解耦。
- **状态同步**：复杂的模块间状态同步应优先考虑 Service 直接调用，仅在高度解耦场景下使用事件。

---

## 🏗️ 工作流执行各层职责范围

### ⚠️ 核心原则

```text
2025 年工作流执行职责铁律：
「L6 层只负责单个工作流执行，不关注批量任务；执行历史不关注批量任务；任务中心自己维护映射关系」—— 职责清晰、边界明确、易于维护
→ 任何违反将导致职责混乱、代码耦合、维护困难。
```

---

### 34. 各层职责范围

#### ✅ L6 层（WorkflowScheduler/WorkflowManager/WorkflowRunner/ExecutionCoordinator）

**职责**：

- **只负责单个工作流实例的执行**：加载、验证、规划、协调、执行
- **只接受单个 `profileId: string`**：不支持批量处理
- **只关注工作流执行本身**：不关注批量任务、任务中心等应用层概念

**禁止关注**：

- ❌ **禁止关注 `batchTaskId`**：L6 层完全不知道批量任务的存在
- ❌ **禁止关注任务中心状态**：不关心批量任务的进度、状态等
- ❌ **禁止传递 `batchTaskId`**：所有 L6 层方法签名中不得包含 `batchTaskId` 参数

**允许关注**：

- ✅ **`workflowTaskId`（L6 层工作流任务ID）**：用于建立 L6 层到 L5 层的映射关系
- ✅ **`executionTaskId`（L5 层执行任务ID）**：用于建立映射关系

**ID 映射职责**：

- ✅ **WorkflowStateService**：维护 `workflowTaskId`（L6层）↔ `executionTaskId`（L5层）映射
- ✅ **映射建立时机**：在 `workflowManager.runWorkflow()` 中，当 `executionTaskId` 创建后立即建立

#### ✅ 执行历史层（WorkflowExecutionHistoryService）

**职责**：

- **只负责工作流执行历史的创建、更新、查询、统计**
- **只关注工作流执行本身**：记录执行过程、结果、错误等

**禁止关注**：

- ❌ **禁止关注 `batchTaskId`**：执行历史不应该存储或查询 `batchTaskId`
- ❌ **禁止在类型定义中包含 `batchTaskId`**：`WorkflowExecutionHistory` 接口中不得包含 `batchTaskId` 字段
- ❌ **禁止在查询过滤器中包含 `batchTaskId`**：`ExecutionHistoryFilters` 接口中不得包含 `batchTaskId` 字段

**允许关注**：

- ✅ **`workflowId`**：工作流定义ID
- ✅ **`profileId`**：Profile ID
- ✅ **`taskId`**：L5 层执行任务ID（用于关联 ExecutionTask）

#### ✅ 应用层（BatchTaskScheduler/BatchTaskStateService）

**职责**：

- **负责批量任务的创建、调度、状态管理**
- **维护批量任务相关的所有映射关系**：
  - `workflowTaskId`（L6层）→ `batchTaskId`（应用层）映射
  - 批量任务状态、进度、结果聚合

**必须关注**：

- ✅ **`batchTaskId`**：批量任务ID（应用层概念）
- ✅ **`workflowTaskId`**：L6 层工作流任务ID（用于建立映射）
- ✅ **批量任务状态管理**：维护批量任务的完成、失败状态

**映射维护职责**：

- ✅ **BatchTaskStateService**：维护 `workflowTaskId`（L6层）→ `batchTaskId`（应用层）映射
- ✅ **映射建立时机**：在 `batchTaskScheduler` 中，调用 `workflowScheduler.runWorkflow()` 后立即建立
- ✅ **映射清理时机**：批量任务完成或失败后清理映射关系

**状态更新职责**：

- ✅ **监听 L6 层工作流事件**：`WORKFLOW_COMPLETED`、`WORKFLOW_FAILED`（包含 `workflowTaskId`）
- ✅ **通过 `workflowTaskId` 查找 `batchTaskId`**：使用映射关系更新批量任务状态
- ✅ **不依赖执行历史**：批量任务状态更新不依赖执行历史中的 `batchTaskId`

---

### 35. ID 命名和映射关系

#### ✅ ID 命名规范

| ID 类型          | 命名              | 层级       | 说明                    |
| ---------------- | ----------------- | ---------- | ----------------------- |
| **执行任务ID**   | `executionTaskId` | L5 层      | L5 层执行引擎的任务ID   |
| **工作流任务ID** | `workflowTaskId`  | L6 层      | L6 层工作流编排的任务ID |
| **批量任务ID**   | `batchTaskId`     | 应用层     | 任务中心的批量任务ID    |
| **工作流ID**     | `workflowId`      | 工作流定义 | 工作流定义的ID          |
| **Profile ID**   | `profileId`       | Profile    | Profile 的ID            |

#### ✅ 映射关系维护

**L6 层 ↔ L5 层映射（WorkflowStateService 维护）**：

- **映射类型**：`workflowTaskId`（L6层）↔ `executionTaskId`（L5层）
- **维护服务**：`WorkflowStateService`
- **建立时机**：在 `workflowManager.runWorkflow()` 中，当 `executionTaskId` 创建后立即建立
- **清理时机**：工作流完成或失败后清理（由 `WorkflowStateService.cleanupWorkflowTaskMapping()` 处理）

**L6 层 ↔ 应用层映射（BatchTaskStateService 维护）**：

- **映射类型**：`workflowTaskId`（L6层）→ `batchTaskId`（应用层）
- **维护服务**：`BatchTaskStateService`
- **建立时机**：在 `batchTaskScheduler` 中，调用 `workflowScheduler.runWorkflow()` 后立即建立
- **清理时机**：批量任务完成或失败后清理

**执行历史关联**：

- **关联方式**：通过 `taskId`（L5 层执行任务ID）关联执行历史
- **不依赖批量任务**：执行历史不存储 `batchTaskId`，任务中心通过映射关系查找

---

## 🏛️ 业务模块分层规范 (L1-L7)

### ⚠️ 核心原则

```text
2025 年业务模块分层铁律：
「DDD 分层、接口隔离、无跨层直接引用」—— L2/L3 层作为核心业务引擎，必须严格遵循领域驱动设计。
```

### 36. 核心业务层定义

- **Level 2 (L2): 代理层 (Proxy Engine)**
  - **职责**：处理代理协议 (HTTP/Socks/SSH)、连通性测试、规则匹配。
  - **核心组件**：`ProxyService`, `ProxyRepository`, `ProxyMatcher`。
- **Level 3 (L3): 浏览器环境层 (Profile/Environment)**
  - **职责**：管理 Browser Profile 的生命周期、指纹生成、Cookies 同步、存储隔离。
  - **核心组件**：`ProfileService`, `ProfileLifecycleManager`, `FingerprintFactoryService`。

### 37. 职责边界与依赖关系

#### ✅ Application Service (应用服务层)

- **职责**：协调领域对象（Entities）、仓库（Repositories）和外部服务。
- **权限**：允许调用 Repository、并发起跨模块 Service 调用。
- **禁止**：
  - ❌ 禁止直接编写 SQL 或操作底层数据库句柄。
  - ❌ 禁止直接操作文件系统（应通过 `fs/promises` 模块隔离或工具类）。
  - ❌ 禁止在 Service 中处理 IPC 通讯（IPC 由 `api/` 层负责）。

#### ✅ Infrastructure Repository (基础设施仓库层)

- **职责**：执行数据的持久化存储（如 SQLite）。
- **权限**：允许编写 SQL、操作数据库事务。
- **禁止**：
  - ❌ 禁止包含任何业务逻辑（如权限判断、默认值填充等，这些应由领域模型或 Service 处理）。
  - ❌ 禁止调用任何 Service。

#### ✅ Domain Entity (领域实体层)

- **职责**：封装业务数据与核心行为。
- **原则**：纯净、无副作用，不依赖任何外部框架。

---

**最后更新**: 2026-01-27 | **维护者**: VeilBrowser Architecture Team
