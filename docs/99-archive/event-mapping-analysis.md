# 统一事件体系设计文档

## 🎯 重构背景

### 现状问题
VeilBrowser当前存在**三个碎片化的事件定义系统**：
1. `src/shared/events/workflow.events.ts` - L6层工作流事件
2. `src/shared/events/execution.events.ts` - L5层执行事件（新加）
3. `src/shared/events/task.events.ts` - L5层任务事件（旧）

### 重构目标
基于优秀厂商（Microsoft Power Automate、UiPath）的最佳实践，设计**闭合统一的事件体系**：
- 统一的事件类型和数据结构
- 明确的生命周期：`started` → `progress*` → `status-changed`
- 百分比进度支持
- 全链路traceId追踪

## 📋 统一事件体系设计

### 核心事件类型
```typescript
export type EventType =
  // 工作流级别 (L6)
  | 'workflow:started'
  | 'workflow:status-changed'  // 统一终态：completed/failed/cancelled
  | 'workflow:progress'        // 百分比进度

  // 任务级别 (L5)
  | 'task:started'
  | 'task:status-changed'      // 统一终态
  | 'task:progress'            // 百分比进度

  // Action级别 (L5)
  | 'action:started'
  | 'action:status-changed'    // 统一终态
  | 'action:progress';         // Action进度（如分段上传）
```

### 基础事件接口
```typescript
export interface BaseEvent {
  // 唯一标识
  eventId: string;
  timestamp: number;
  traceId: string;

  // 事件类型
  type: EventType;

  // 层级标识（根据type自动推断）
  workflowId?: string;
  taskId?: string;
  actionId?: string;
  profileId?: string;

  // 业务数据
  data: Record<string, any>;
}
```

### 状态变更事件（核心）
```typescript
export interface StatusChangedEvent extends BaseEvent {
  data: {
    // 状态流转
    fromStatus: ExecutionStatus;  // pending | running | paused
    toStatus: ExecutionStatus;    // completed | failed | cancelled

    // 执行结果
    duration: number;
    error?: string;               // failed时存在
    result?: any;                 // completed时存在

    // 统计信息（可选）
    statistics?: {
      totalActions?: number;
      completedActions?: number;
      failedActions?: number;
    };
  };
}
```

### 进度事件（百分比）
```typescript
export interface ProgressEvent extends BaseEvent {
  data: {
    progress: {
      percentage: number;         // 0-100 百分比
      completed: number;          // 已完成数量
      total: number;             // 总数
      current: number;           // 当前索引
      estimatedTimeRemaining?: number; // 预计剩余时间(ms)
    };

    currentStep?: {
      name: string;              // 步骤描述
      type: string;              // 步骤类型
      status: ExecutionStatus;   // 步骤状态
    };
  };
}
```

## 🏗️ 实施计划

### Phase 1: 创建统一事件定义
1. 新建 `src/shared/events/unified.events.ts`
2. 定义统一的事件类型和接口

### Phase 2: 重构事件发布代码
1. 更新 `workflowDispatcher.service.ts` - 使用新的事件格式
2. 更新 `workflowRuntime.service.ts` - 使用新的事件格式
3. 更新 `TaskExecutor.ts` - 使用新的事件格式
4. 更新 `ActionRunner.ts` - 使用新的事件格式
5. 更新 `BusinessEventEmitter.ts` - 支持新的事件类型

### Phase 3: 清理旧代码
1. 删除 `src/shared/events/workflow.events.ts`
2. 删除 `src/shared/events/execution.events.ts`
3. 删除 `src/shared/events/task.events.ts`
4. 更新所有相关文件的导入语句

### Phase 4: 测试验证
1. 编译检查
2. 单元测试
3. 集成测试

## 📁 目录结构规划

```
src/shared/events/
├── unified.events.ts     # 🎯 唯一的事件定义文件
├── index.ts             # 统一导出
├── types.ts             # 类型定义补充（如果需要）
└── README.md            # 使用文档
```

## 🔄 迁移映射表

### 工作流事件迁移
| 旧事件 | 新事件 | 说明 |
|--------|--------|------|
| WORKFLOW_START | workflow:started | 名称统一 |
| WORKFLOW_COMPLETED | workflow:status-changed | 合并终态 |
| WORKFLOW_FAILED | workflow:status-changed | 合并终态 |
| WORKFLOW_STEP_* | 移除 | 由task事件替代 |

### 任务事件迁移
| 旧事件 | 新事件 | 说明 |
|--------|--------|------|
| EXECUTION_TASK_START | task:started | 名称统一 |
| EXECUTION_TASK_COMPLETED | task:status-changed | 合并终态 |
| EXECUTION_TASK_FAILED | task:status-changed | 合并终态 |
| task:started (新) | task:started | 保持 |
| task:progress (新) | task:progress | 保持 |

### Action事件迁移
| 旧事件 | 新事件 | 说明 |
|--------|--------|------|
| action:started (新) | action:started | 保持 |
| action:completed (新) | action:status-changed | 合并终态 |
| action:failed (新) | action:status-changed | 合并终态 |

## ✅ 设计优势

1. **完全闭合**：每个执行单元都有明确的started和status-changed
2. **状态机清晰**：fromStatus → toStatus的流转关系明确
3. **百分比进度**：用户友好的进度表示
4. **统一性**：所有终态都通过status-changed表达
5. **扩展性**：未来可轻松添加paused/resumed等状态
6. **语义化**：事件名直接表达业务含义

## 🎯 实施时间表

- **Phase 1**: 30分钟 - 创建统一事件定义
- **Phase 2**: 2小时 - 重构所有事件发布代码
- **Phase 3**: 30分钟 - 清理旧代码和导入
- **Phase 4**: 1小时 - 测试验证

**总计**: ~4小时

---

**更新时间**: 2025-01-15
**维护者**: VeilBrowser Team

