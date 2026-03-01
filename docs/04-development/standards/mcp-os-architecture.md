# L5 Agent OS - MCP 接口架构与集成规范

> **说明**: 本文档详述了 VeilBrowser 作为 **Agent OS** (L5 架构) 的核心接口设计。所有面向大模型 (LLM) 的能力抽象，均通过标准化的 **MCP (Model Context Protocol)** 协议对外暴露。

## 1. 核心设计理念 (Agent OS)

VeilBrowser 的 L5 层被设计为一个**赋予大模型操作系统级权限的网关**。
LLM 不再直接面对复杂的原生 DOM 或操作系统 API，而是调度我们提供的 **MCP 工具集**。

- **隔离性**: AI 操作运行在与真实宿主系统隔离的 `Context`（容器）中。
- **语义化**: 浏览器不向 AI 暴露繁杂的 HTML Nodes 树，而是暴露精简的 **Semantic DOM (语义树)**。
- **原子性**: 动作通过原子指令 (如 Click, Select) 并携带目标元素的唯一 `vid` (Veil ID) 发起。

---

## 2. 现有 MCP 工具集 (Tools)

当前系统中已实现了以下稳定的核心接口 (`src-tauri/src/infrastructure/mcp/tools.rs`)：

### 2.1 启动与基础导航层
*   `launch_context`
    *   **描述**: 启动 VeilBrowser 的浏览器核心，映射到一个隔离的 Profile 容器里，并将其注入为当前 MCP 会话的活跃上下文。
    *   **参数**: `profile_id` (string, 必须), `url` (string, 初始化地址)。
    *   **注意**: 必须在进行其他所有网页操作前调用。
*   `browse_url`
    *   **描述**: 命令当前活动的上下文跳转到指定网页 URL。

### 2.2 视觉与语义感知层 (Observe)
*   `extract_semantic_dom`
    *   **描述**: 核心感知接口。剔除无关痛痒的 DOM 层叠与样式，仅返回页面上的**交互元素**（按钮、输入框、链接等）构建的轻量级 JSON 树。
    *   **关键机制**: 每个返回的交互元素都会被强行打上一个页面级唯一的 `vid` (Veil ID)。

### 2.3 物理交互层 (Act)
*   `perform_web_action`
    *   **描述**: 基于 AI 的决策进行点击、输入等操作。
    *   **参数**: 
        *   `action` (枚举: `click`, `type`, `press_enter`)
        *   `vid` (整数, **强依赖** `extract_semantic_dom` 返回的 ID)
        *   `text` (文本，当 action 为 `type` 时必须附带)
*   `inject_skill`
    *   **描述**: 终极兜底接口。当标准 DOM 操作无法满足需求（如复杂的验证码滑动、原生 Canvas 数据提取），AI 可下发一整段 JavaScript 脚本（Skill）直接在当前页面 V8 上下文中执行。

---

## 3. Web UI 端的集成链路 (优雅实践)

针对用户在前端 UI 上“如何优雅地感知和触发”这一问题，请遵循以下交互与状态机设计：

### 3.1 状态透传与 AgentTracePanel
Agent 的运行是一个异步流，不能让前端傻等。所有的 MCP 动作执行状态必须由后端通过 `emit("agent_stream_chunk")` 流式传递给前端。
*   前端的 `AIChatPanel.tsx` 应当充当日志消费终端，而非控制中枢。
*   当大模型主动调用 `launch_context` 成功后，后端必须抛出一个带有 `traceId` 标记的 Chunk。
*   前端匹配到此标记，立刻弹射/局部渲染出 `<AgentTracePanel traceId={traceId} />`。

### 3.2 意图挂载与强制接管 (OODA Loop 拦截)
大模型的 OODA (观察-导向-决策-行动) 循环在后端 `discovery.rs` 或具体的 Skill 脚本中闭环。
*   **手动辅助**: 当 MCP 遇到无法攻克的拦截（例如通过 `extract_semantic_dom` 分析出画面呈现了 Cloudflare Turnstile 验证码），AI 应主动暂停循环。
*   **UI 映射**: 后端抛出 `status: "AWAITING_HUMAN"` 事件。前端捕获后，在原先的 `AgentTracePanel` 上高亮显示一个【接管浏览器】或【注入接管代码】的求助按钮。
*   用户干预完成后，前端调起一个 IPC 信令（如 `resume_agent_loop`），释放后端的锁，让 MCP 继续执行下一个 `extract_semantic_dom`。

## 4. 后续演进规划

目前的 5 个工具已经足以覆盖 80% 的常规填表、抓取和点击动作。为了完善真正的 Agent OS 体验，下一步需要补充：
1.  **Tab 与句柄控制**: `switch_tab`, `close_tab`。
2.  **高级页面交互**: `scroll_page` (滚动以触发懒加载), `hover_element` (悬停触发下拉菜单)。
3.  **信息收集补齐**: `get_page_screenshot` (支持多模态大模型直接看图，替代纯 DOM 解析)。
