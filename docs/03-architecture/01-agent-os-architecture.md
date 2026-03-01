# 01. AgentOS Core Architecture (V3)

> **文档类型**: 系统架构设计  
> **版本**: v3.0  
> **日期**: 2026-02-26  
> **状态**: 核心架构已定型 | 正在向 5 层 AI-Native 生态演进

---

## 1. 核心定位: Browser-as-an-OS

VeilBrowser V3 是一个 **AI-Native 反检测浏览器操作系统**，其核心理念是：

- **浏览器即操作系统** — 不是"带有自动化功能的浏览器"，而是"以浏览器为执行内核的智能操作系统"
- **AI 驱动一切** — 砍掉传统的低代码工作流编排（L6/L7），由 AI Agent 直接驾驶浏览器
- **物理级反检测** — 从 JS 注入升级到运行时内存级 Hook，实现真正的"不可区分"
- **自带基础设施** — 内置代理网关、插件仓库、凭证保险箱，打造 "Desktop Browserbase"

---

## 2. 五层生态架构 (The 5-Layer Stack)

新架构采用了 **"OS 内核 + 应用生态"** 的分离模式，严格划分为以下五层：

```
┌─────────────────────────────────────────────────────────────┐
│              L5: 技能应用层 (Skills Ecosystem)               │
│      XHS Skill · Twitter Skill · AI Agent (Driver)          │
├─────────────────────────────────────────────────────────────┤
│   ⬇️ MCP Protocol (JSON-RPC)                                │
├─────────────────────────────────────────────────────────────┤
│              L4: AI 接口层 (Stateless Translator)            │
│      原子能力 exposed as Tools (click, scroll, snapshot)    │
├─────────────────────────────────────────────────────────────┤
│              L3: 控制面 (The Brain & Infrastructure)         │
│  [核心调度] 进程管理 · ISA 编译 · 状态维护                   │
│  [基础设施] 🌐代理池 · 🧩插件库 · 🔐保险箱 · 📂工件库       │
├─────────────────────────────────────────────────────────────┤
│              L2: 执行内核 (The Dumb Executor)                │
│      CEF/Chromium · 页面渲染 · 原子动作执行                 │
├─────────────────────────────────────────────────────────────┤
│              L1: 反检测引擎 (Cross-Dimensional Mask)         │
│      Config 种子 · Chrome Args · Runtime Hooks              │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 L1: 反检测引擎 (Cross-Dimensional Mask)

- **核心职能**: 负责底层的指纹伪装与反查杀。
- **技术实现**: 摒弃魔改源码，采用运行时 Rust 动态库注入（`veil-hook`），劫持 V8 引擎与系统 API，注入基于 Profile 种子的硬件噪声（Canvas, WebGL, Audio）。

### 2.2 L2: 执行内核 (The Dumb Executor)

- **核心职能**: "哑巴"执行单元，只负责渲染和原子动作。
- **技术实现**: 标准 Chrome / Chromium 进程，通过远程调试端口（CDP）受控。它不感知业务逻辑，仅执行 L3 下发的原子指令（如点击、输入）。

### 2.3 L3: 控制面 (The Brain & Infrastructure)

- **核心职能**: 系统的中枢神经。负责会话调度、进程隔离与四大基础设施管理。
- **四大支柱**:
  - **Proxy Manager**: 本地 SOCKS5 网关，处理复杂鉴权与 IP 轮转。
  - **Extension Repo**: 插件中心化分发与 Manifest 清洗。
  - **The Vault**: 凭证保险箱，实现 Cookie/密码的冷热分离存储与自动注入。
  - **Artifacts Manager**: 下载工件的生命周期管理。

### 2.4 L4: AI 接口层 (The Interface)

- **核心职能**: 无状态翻译官。
- **技术实现**: 基于 MCP (Model Context Protocol) 协议，将 L3 的复杂控制流封装为 AI 可识别的 Tools（如 `browse_url`, `extract_dom`）。

### 2.5 L5: 技能应用层 (The Application Ecosystem)

- **核心职能**: 业务逻辑载体，以 **Natural Language to Skill (NL2S)** 为驱动。
- **演进路线**: [02-l5-agentic-control-roadmap.md](./02-l5-agentic-control-roadmap.md) (对准 Antigravity 水平)。
- **机制**: 采用 **Discovery (探索) -> Caching (缓存) -> Self-healing (自愈)** 流程，整合视觉感知(SoM)与物理拟人输入引擎。

---

## 3. 逻辑功能映射 (Mapping)

| 原架构层级 (Logical) | 融合方案 (Mapping)                              | 物理位置 (Physical)                          |
| :------------------- | :---------------------------------------------- | :------------------------------------------- |
| **L1 基础设施**      | **Tauri 核心库** (日志、数据库、文件系统)       | **L3 (Control Plane)**                       |
| **L2 代理网络**      | **Rust 本地网关** (拦截流量、动态鉴权、IP 轮转) | **L3 (ProxyManager)** → **L2 (Network)**     |
| **L3 环境隔离**      | **进程级物理隔离** (每个 Profile = 独立进程)    | **L3 (Scheduler)** → **L2 (Chrome Process)** |
| **L4 反检测**        | **三维立体防御**                                | **L3**(配置) + **L2**(参数) + **L1**(注入)   |
| **L5 智能体**        | **MCP Server + Agent 直驱**                     | **L4** (接口) + **L5** (Skills)              |
| **L6/L7 工作流**     | **已砍掉** — Agent 直驱替代                     | ❌ 归档                                      |

---

## 4. 核心数据流

1. **AI Agent** 发起意图 -> **L4 (MCP)**。
2. **L4** 翻译意图 -> **L3 (Control Plane)**。
3. **L3** 调用 **Vault** 获取凭证，从 **Proxy Manager** 分配通道，并拉起 **L2 (Executor)**。
4. **L1** 在 **L2** 启动瞬间注入指纹噪声。
5. **L2** 执行动作并返回执行流（Live Frame/DOM）回推至表现层。

---

> **文档维护**: 随着系统迭代，本文档作为 V3 唯一准则架构持续更新。
> **最后更新**: 2026-02-26
