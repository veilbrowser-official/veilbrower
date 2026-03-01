# 02. L5 Agentic Control Roadmap (对标 Antigravity)

> **文档类型**: 演进路线图 & 架构方案  
> **版本**: V1.0 (Draft)  
> **日期**: 2026-02-26  
> **目标**: 将 VeilBrowser 的 L5 能力提升至行业顶尖水平，对齐 Antigravity 智能体标准。

---

## 1. 核心痛点与演进目标

在目前的 5 层架构中，L1~L4 已经建立起了坚实的反检测防御（Runtime Hook、Noise Injection、Proxy）。但在 **L5 层 (Agent 控制中枢)**，我们仍然采用传统的“基于前端 DOM”的指令生成，这很容易因为页面结构混淆、弹窗遮挡或 Cloudflare 等防爬虫验证而失败。

为了打通 "Browser-as-an-OS" 的最后一环，我们需要重点攻克以下四大能力：

1.  **坐标级视觉认知 (Visual Grounding)**：摆脱对 CSS Selector 的依赖。
2.  **物理学输入仿真 (Physics Emulation)**：摆脱直接触发 `Element.click()` 的机器痕迹。
3.  **OODA 自愈状态机 (Self-Healing Loop)**：摆脱遇到意外就报错退出的开环控制。
4.  **预测性预热池 (Warm-pool Prediction)**：摆脱每次启动浏览器所需冷启动时间的延迟。

---

## 2. 基于 5 层架构的融合方案

这四大能力将完美嵌入到现有的五层生态架构中，无需打破重做，仅进行特定组件的增强升级。

### 2.1 L2 执行层改造：注入 `PhysicsInput` 引擎

**问题**: 直接调用 `click` 或快速设置 `value` 会触发站点的鼠标轨迹分析模型。
**改造方案**:

- 不再执行 JS 的 DOM 交互。
- 在 `CdpClient` 层封装一个 `physics_input.rs` 模块。
- 引入 **Fitts's Law (费茨法则)** 算法计算预期鼠标移动时间。
- 引入 **贝塞尔曲线 (Bézier Curve)** 生成从 A 点到 B 点带有轻微抖动、加减速过程的鼠标采样点阵，通过 CDP 的 `Input.dispatchMouseEvent(type="mouseMoved")` 逐一发送。
- 按键输入引入严格的按压/弹起间歇延迟 (70ms\~120ms)。

### 2.2 L4 接口层改造：引入 `Set-of-Mark (SoM)` 视觉标记

**问题**: 现代框架的 CSS class 名称都是哈希值或动态生成的，大模型无法通过 DOM 准确定位。
**改造方案**:

- 在大模型请求分析屏幕前，通过 CDP 给当前页面注入一套轻量级打标 JS (`som_injector.js`)。
- 给页面中所有交互元素（可点击、可输入文本）绘制带数字序号的 Bounding Box (边框)。
- 将带有数字标记的 **Screen Capture (屏幕截图)**，以及数字与坐标对应的 **DOM JSON 字典** 传给多模态大模型 (Vision LLM)。
- 模型输出直接表现为：“我要点击 `[元素序号 45]`”，引擎随后将序号映射为真实坐标 (x, y)。

### 2.3 L5 中枢层改造：OODA 闭环状态机

**问题**: 任务执行过程中，随时可能跳出一个登录要求、Cookie 同意横幅或验证码挑战。
**改造方案**:

- 重构 `DiscoveryService`。不再是线性的"查找 -> 动作 -> 结束"盲跑。
- 建立真正的 **OODA 循环 (Observe -> Orient -> Decide -> Act)**：
  - **Observe**: 截图并获取打标后的 DOM。
  - **Orient**: 与 LLM 之前的长期上下文比对（记忆池）。大模型需要评估：“当前结果是符合预期目标，还是被弹窗打断了？”
  - **Decide**: 大模型生成修复动作（比如“先点击 [X] 关闭弹窗”）或继续推进主干任务。
  - **Act**: 移交给 L2 执行物理模拟点击。
- 允许循环嵌套，直到达到 `Max_Iterations`。

### 2.4 L3 控制层改造：热备预热池 (Warm-pool)

**问题**: 冷启动 Chromium 并挂载 L1 环境需要时间，实时体验打折扣。
**改造方案**:

- 在后台常驻维护一个大小为 `N=1或2` 的 "幽灵浏览器" 池。
- 这些幽灵浏览器已经在静默运行，并被注入了基本的 L1 随机特征。
- 当前端发起新的 Agent 任务时，`Api.rs` 执行 **"Hijack (劫持)"** 策略，瞬间将空闲的 CDP 会话分配给任务并切到前台执行，实现毫秒级 Agent 响应。

---

## 3. 阶段性执行路线 (Roadmap)

我们采取由下至上（从物理控制到上层认知能力）的三阶段交付模式：

### 🏁 Phase 1: 底层输入拟人化 (Physics Engine) - [推荐首选任务]

- **动作项**: 在 `src-tauri/src/domain/engine/` 下开发 `physics_input.rs`（贝塞尔轨迹、按键延迟模拟）。
- **集成**: 升级 `SkillExecutor`，完全禁止 `Runtime.evaluate` 操作 DOM，所有动作改由 `physics_input.rs` 发送底层 CDP Input 事件。
- **收益**: 立刻获得终极过风控能力。

### 🏁 Phase 2: 视觉标记与认知系统 (SoM + Vision)

- **动作项**: 编写 `som_injector.js` 并作为 L4 MCP 工具调用的一部分注入页面。
- **集成**: 修改 `DiscoveryService` Prompt 体系，开始强制要求大模型返回坐标与序号，抛弃 CSS 选择器。支持解析截图流。
- **收益**: 跨越复杂或乱码网站的理解鸿沟。

### 🏁 Phase 3: 循环记忆与预热框架 (Self-Healing OODA)

- **动作项**: 用状态机重写 `DiscoveryService`，实现单会话多轮回话记忆。
- **集成**: 在 `ChromeLauncher` 外包一层 `SessionPoolManager` 提供幽灵热备。
- **收益**: 彻底蜕变为主流前沿 Agent，实现高度智能自愈。

---

> **结语**: 一旦此路线图落地，VeilBrowser 将拥有媲美业界头部 Agentic 生态 (如 Antigravity / Browser-use) 的拟人化交互智商，而我们在反指纹伪装（L1）和本地化数据落盘方面的厚重积累，则是那些纯云端工具所无法匹敌的深层护城河。
