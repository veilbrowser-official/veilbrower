# L6 Workflow 模块更新日志

## 2025-12-24 - 类型定义统一重构

### ✅ 核心更新

#### 1. 类型定义统一 (`src/shared/types/workflow.ts`)
- ✅ **统一类型定义位置**：将所有 Workflow 类型定义从 `src/main/business/workflow/types.ts` 迁移到 `src/shared/types/workflow.ts`
- ✅ **跨进程共享**：Main、Renderer、Worker 进程统一使用 `@shared/types/workflow.js` 导入
- ✅ **向后兼容**：`src/main/business/workflow/types.ts` 改为重新导出，保持向后兼容
- ✅ **类型分离**：
  - 业务层类型：`Workflow { steps: WorkflowStep[] }`（执行格式）
  - 前端显示类型：`WorkflowNode[]` + `WorkflowEdge[]`（通过转换器生成）
- ✅ **统一导出**：在 `src/shared/types/index.ts` 中添加 Workflow 相关类型的统一导出
- ✅ **修复执行历史**：`WorkflowExecutionContext` 中的 `nodes` 和 `edges` 通过转换器从 `steps` 生成

#### 2. 导入路径更新（34 个文件）
- ✅ 所有 Main 进程文件：从 `../../business/workflow/types.js` 改为 `@shared/types/workflow.js`
- ✅ 所有 Renderer 进程文件：从 `../../main/business/workflow/types.js` 改为 `@shared/types/workflow.js`
- ✅ 所有 IPC handlers：统一使用 `@shared/types/workflow.js`

#### 3. 存储层修复 (`src/main/services/workflow/workflowStorage.service.ts`)
- ✅ 移除 `nodes` 字段的赋值（不再需要）
- ✅ 统一使用 `steps` 字段（业务层格式）
- ✅ 数据库只存储 `steps`（JSON 字符串）

## 2025-12-05 - 2025-2026 标准格式重构完成

### ✅ 核心更新

#### 1. 类型定义更新 (`src/main/business/workflow/types.ts` → `src/shared/types/workflow.ts`)
- ✅ 添加 `MatchConfig` 接口（支持 css/xpath/text/attribute/ai 匹配类型）
- ✅ 添加 `WebhookConfig` 接口（企业级回调）
- ✅ 更新 `WorkflowStep` 接口：
  - 支持嵌套结构：`then`/`else`/`steps`/`try`/`catch`/`finally`
  - 添加 `times` 和 `variable` 字段（loop 用）
  - 保留向后兼容字段（`children`, `parallelSteps`）

#### 2. 预设模板更新 (`src/renderer/services/presetWorkflows.ts`)
- ✅ 5 个小红书工作流模板全部更新为新格式
- ✅ `goto` 使用 `value` 作为 URL（不是 `selector`）
- ✅ 所有变量使用 `{{ $var }}` 语法
- ✅ 嵌套结构使用 `then`/`else`/`steps`
- ✅ 每个步骤包含完整的字段（`timeout`, `retry`, `continueOnError`, `onError`）

#### 3. 转换器更新 (`src/renderer/features/workflow/utils/workflowConverter.ts`)
- ✅ 支持新的嵌套结构渲染（`then`/`else`/`steps`/`try`/`catch`/`finally`）
- ✅ 修复 `goto` action 导出：确保使用 `value` 而不是 `selector`
- ✅ 保持向后兼容（仍支持旧的 `children` 字段）

#### 4. 执行器更新 (`src/main/services/workflow/stepRunner.service.ts`)
- ✅ 修正 `convertToExecutionStep`：`goto` 用 `value` 作为 URL
- ✅ 添加变量插值引擎：支持 `{{ $var }}` 语法
- ✅ 添加表达式评估：支持基本运算、三元、逻辑（沙箱执行）
- ✅ 添加递归执行能力：
  - `if` 分支：评估条件，执行 `then`/`else`
  - `loop` 循环：根据 `times` 执行多次
  - `parallel` 并行：并发执行所有子步骤
  - `try` 异常捕获：执行 `try`/`catch`/`finally`

#### 5. WorkflowEngine 更新 (`src/main/services/workflow/workflowEngine.service.ts`)
- ✅ 更新为使用新的嵌套结构（`then`/`else`/`steps`）
- ✅ 支持向后兼容（仍支持 `children`）
- ✅ `try` 步骤使用 stepRunner 的递归执行

#### 6. 匹配能力支持 (`src/processes/execution/utils/matchHelper.ts`)
- ✅ 创建 match 配置处理工具
- ✅ 支持 css/xpath/text/attribute 匹配类型
- ✅ AI 类型预留接口（L7）
- ✅ 更新 `click.action.ts` 和 `type.action.ts` 以支持 match 配置
- ✅ 更新 `wait.action.ts` 和 `waitForText.action.ts` 以支持 match 配置

#### 7. WorkflowStore 更新 (`src/renderer/stores/workflowStore.ts`)
- ✅ 增强数据迁移逻辑：自动检测旧格式并迁移
- ✅ 验证新格式：确保所有工作流都有 `steps` 数组
- ✅ 处理旧 key（`automation-storage` → `workflow-storage`）

#### 8. 属性面板更新 (`src/renderer/features/workflow/editor/PropertyPanel.tsx`)
- ✅ 添加 `goto` action 支持（使用 `value` 作为 URL）
- ✅ 条件渲染：`goto` 显示 URL 输入框，其他 action 显示 selector
- ✅ 添加更多 action 类型支持

#### 9. Action 文件更新
- ✅ `click.action.ts` - 支持 match 配置
- ✅ `type.action.ts` - 支持 match 配置和 `clear` 字段
- ✅ `wait.action.ts` - 支持 match 配置和 `waitForTimeout`
- ✅ `waitForText.action.ts` - 支持 match 配置
- ✅ `goto.action.ts` - 确保使用 `value` 字段作为 URL

### 📚 文档创建

- ✅ `docs/modules/workflow/DESIGN.md` - 完整的 YAML 格式规范（590 行）
- ✅ `docs/modules/workflow/README.md` - 模块概览和快速开始
- ✅ `docs/modules/workflow/ROADMAP.md` - 功能规划和实施路线图
- ✅ `docs/modules/workflow/IMPLEMENTATION_STATUS.md` - 实施状态跟踪

### 🎯 核心改进

1. **格式标准化**
   - `goto` 用 `value`，其他动作用 `selector`
   - 变量插值统一使用 `{{ $var }}`
   - 嵌套结构使用子字段（`then`/`else`/`steps`）

2. **能力扩展**
   - 支持无限嵌套（递归渲染和执行）
   - 支持匹配配置（css/xpath/text/attribute/ai，预留）
   - 支持表达式评估（沙箱执行，安全）

3. **容错增强**
   - 每个步骤都有 `timeout`、`retry`、`continueOnError`
   - 指数退避重试机制
   - 错误策略（`continue`/`stop`/`goto`）

### ⏳ 后续工作

1. 更新更多 action 文件以支持 match 配置（如 `hover`, `selectOption` 等）
2. 集成 AI 匹配接口（L7 预留）
3. 进行兼容性测试和性能测试
4. 完善文档

---

**维护者**: VeilBrowser Team  
**参考**: AdsPower / Octo / NstBrowser / Kameleo 2025-2026 内部生产级实现

