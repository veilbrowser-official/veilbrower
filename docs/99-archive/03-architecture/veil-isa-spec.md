# Veil-ISA (Veil Instruction Set Architecture) 规范 v1.1

## 1. 设计哲学 (Design Philosophy)

Veil-ISA 旨在将浏览器自动化操作降维为线性的、原子的机器指令。
**核心原则**：Runtime 应当是“无脑”的。复杂的控制流逻辑（循环、分支）应由 Compiler 在编译期“降维”为简单的跳转指令。

## 2. 内存模型 (Memory Model)

*   **Heap (全局堆)**: 存储工作流变量 (`$input.url`, `$result.data`)。
*   **Stack (调用栈)**: 用于存储函数调用或子程序调用的上下文 (V2 阶段引入)。
*   **Registers (虚拟寄存器)**:
    *   `%RESULT`: 上一条指令的执行结果。
    *   `%IP`: 指令指针 (Instruction Pointer)，指向当前正在执行的指令索引。
    *   `%ERR`: 错误状态寄存器。

## 3. 指令集详解 (Instruction Set Reference)

### 3.1 核心流控指令 (Flow Control / Branching)

Runtime **不直接支持** `If/Else` 块或 `While` 块，而是通过比较和跳转实现。

| OpCode | 参数 (Args) | 描述 | 伪代码逻辑 |
| :--- | :--- | :--- | :--- |
| `JMP` | `target: string` | **无条件跳转** | `%IP = target` |
| `CMP` | `a: any, b: any, op: string` | **比较** (结果存入 `%RESULT`) | `%RESULT = (a op b)` |
| `JEZ` | `target: string` | **若假则跳** (Jump if Zero/False) | `if (!%RESULT) %IP = target` |
| `JNZ` | `target: string` | **若真则跳** (Jump if Not Zero/True) | `if (%RESULT) %IP = target` |
| `ERR_CATCH`| `target: string` | **注册错误句柄** (Try-Catch) | `Scope.onError = target` |
| `EXIT` | `code: number` | **终止程序** | `Process.exit(code)` |

> **编译示例：While 循环**
>
> *源代码*: `While (i < 5) { Click(...) }`
>
> *汇编代码*:
> ```text
> LABEL_START:
>   CMP $i, 5, "<"    ; 比较
>   JEZ LABEL_END     ; 如果假 (i >= 5)，跳到结束
>   HID_CLICK ...     ; 循环体
>   JMP LABEL_START   ; 跳回开始
> LABEL_END:
>   ...
> ```

### 3.2 感知指令 (Perception / Read)

负责将页面状态读入内存。

| OpCode | 参数 | 输出 | 描述 |
| :--- | :--- | :--- | :--- |
| `DOM_EXIST` | `selector` | `boolean` | 检查元素是否存在。 |
| `DOM_TEXT` | `selector` | `string` | 获取 innerText。 |
| `DOM_ATTR` | `selector, attr` | `string` | 获取属性值 (如 href)。 |
| `DOM_COUNT` | `selector` | `number` | 获取匹配元素数量。 |
| `PAGE_URL` | - | `string` | 获取当前 URL。 |
| `PAGE_TITLE`| - | `string` | 获取当前 Title。 |
| `SNAPSHOT` | `fullPage?` | `buffer` | 截图 + AXTree (供 AI 使用)。 |
| `WAIT_NAV` | `timeout` | - | 等待导航完成 (load/networkidle)。 |
| `WAIT_EL` | `selector, state` | - | 等待元素 (visible/hidden)。 |

### 3.3 交互指令 (Interaction / Write)

负责修改页面状态或模拟用户操作。

| OpCode | 参数 | 描述 |
| :--- | :--- | :--- |
| `NAV_GOTO` | `url` | 打开 URL。 |
| `NAV_RELOAD`| `ignoreCache?` | 刷新页面。 |
| `NAV_BACK` | - | 后退。 |
| `HID_CLICK` | `selector` | 智能点击 (自动处理滚动、遮挡)。 |
| `HID_INPUT` | `selector, text` | 智能输入 (模拟键盘事件序列)。 |
| `HID_HOVER` | `selector` | 鼠标悬停。 |
| `HID_SCROLL`| `x, y` | 滚动到坐标。 |
| `HID_DRAG` | `source, target` | 拖拽操作。 |
| `HID_KEY` | `key, state` | 键盘按键 (Down/Up/Press)。 |

### 3.4 数据处理指令 (ALU / Data)

| OpCode | 参数 | 描述 |
| :--- | :--- | :--- |
| `MOV` | `target_var, value` | 赋值 (`$x = 1`)。 |
| `CALC` | `a, b, op` | 数学运算 (+, -, *, /)。 |
| `STR_CAT` | `a, b` | 字符串拼接。 |
| `JSON_PARSE`| `json_str` | 解析 JSON。 |

### 3.5 AI 增强指令 (L7 Extension)

| OpCode | 参数 | 描述 |
| :--- | :--- | :--- |
| `AI_PROMPT` | `prompt, context` | 调用 LLM 进行推理，结果存入 `%RESULT`。 |
| `AI_EXTRACT`| `schema` | 基于当前页面截图/DOM，提取结构化数据。 |
| `AI_ASSERT` | `condition` | 让 AI 判断当前页面状态是否符合自然语言描述。 |

---

## 4. 模块重构影响评估 (Impact Analysis)

### 4.1 Compiler (重灾区)
*   **现状**: 直接生成嵌套的 Task 树。
*   **目标**: 需要实现 **AST (抽象语法树) -> IR (中间表示)** 的转换。
    *   需要一个 "Flattening Pass" (扁平化阶段)，将 `If/Loop` 节点拆解为 `Label` 和 `JMP` 指令。
    *   需要实现 "Basic Block" 构建算法。

### 4.2 Runtime (核心升级)
*   **现状**: 递归/遍历执行 Task 数组。
*   **目标**: 变为 **Fetch-Decode-Execute 循环**。
    *   维护 `%IP` 指针。
    *   维护 Label 到 Instruction Index 的映射表 (Jump Table)。
    *   实现 `Switch-Case` 风格的指令分发器。

### 4.3 Type Definitions (基础)
*   `WorkflowPlan` 需要新增 `instructionSet` 字段。
*   废弃 `Task` 概念，引入 `Program`, `Block`, `Instruction` 类型。

## 5. 实施路线图 (Roadmap)

1.  **Phase 1 (Design)**: 确定 v1.1 规范，冻结指令集列表。 **(Current)**
2.  **Phase 2 (Types)**: 在 `shared/types` 定义新的 ISA 接口，与旧接口共存。
3.  **Phase 3 (Compiler)**: 编写新的 `CompilerService`，实现 Flattening 逻辑，输出汇编风格的 Program。
4.  **Phase 4 (Runtime)**: 编写新的 `VMService` (Virtual Machine)，实现 Fetch-Execute 循环。
5.  **Phase 5 (Migration)**: 将旧的 `WorkflowPlan` 转换为新格式，平滑升级。

---
**Status**: Draft v1.1
**Author**: VeilBrowser Architecture Team