# L6层接口层设计文档

## 📋 概述

本文档详细描述VeilBrowser L6层（工作流编排层）的接口层设计。该设计采用Clean Architecture模式，构建完整的六层架构，确保接口统一、职责清晰、易于测试和扩展。

## 🏗️ 六层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         WorkflowAPI (统一Request/Response接口)      │    │
│  │  - executeWorkflow(request) → response             │    │
│  │  - 适配器模式转换，应用层友好                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │       WorkflowUseCase (业务逻辑封装)               │    │
│  │  - 领域规则和跨组件协调                            │    │
│  │  - 业务验证和错误处理                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Orchestrator Layer                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     WorkflowOrchestrator (5组件编排器)             │    │
│  │  - Definition→Plan→Runtime→Instance全流程          │    │
│  │  - Workflow对象模式，内部技术接口                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│  │ WorkflowCompiler    │ │ WorkflowRuntime     │ │ WorkflowMonitor     │ │
│  │ (编译器)            │ │ (运行时)            │ │ (监控器)             │ │
│  │ Definition→Plan     │ │ Plan→Runtime        │ │ Runtime→Instance     │ │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
│              │               │               │              │
│              └───────────────┼───────────────┘              │
│                              ▼                              │
│                              │                              │
│                              ▼                              │
│              ┌─────────────────────────────────────┐        │
│              │ WorkflowDispatcher (调度器)         │        │
│              │ - 事件管理                           │        │
│              │ - 外部通知                           │        │
│              └─────────────────────────────────────┘        │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Repository Layer                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     WorkflowRepository (数据访问抽象接口)            │    │
│  │  - 定义CRUD契约                                    │    │
│  │  - 支持多种存储后端                                │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Storage Layer                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   WorkflowStorageService (数据库操作具体实现)        │    │
│  │  - SQLite操作                                        │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## 🔌 接口层详细设计

### 1. WorkflowAPI (应用层接口)

**职责**: 统一对外API接口，封装Request/Response模式，适配器模式转换

**位置**: `src/main/services/workflow/api/`

**接口定义**:
```typescript
export interface WorkflowAPI {
  // 核心执行接口 (Request/Response模式)
  executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse>

  // 状态管理接口
  pauseWorkflow(executionId: string): Promise<void>
  resumeWorkflow(executionId: string): Promise<void>
  cancelWorkflow(executionId: string): Promise<void>
  getWorkflowStatus(executionId: string): Promise<WorkflowExecution | null>

  // 工作流管理接口
  createWorkflow(workflow: Workflow): Promise<Workflow>
  getWorkflow(id: string): Promise<Workflow | null>
  updateWorkflow(id: string, spec: Partial<Workflow>): Promise<Workflow>
  deleteWorkflow(id: string): Promise<void>
  listWorkflows(filter?: WorkflowFilter): Promise<WorkflowList>

  // 执行历史接口
  listExecutions(filter?: ExecutionFilter): Promise<WorkflowExecution[]>
  getExecutionHistory(executionId: string): Promise<ExecutionEvent[]>
  getExecutionMetrics(timeRange: TimeRange): Promise<ExecutionMetrics>
}
```

**实现类**: `WorkflowAPIImpl`

**依赖注入**:
```typescript
export class WorkflowAPIImpl implements WorkflowAPI {
  constructor(
    private useCase: WorkflowUseCase,
    private repository: WorkflowRepository
  ) {}
}
```

### 2. WorkflowUseCase (业务逻辑接口)

**职责**: 封装业务规则和领域逻辑，跨组件协调，业务验证

**位置**: `src/main/services/workflow/usecase/`

**接口定义**:
```typescript
export interface WorkflowUseCase {
  // 执行用例 (封装核心业务逻辑)
  executeWorkflow(input: ExecuteWorkflowInput): Promise<ExecuteWorkflowOutput>

  // 验证用例
  validateWorkflow(workflow: Workflow): ValidationResult
  validateExecutionRequest(request: WorkflowExecutionRequest): ValidationResult

  // 优化用例
  optimizeWorkflow(workflow: Workflow): Promise<WorkflowOptimization>

  // 批量处理用例
  executeWorkflowsBatch(requests: WorkflowExecutionRequest[]): Promise<BatchExecutionResult>

  // 监控和统计用例
  getWorkflowMetrics(timeRange: TimeRange): Promise<WorkflowMetrics>
  getSystemHealth(): Promise<SystemHealth>
  getExecutionHistory(workflowId: string, timeRange: TimeRange): Promise<ExecutionHistory>
}
```

**实现类**: `WorkflowUseCaseImpl`

**依赖注入**:
```typescript
export class WorkflowUseCaseImpl implements WorkflowUseCase {
  constructor(
    private orchestrator: IWorkflowOrchestrator,
    private repository: WorkflowRepository,
    private validator: WorkflowValidator,
    private optimizer: WorkflowOptimizer
  ) {}
}
```

### 3. WorkflowRepository (数据访问接口)

**职责**: 抽象数据访问层，支持多种存储后端

**位置**: `src/main/services/workflow/repository/`

**接口定义**:
```typescript
export interface WorkflowRepository {
  // 工作流数据访问
  createWorkflow(workflow: Workflow): Promise<Workflow>
  getWorkflow(id: string): Promise<Workflow | null>
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow>
  deleteWorkflow(id: string): Promise<void>
  listWorkflows(filter?: WorkflowFilter): Promise<WorkflowList>

  // 执行记录数据访问
  createExecution(execution: WorkflowExecution): Promise<string>
  getExecution(id: string): Promise<WorkflowExecution | null>
  updateExecution(id: string, updates: Partial<WorkflowExecution>): Promise<void>
  listExecutions(filter?: ExecutionFilter): Promise<WorkflowExecution[]>
  deleteExecution(id: string): Promise<void>

  // 统计和监控数据访问
  getExecutionStats(filter?: ExecutionFilter): Promise<ExecutionStats>
  getWorkflowStats(workflowId: string): Promise<WorkflowStats>
}
```

**实现类**: `WorkflowRepositoryImpl`

**依赖注入**:
```typescript
export class WorkflowRepositoryImpl implements WorkflowRepository {
  constructor(
    private storageService: WorkflowStorageService
  ) {}
}
```

## 🔄 接口转换设计

### 适配器模式实现

**WorkflowAPIImpl - 接口转换核心**:
```typescript
export class WorkflowAPIImpl implements WorkflowAPI {
  constructor(
    private useCase: WorkflowUseCase,
    private repository: WorkflowRepository
  ) {}

  async executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse> {
    // 1. 参数验证 (API层职责)
    this.validateRequest(request);

    // 2. 获取工作流定义 (Repository层)
    const workflow = await this.repository.getWorkflow(request.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(request.workflowId);
    }

    // 3. 调用业务逻辑 (UseCase层)
    const result = await this.useCase.executeWorkflow({
      workflow,
      profileId: request.profileId,
      variables: request.variables,
      executionId: request.executionId,
      timeout: request.timeout,
      executionMode: request.executionMode,
      onBreakpoint: request.onBreakpoint,
      aiHook: request.aiHook,
    });

    // 4. 转换响应格式 (API层职责)
    return this.toResponse(result);
  }

  private validateRequest(request: WorkflowExecutionRequest): void {
    if (!request.workflowId) {
      throw new ValidationError('workflowId is required');
    }
    if (!request.profileId) {
      throw new ValidationError('profileId is required');
    }
  }

  private toResponse(result: ExecuteWorkflowOutput): WorkflowExecutionResponse {
    return {
      success: result.status === 'completed',
      executionId: result.executionId,
      status: result.status,
      message: result.error || '执行完成',
      results: result.status === 'completed' ? [result.result] : undefined,
    };
  }
}
```

## 📊 数据流设计

### 完整请求处理流程

```
外部请求 → WorkflowAPI.executeWorkflow(request)
    ↓
WorkflowAPIImpl: 参数验证 + 获取Workflow对象
    ↓
WorkflowUseCaseImpl: 业务验证 + 领域逻辑
    ↓
WorkflowOrchestrator: Definition→Plan→Runtime→Instance
    ↓
5个核心组件: 编译/执行/监控/调度
    ↓
WorkflowRepositoryImpl: 数据持久化
    ↓
WorkflowStorageService: SQLite操作
    ↓
响应返回 ← WorkflowAPIImpl: 格式转换
```

### 接口职责边界

| 层级 | 职责范围 | 输入格式 | 输出格式 | 依赖 |
|------|----------|----------|----------|------|
| **WorkflowAPI** | 参数验证、格式转换、错误处理 | Request/Response | Request/Response | UseCase, Repository |
| **WorkflowUseCase** | 业务规则、领域逻辑、跨组件协调 | 业务对象 | 业务结果 | Orchestrator, Repository |
| **WorkflowOrchestrator** | 组件编排、技术流程控制 | Workflow对象 | WorkflowExecution | 5个核心组件 |
| **WorkflowRepository** | 数据访问抽象、查询优化 | 领域对象 | 领域对象 | StorageService |
| **Storage** | 数据库操作、SQL执行 | 原生数据 | 原生数据 | Database |

## 🧪 测试策略

### 单元测试设计

**WorkflowAPI测试**:
```typescript
describe('WorkflowAPI', () => {
  let api: WorkflowAPI;
  let mockUseCase: jest.Mocked<WorkflowUseCase>;
  let mockRepository: jest.Mocked<WorkflowRepository>;

  beforeEach(() => {
    mockUseCase = { /* mock methods */ };
    mockRepository = { /* mock methods */ };
    api = new WorkflowAPIImpl(mockUseCase, mockRepository);
  });

  it('should execute workflow successfully', async () => {
    // Arrange
    const request = createTestRequest();
    const workflow = createTestWorkflow();
    const result = createTestResult();

    mockRepository.getWorkflow.mockResolvedValue(workflow);
    mockUseCase.executeWorkflow.mockResolvedValue(result);

    // Act
    const response = await api.executeWorkflow(request);

    // Assert
    expect(response.success).toBe(true);
    expect(response.executionId).toBe(result.executionId);
  });
});
```

**WorkflowUseCase测试**:
```typescript
describe('WorkflowUseCase', () => {
  let useCase: WorkflowUseCase;
  let mockOrchestrator: jest.Mocked<IWorkflowOrchestrator>;
  let mockRepository: jest.Mocked<WorkflowRepository>;

  beforeEach(() => {
    mockOrchestrator = { /* mock methods */ };
    mockRepository = { /* mock methods */ };
    useCase = new WorkflowUseCaseImpl(mockOrchestrator, mockRepository, validator, optimizer);
  });

  it('should validate workflow before execution', async () => {
    // Arrange
    const input = createTestInput();
    const validationResult = { isValid: false, errors: ['Invalid workflow'] };

    mockValidator.validate.mockReturnValue(validationResult);

    // Act & Assert
    await expect(useCase.executeWorkflow(input)).rejects.toThrow(WorkflowValidationError);
  });
});
```

## 🚀 实施指南

### Phase 1: 接口定义 (1天)

1. **创建接口文件**
   ```bash
   # 创建接口目录结构
   mkdir -p src/main/services/workflow/api
   mkdir -p src/main/services/workflow/usecase
   mkdir -p src/main/services/workflow/repository

   # 创建接口定义文件
   touch src/main/services/workflow/api/workflow-api.interface.ts
   touch src/main/services/workflow/usecase/workflow-usecase.interface.ts
   touch src/main/services/workflow/repository/workflow-repository.interface.ts
   ```

2. **定义接口契约**
   - 明确每层职责边界
   - 设计统一的方法签名
   - 定义错误处理规范

### Phase 2: 实现骨架 (1天)

1. **创建实现类**
   ```typescript
   // src/main/services/workflow/api/workflow-api.impl.ts
   export class WorkflowAPIImpl implements WorkflowAPI {
     // TODO: 实现接口方法
   }

   // src/main/services/workflow/usecase/workflow-usecase.impl.ts
   export class WorkflowUseCaseImpl implements WorkflowUseCase {
     // TODO: 实现接口方法
   }

   // src/main/services/workflow/repository/workflow-repository.impl.ts
   export class WorkflowRepositoryImpl implements WorkflowRepository {
     // TODO: 实现接口方法
   }
   ```

2. **依赖注入配置**
   ```typescript
   // src/main/core/di.ts
   register('workflowAPI', new WorkflowAPIImpl(useCase, repository));
   register('workflowUseCase', new WorkflowUseCaseImpl(orchestrator, repository, validator, optimizer));
   register('workflowRepository', new WorkflowRepositoryImpl(storageService));
   ```

### Phase 3: 核心实现 (2-3天)

1. **实现WorkflowRepositoryImpl**
   - 封装WorkflowStorageService
   - 添加查询优化和缓存
   - 实现错误处理

2. **实现WorkflowUseCaseImpl**
   - 实现业务规则验证
   - 跨组件协调逻辑
   - 错误处理和恢复

3. **实现WorkflowAPIImpl**
   - 请求参数验证
   - 接口格式转换
   - 统一错误处理

## 📈 验收标准

### 功能验收
- [ ] 所有接口方法正确实现
- [ ] Request/Response格式转换正确
- [ ] 业务规则验证正常工作
- [ ] 错误处理和异常传播正确
- [ ] 向后兼容性保持完整

### 质量验收
- [ ] 接口抽象合理，无循环依赖
- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试通过
- [ ] 文档完整，包含使用示例

### 性能验收
- [ ] 接口调用延迟 < 10ms
- [ ] 内存使用无明显增长
- [ ] 并发请求处理正常

---

**最后更新**: 2025-01-11
**维护者**: VeilBrowser Team
**状态**: 接口层设计完成，等待实现