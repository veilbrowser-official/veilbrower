# VeilBrowser 全局术语表 (GLOSSARY)

为了确保 AI 和开发者对项目核心概念有一致的理解，特制定本术语表。

## 核心对象 (Core Objects)

| 术语 (CN) | 术语 (EN) | 定义 |
| :--- | :--- | :--- |
| **环境配置** | **Profile** | 包含浏览器指纹、代理设置、Cookie、LocalStorage 等隔离数据的完整环境。每个 Profile 对应一个独立的 `userDataDir`。 |
| **浏览器指纹** | **Fingerprint** | 模拟真实设备的硬件和软件特征，包括 Canvas, WebGL, WebGPU, Audio, Fonts, Screen, UA 等。 |
| **工作流** | **Workflow** | 一组定义好的自动化操作序列（Steps），如：跳转、点击、输入、提取数据等。 |
| **步骤** | **Step** | 工作流中的最小操作单元。 |
| **批量任务** | **Batch Task** | 任务中心的概念。将一个工作流应用到多个 Profile 上的大规模执行过程。 |
| **任务中心** | **Task Center / Job Center** | 负责调度、监控和导出批量任务结果的应用层组件。 |

## 架构概念 (Architectural Concepts)

| 术语 (CN) | 术语 (EN) | 定义 |
| :--- | :--- | :--- |
| **7层架构** | **7-Layer Architecture** | 项目的核心分层模型，从 L1(Infra) 到 L7(AI Agent)。 |
| **主进程** | **Main Process** | Electron 主进程，负责资源调度、数据库、IPC 分发。 |
| **渲染进程** | **Renderer Process** | Dashboard UI 进程，负责用户交互和工作流编排 (L6)。 |
| **子进程 / 执行器** | **Worker / Worker Process** | 独立的 Node.js 进程，负责驱动 Playwright 并在隔离环境中执行任务 (L3-L5)。 |
| **直接 IPC** | **Direct IPC** | 淘汰 ZMQ 后，使用 Node.js 子进程标准 IPC (ipc channel) 进行主子进程通信。 |
| **单 Profile 原则** | **Single Profile Principle** | L6 编排层逻辑只关注单个 Profile 的执行逻辑，多 Profile 调度由应用层处理。 |

## 网络与代理 (Network & Proxy)

| 术语 (CN) | 术语 (EN) | 定义 |
| :--- | :--- | :--- |
| **代理池** | **Proxy Pool** | 存储并管理多个代理服务器的集合，支持健康检查和自动切换。 |
| **智能匹配** | **Smart Matching** | 根据 Profile 的国家/地区或指纹信息，自动从代理池中选择最合适的代理。 |
| **TLS 拦截** | **TLS Interception** | 为了反检测和抓包需求，对 HTTPS 流量进行中间人处理的技术。 |

## 状态与执行 (State & Execution)

| 术语 (CN) | 术语 (EN) | 定义 |
| :--- | :--- | :--- |
| **执行上下文** | **Execution Context** | 任务执行时的运行时状态，包含变量、页面句柄等。 |
| **意图理解** | **Intent Understanding** | L7 层将自然语言指令转化为工作流 DSL 的过程。 |
| **自愈** | **Self-healing** | 工作流执行失败后，AI 尝试重新规划路径或重试的机制。 |
