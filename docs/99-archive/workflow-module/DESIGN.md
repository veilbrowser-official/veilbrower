# L6 Workflow 终极标准设计文档 (2025-2026 版)

**文档版本**: v1.0.0 (2025-12-05)  
**设计原则**: 基于顶级厂商生产级实现，支持无限嵌套、变量插值、AI 匹配、容错机制  
**目标**: 统一 YAML 格式作为工作流标准，实现可视化编辑器 + 后台执行器无缝集成  
**适用**: 指纹浏览器 RPA 自动化、批量养号、脚本编排，支持 10k+ Profile 并发

---

## 📋 目录

1. [YAML 格式规范](#1-yaml-格式规范)
2. [后台 Actions 能力设计](#2-后台-actions-能力设计)
3. [可视化编辑器支持设计](#3-可视化编辑器支持设计)
4. [变量系统设计](#4-变量系统设计)
5. [容错与扩展设计](#5-容错与扩展设计)
6. [实施路线图](#6-实施路线图)

---

## 1. YAML 格式规范

### 1.1 文件结构示例

```yaml
# 文件头（必填，元数据）
id: e4620ce7-4341-44b9-a9ea-f188c7e0bbc4  # UUID v4，必填
name: 小红书自动登录 + 发帖  # 工作流名称，必填，1-100字符
version: 2  # 版本号，必填，>=1
description: 完整登录流程，支持验证码识别  # 描述，可选，<=500字符
author: user@example.com  # 作者，可选
createdAt: 2025-04-05T12:00:00Z  # 创建时间，可选（ISO 时间戳）
updatedAt: 2025-04-06T15:30:22Z  # 更新时间，可选（ISO 时间戳）

# 全局变量（推荐，必填对象，支持插值）
variables:
  login_url: https://www.xiaohongshu.com/login
  phone: "13800138000"
  password: "mypassword123"
  post_content: "今天天气真好 {{ $date }}"

# 执行步骤（核心，必填数组，支持无限嵌套）
steps:
  - id: step-001
    name: 打开登录页
    type: action
    action: goto
    value: "{{ $login_url }}"  # 必须用 {{ }} 包变量
    timeout: 30000
    retry: 2
    continueOnError: false
    onError: stop

  - id: step-002
    name: 等待手机号输入框
    type: action
    action: waitForSelector
    selector: input[placeholder*="手机号"], input[type="tel"]
    match:  # 匹配配置（新增）
      type: css
      value: '手机号'
      operator: contains
      visible: true
    timeout: 15000
    retry: 1
    continueOnError: true
    onError: continue

  - id: step-003
    name: 输入手机号
    type: action
    action: type
    selector: input[placeholder*="手机号"]
    value: "{{ $phone }}"
    clear: true
    timeout: 5000
    retry: 0
    continueOnError: true
    onError: continue

  - id: step-004
    name: 输入密码
    type: action
    action: type
    selector: input[type="password"]
    value: "{{ $password }}"
    clear: true
    timeout: 5000
    retry: 0
    continueOnError: true
    onError: continue

  - id: step-005
    name: 判断是否有滑块验证码
    type: if
    condition: "{{ $page.locator('.captcha-slider').isVisible() }}"
    timeout: 5000
    retry: 1
    continueOnError: false
    onError: continue
    then:  # if 真分支（嵌套数组）
      - id: step-006
        name: 调用打码平台解决滑块
        type: action
        action: solveCaptcha
        provider: 2captcha
        timeout: 60000
        retry: 3
        continueOnError: false
        onError: stop
    else: []  # if 假分支（空数组）

  - id: step-007
    name: 点击登录按钮
    type: action
    action: click
    selector: button:has-text("登录"), .login-btn
    match:
      type: text
      value: '登录'
      operator: equals
    timeout: 10000
    retry: 2
    continueOnError: false
    onError: stop

  - id: step-008
    name: 等待登录成功跳转
    type: action
    action: waitForNavigation
    timeout: 15000
    retry: 1
    continueOnError: false
    onError: stop

  - id: step-009
    name: 循环发 3 条帖子
    type: loop
    times: 3  # 或 condition: "{{ $count < 10 }}" (while 模式)
    variable: postIndex  # 循环变量名
    timeout: 300000  # 总超时（3次 × 100秒）
    retry: 0
    continueOnError: true
    onError: continue
    steps:  # loop 嵌套子步骤（数组）
      - id: step-010
        name: 打开发帖页
        type: action
        action: goto
        value: https://creator.xiaohongshu.com/publish
        timeout: 30000
        retry: 2
        continueOnError: false
        onError: stop

      - id: step-011
        name: 输入内容
        type: action
        action: type
        selector: textarea[placeholder*="这一刻的想法"]
        value: "第 {{ $postIndex }} 条：{{ $post_content }}"
        timeout: 5000
        retry: 0
        continueOnError: true
        onError: continue

      - id: step-012
        name: 点击发布
        type: action
        action: click
        selector: button:has-text("发布")
        timeout: 10000
        retry: 2
        continueOnError: true
        onError: continue

      - id: step-013
        name: 等待 30 秒（防风控）
        type: action
        action: waitForTimeout
        value: 30000
        timeout: 30000
        retry: 0
        continueOnError: true
        onError: continue
```

### 1.2 字段详解

#### 文件头字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | ✅ | 工作流唯一 ID，用于断点/版本控制/热更新 |
| `name` | string | ✅ | 工作流名称，1-100字符，用于可视化编辑器显示 |
| `version` | number | ✅ | 版本号，>=1，支持热更新（v1 → v2 自动迁移） |
| `description` | string | ❌ | 描述，<=500字符，用于团队协作 |
| `author` | string (email) | ❌ | 作者，用于团队协作/日志追踪 |
| `createdAt` | number (Unix ms) | ❌ | 创建时间，ISO 时间戳，用于排序 |
| `updatedAt` | number (Unix ms) | ❌ | 更新时间，ISO 时间戳，用于热更新检测 |

#### 全局变量字段

```yaml
variables:
  var1: value1  # 字符串/数字/布尔，支持插值
  login_url: 'https://example.com/login'
  retry_delay: 5000  # 支持表达式 "{{ $base_delay * 2 }}"
```

- **类型**: `Record<string, string | number | boolean>`
- **用途**: 全局变量，所有步骤共享，支持 `{{ $var }}` 插值
- **作用域**: 工作流级别，子步骤可读取/覆盖（隔离）

#### 执行步骤字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | ✅ | 步骤唯一 ID，用于断点/日志/goto |
| `name` | string | ✅ | 步骤名称，用于可视化编辑器显示 |
| `type` | StepType | ✅ | 步骤类型（见下表） |
| `action` | string | ✅* | 动作名称，仅 `type: action` 时必填 |
| `value` | string | ✅ | 通用值字段（URL/文本/数值），必填 |
| `selector` | string | ❌ | DOM 选择器（CSS/XPath），用于 click/type/wait |
| `match` | MatchConfig | ❌ | 匹配配置（新增，支持高级元素定位/验证） |
| `timeout` | number | ✅ | 执行超时（ms），必填，默认 30000 |
| `retry` | number | ✅ | 重试次数，必填，0-5，默认 0 |
| `continueOnError` | boolean | ✅ | 错误时是否继续，必填，默认 false |
| `clear` | boolean | ❌ | 清空输入框，可选（type 动作用） |
| `variables` | Record<string, string> | ❌ | 本步骤输出变量，支持表达式 |
| `condition` | string | ✅* | 条件表达式，if/loop 时必填 |
| `then` | WorkflowStep[] | ✅* | if 真分支，if 类型时必填 |
| `else` | WorkflowStep[] | ❌ | if 假分支，if 类型时可选 |
| `steps` | WorkflowStep[] | ✅* | loop/parallel/try 的子步骤，必填 |
| `try` | WorkflowStep[] | ✅* | try 块，try 类型时必填 |
| `catch` | WorkflowStep[] | ❌ | catch 块，try 类型时可选 |
| `finally` | WorkflowStep[] | ❌ | finally 块，try 类型时可选 |
| `onError` | string | ✅ | 错误策略：`continue`/`stop`/`goto`，必填 |
| `gotoStepId` | string | ❌ | 跳转目标步骤 ID，goto 动作用 |
| `webhook` | WebhookConfig | ❌ | 回调钩子，企业级监控用 |

**关键设计原则**：

1. **`value` vs `selector` 严格区分**：
   - `goto` 动作：**必须用 `value`** 作为 URL（`value: "{{ $login_url }}"`）
   - `click/type/wait` 动作：**必须用 `selector`** 作为 DOM 选择器（`selector: 'button.login'`）
   - **绝不能混用**（否则执行失败）

2. **变量插值统一语法**：
   - 所有变量必须用 `{{ $var }}` 包裹（双大括号 + $ 前缀）
   - 支持表达式：`{{ $var1 > 5 ? 'A' : 'B' }}`
   - 沙箱执行（禁止危险代码）

3. **嵌套结构必须用子字段**：
   - `if` → `then: []` / `else: []`（数组）
   - `loop` → `steps: []`（数组）
   - `parallel` → `steps: []`（分组并发）
   - **不能平级数组**（否则可视化编辑器无法渲染）

### 1.3 步骤类型 (StepType)

| 类型 | 说明 | 必填字段 | 嵌套字段 |
|------|------|---------|---------|
| `action` | 基本动作（goto/click/type） | `action`, `value` | 无 |
| `if` | 条件分支 | `condition`, `then` | `then`, `else` |
| `loop` | 循环执行 | `times` 或 `condition`, `steps` | `steps` |
| `parallel` | 并行执行 | `concurrency`, `steps` | `steps` |
| `try` | 异常捕获 | `try` | `try`, `catch`, `finally` |
| `extract` | 数据提取 | `selector`, `match` | 无 |
| `goto` | 跳转步骤 | `gotoStepId` | 无 |
| `stop` | 终止工作流 | 无 | 无 |

### 1.4 匹配配置 (MatchConfig) - 新增核心能力

```yaml
match:
  type: css | xpath | text | attribute | ai  # 匹配类型
  value: '匹配值'  # 匹配内容
  operator: equals | contains | startsWith | regex  # 操作符
  timeout: 10000  # 匹配超时
  visible: true  # 是否等待可见
```

**匹配类型详解**：

1. **`css`** (默认)：标准 CSS 选择器，支持 `:has()`, `nth-child()` 等
2. **`xpath`**：完整 XPath，支持 `/html/body/div[1]`
3. **`text`**：文本内容匹配，支持 `contains`, `regex`（如 `phone: \d{11}`）
4. **`attribute`**：属性匹配，如 `href startsWith 'https://login'`
5. **`ai`** (预留)：AI 智能匹配，发送截图到 AI 服务，返回坐标/元素

**操作符**：`equals` / `contains` / `startsWith` / `endsWith` / `regex` / `>` / `<` / `>=` / `<=`

### 1.5 校验规则 (Zod 集成)

使用 Zod 确保格式一致性（递归校验）：

- **根级校验**：`id`, `name`, `version`, `steps` 必填
- **步骤级校验**：`type`, `action`, `value`, `timeout`, `retry` 必填
- **嵌套校验**：`then/else/steps` 数组递归校验（深度 <=10，防止无限递归）
- **变量校验**：键值对，值支持 string/number/boolean
- **表达式校验**：支持基本运算（`>`, `<`, `==`, `&&`, `||`），禁止危险代码（沙箱执行）

---

## 2. 后台 Actions 能力设计

### 2.1 动作分类（25+ 类型）

#### 2.1.1 浏览器操作 (基础，占 60% 使用)

| 动作 | 参数 | 说明 | 示例 |
|------|------|------|------|
| `goto` | `value` (URL) | 导航到 URL | `value: "{{ $login_url }}"` |
| `click` | `selector` + `match` | 点击元素 | `selector: 'button.login'` |
| `type` | `selector` + `value` + `clear` | 输入文本 | `value: "{{ $phone }}"` |
| `waitForSelector` | `selector` + `match` + `state` | 等待元素 | `state: visible/hidden` |
| `waitForTimeout` | `value` (ms) | 固定等待 | `value: 30000` |
| `waitForNavigation` | `timeout` | 等待导航 | 登录后等待跳转 |
| `evaluate` | `value` (JS 代码) | 执行 JS | 返回变量到 `variables` |

#### 2.1.2 数据匹配与验证 (新增匹配能力，占 20% 使用)

| 动作 | 参数 | 说明 | 示例 |
|------|------|------|------|
| `matchElement` | `match` | 元素匹配验证 | 返回 `found: true/false` |
| `extractData` | `selector` + `match` | 提取数据 | 提取属性/文本到 `variables` |
| `validateData` | `match` (JSON schema) | 数据校验 | `{{ $extracted.phone.length == 11 }}` |

#### 2.1.3 流程控制 (占 10% 使用)

| 动作 | 参数 | 说明 | 示例 |
|------|------|------|------|
| `if` | `condition` + `then/else` | 条件分支 | 嵌套子步骤 |
| `loop` | `times`/`condition` + `steps` | 循环执行 | `times: 3` 或 `forEach: "{{ $list }}"` |
| `parallel` | `concurrency` + `steps` | 并发执行 | 分组并发，每组 5 个 |
| `goto` | `gotoStepId` | 跳转步骤 | 跳转到指定 ID |
| `stop` | 无 | 终止工作流 | 立即停止 |

#### 2.1.4 异常处理 (占 5% 使用)

| 动作 | 参数 | 说明 | 示例 |
|------|------|------|------|
| `try` | `try/catch/finally` | 异常捕获 | 嵌套子步骤 |

#### 2.1.5 AI 集成 (L7 预留，占 5% 使用)

| 动作 | 参数 | 说明 | 示例 |
|------|------|------|------|
| `smartClick` | `match: { type: 'ai', value: '描述' }` | AI 视觉点击 | 语义描述匹配 |
| `autoFill` | `match: { type: 'ai', fields: {...} }` | AI 表单填充 | 智能识别表单字段 |
| `solveCaptcha` | `provider: '2captcha'` | 验证码解决 | 调用打码平台 |

### 2.2 匹配能力详解 (核心扩展)

**匹配类型 (MatchConfig.type)**：

1. **`css`** (默认)：标准 CSS 选择器，支持 `:has()`, `nth-child()` 等
2. **`xpath`**：完整 XPath，支持 `/html/body/div[1]`
3. **`text`**：文本内容匹配，支持 `contains`, `regex`（如 `phone: \d{11}`）
4. **`attribute`**：属性匹配，如 `href startsWith 'https://login'`
5. **`ai`** (预留)：AI 智能匹配，发送截图到 AI 服务，返回坐标/元素

**操作符 (MatchConfig.operator)**：

- `equals`：完全相等
- `contains`：包含子串
- `startsWith` / `endsWith`：前缀/后缀匹配
- `regex`：正则表达式匹配
- `>` / `<` / `>=` / `<=`：数值比较

**示例**：

```yaml
- type: action
  action: click
  match:
    type: text
    value: '登录'
    operator: contains
    visible: true
    timeout: 10000
```

### 2.3 执行引擎集成 (L6 → L5)

**解析阶段 (L6 工作流引擎)**：

1. 递归遍历 `steps` 数组，展开嵌套为线性执行队列（栈/队列）
2. 变量插值：预处理所有 `{{ $var }}`，支持表达式评估（沙箱 Function）
3. 校验：Zod 校验 YAML，抛出详细错误

**执行阶段 (L5 执行器)**：

1. `runStepAsExecution` 函数：递归执行嵌套步骤
2. `goto` 动作：使用 `page.goto(value)`，value 已经过插值替换
3. `if` 动作：评估条件表达式，展开为子队列（then/else）
4. `loop` 动作：展开为 N 次执行（times/forEach/while）
5. `parallel` 动作：Promise.all 并发，限流（concurrency 字段）
6. 错误处理：retry 指数退避，continueOnError 跳过失败步骤

**状态同步**：

- IPC 推送执行状态（nodeStates Map）到渲染进程
- 可视化编辑器实时高亮（running/completed/failed）
- 日志记录每个步骤的执行结果（截图/变量）

**并发支持**：

- Profile 级并发（10k+ Profile 同时执行）
- 步骤级限流（避免浏览器卡顿）

---

## 3. 可视化编辑器支持设计

### 3.1 树形渲染（无限嵌套）

- 使用 Ant Design Tree 或自定义递归组件渲染嵌套
- 展开/折叠：`then/else/steps` 使用 Collapse 组件
- 深度限制：可视化渲染最多 10 层（防止 UI 卡顿）

### 3.2 拖拽生成（反向生成 YAML）

- 拖拽基本节点（action）到画布，自动生成 YAML 步骤
- 拖拽控制节点（if/loop）时，弹出子画布（嵌套编辑）
- 反向生成：从 YAML 渲染树形视图，支持拖拽重排

### 3.3 属性编辑（动态表单）

- 侧边栏表单：动态字段（`value`/`selector`/`match`）
- 变量预览：实时预览插值结果（沙箱测试）
- 嵌套编辑：点击控制节点，打开子画布（无限深度）

### 3.4 校验集成

- 保存时 Zod 校验，错误高亮（红框 + 提示）
- 表达式测试：实时评估表达式（沙箱 eval）

### 3.5 调试支持

- 断点设置（步骤 ID）
- 单步执行（递归暂停子步骤）
- 截图回写：执行结果截图显示在节点上

---

## 4. 变量系统设计

### 4.1 变量语法

- **全局变量**：`{{ $var }}`（`$` 前缀表示全局变量）
- **循环变量**：`{{ $loopIndex }}` / `{{ $loopCount }}`（loop 内置）
- **步骤输出**：`{{ $step.output }}`（步骤级别的变量）

### 4.2 表达式支持

支持基本运算、三元、逻辑：

```yaml
value: "{{ $var1 > 5 ? 'A' : 'B' }}"  # 三元运算
value: "{{ $var1 + $var2 }}"  # 算术运算
value: "{{ $var1 == 'success' && $retry_count < 3 }}"  # 逻辑运算
```

### 4.3 作用域隔离

- **全局作用域**：`variables` 对象，所有步骤共享
- **步骤作用域**：`variables` 输出变量，仅当前步骤可见
- **循环作用域**：`loop.variable`，仅循环内可见

### 4.4 变量解析器

- 沙箱 Function 构造器（禁止 `eval` 危险代码）
- 表达式评估（支持基本运算、三元、逻辑）
- 预留 AI 表达式生成（L7）

---

## 5. 容错与扩展设计

### 5.1 Retry 机制

- 每个步骤 `retry: N`（0-5 次）
- 指数退避：1s → 2s → 4s（避免服务器压力）
- 最大重试 5 次（防止无限重试）

### 5.2 ContinueOnError

- `continueOnError: true` 时，失败步骤跳过（不中断工作流）
- 错误记录到 `variables.error_log`（用于后续分析）

### 5.3 Webhook 回调

- 步骤结束时 POST 回调（企业级监控）
- 支持变量插值：`payload: "{{ $step.result }}"`

### 5.4 版本控制

- YAML 头部 `version` 字段
- 导入时校验兼容（v1 → v2 自动迁移）

### 5.5 AI 预留

- `match.type: 'ai'` 发送截图到 L7 服务
- 返回执行坐标/动作（预留接口）

### 5.6 性能优化

- 嵌套展开限深 10 层（防止内存爆炸）
- 变量内存缓存（避免重复解析）
- 批量 Profile 执行限流（避免浏览器卡顿）

---

## 6. 实施路线图

### Phase 1: 核心格式 (立即，1 天)

- ✅ 更新类型定义 (`types.ts`)
- ✅ 更新预设模板 (`presetWorkflows.ts`)
- ✅ 更新转换器 (`workflowConverter.ts`)

### Phase 2: 执行引擎 (1 周)

- ⚠️ 实现递归执行器 (`stepRunner.service.ts`)
- ⚠️ 集成变量插值（沙箱 Function）
- ⚠️ 集成匹配能力（L5 执行器）

### Phase 3: 可视化编辑器 (2 周)

- ⚠️ 树形渲染（无限嵌套 + 折叠）
- ⚠️ 拖拽生成（反向生成 YAML）
- ⚠️ 属性编辑（动态表单）

### Phase 4: 校验与测试 (1 周)

- ⚠️ Zod 校验器集成
- ⚠️ 测试 1000+ 脚本兼容性
- ⚠️ 性能测试（10k+ Profile 并发）

### Phase 5: AI 预留 (1 周)

- ⚠️ AI 匹配接口（L7 预留）
- ⚠️ 表达式生成（预留）

---

## 7. 核心设计原则（20 条封神结论）

1. **唯一标准格式**：`.veilflow.yaml`（YAML 必选，JSON 淘汰）
2. **`goto` 用 `value:`，其他动作用 `selector:`**（绝不能混）
3. **变量插值必须写成 `{{ $var }}`**（双大括号 + $ 前缀）
4. **所有嵌套必须用子字段，不能平级数组**：`if → then: [] / else: []`，`loop → steps: []`
5. **每个步骤强制 4 个字段**：`timeout`, `retry`, `continueOnError`, `onError`
6. **新增 `match:` 对象**（2025 年最大杀器）：支持 css/xpath/text/attribute/ai
7. **`action:` 字段只出现在 `type: action` 的节点**
8. **支持 6 大类节点**：action / if / loop / parallel / try / extract
9. **`loop` 支持 3 种模式**：`times: 5` / `forEach: "{{ $list }}"` / `while: "{{ $condition }}"`
10. **`parallel` 支持分组并发**：`concurrency: 5` + `steps: [[group1], [group2]]`
11. **变量作用域严格隔离**：全局 → `variables:`，循环内 → `loop.variable: item`
12. **表达式支持三元、算术、比较、逻辑运算**（但沙箱执行）
13. **每个步骤必须有唯一 `id`（UUID）**，用于断点、日志、goto
14. **`onError` 支持 3 种策略**：`continue | stop | goto`
15. **支持 webhook 回调**（企业级必备）
16. **支持版本号 + 更新时间**，用于热更新检测
17. **支持 `description` 和 `author`**，用于团队协作
18. **可视化编辑器必须支持无限嵌套 + 折叠 + 拖拽**
19. **运行时状态必须实时回写到 YAML 节点**（success/failed/running + 截图）
20. **AI 节点预留字段**：`match: { type: 'ai', value: '描述' }`

---

## 8. 与当前格式的对比修正

| 当前写法 | 问题 | 正确写法（2025 标准） |
|---------|------|---------------------|
| `selector: https://...` | goto 不该用 selector | `value: "https://..."` |
| 没有 `{{ }}` 包裹变量 | 变量插值不生效 | `value: "{{ $phone }}"` |
| 嵌套步骤直接写在数组 | 可视化编辑器无法渲染 | `if.then: []` / `loop.steps: []` |
| 没有 `retry` / `timeout` | 容易卡死 | 每个动作都加 |
| 没有 `version` / `variables` | 无法热更新、变量管理混乱 | 必须加 |

---

**最后更新**: 2025-12-05  
**维护者**: VeilBrowser Team  
**参考**: AdsPower / Octo / NstBrowser / Kameleo 2025-2026 内部生产级实现

