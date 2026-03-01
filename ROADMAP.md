# VeilBrowser Roadmap

> 持续更新 | 最后修订：2026-03-01

---

## 🎯 总体目标

将 VeilBrowser 打造成**生产可用的 AI 浏览器自动化引擎**，让开发者和研究者能够以自然语言驱动浏览器完成复杂任务，同时保持接近真实用户的浏览器指纹。

**核心指标：**

- 单机支持 20+ Context 并发运行
- 指纹伪装通过主流检测工具（CreepJS、Sannysoft 等）
- Agent 任务成功率 > 90%（标准场景）
- Tauri 程序启动时间 < 3s

---

## ✅ 已实现（v0.9.0）

### 核心引擎

- [x] **Tauri 2 → Chrome CDP** 桥接：通过 WebSocket 直连 Chrome DevTools Protocol
- [x] **Stealth 注入系统**：每个会话启动时动态注入反检测脚本，覆盖 50+ 指纹点
- [x] **多 Context 隔离**：每个 Context 拥有独立 Chrome Profile、代理、指纹矩阵
- [x] **动态端口管理**：PortManager 按需分配 CDP 端口，支持多 Chrome 实例并发

### AI Agent

- [x] **LLM ReAct 循环**：基于 OpenAI/Claude/自托管 LLM 的 OODA 决策循环
- [x] **并行工具调用**：单轮 LLM 回复可批量执行多个浏览器工具，减少 API 调用
- [x] **长程会话记忆**：AgentHistories 管理跨任务的对话上下文
- [x] **自愈机制**：捕获工具执行错误并将错误信息注入下一轮 LLM 上下文
- [x] **MCP Server**：内置 Model Context Protocol Server，提供结构化浏览器工具接口

### 基础设施

- [x] **SQLite 持久化**：所有 Context/Proxy/Extension/TaskRun 数据本地持久化
- [x] **实时日志系统**：结构化 JSON 日志 + Tauri Event 推送前端实时显示
- [x] **系统资源监控**：CPU/内存实时采样并推送前端展示
- [x] **代理管理**：支持 HTTP/SOCKS5 代理，含延迟检测
- [x] **技能库**：YAML 格式技能定义，AI 可读取并执行

### 前端 UI

- [x] **全局黑曜石紫设计体系**（SolidJS + TailwindCSS）
- [x] **Dashboard** — 任务运行状态实时监控、浏览器截图预览
- [x] **Context 管理** — 多环境身份管理（增删改查）
- [x] **代理管理** — 代理池 CRUD + 延迟测试
- [x] **技能库** — 技能列表展示与管理
- [x] **扩展管理** — Chrome 扩展配置
- [x] **实时日志** — 系统日志终端仿真界面

---

## 🔮 计划中

### v1.0.0 — 稳定发布

#### 反检测提升

- [ ] **Canvas/WebGL 噪声精度调优** — 与 CreepJS 通过率 > 98%
- [ ] **Font Fingerprint 隔离** — 基于 OS 类型限制字体列表
- [ ] **行为仿真** — 鼠标轨迹、打字节奏的人性化模拟
- [ ] **WebRTC 完整隐藏** — 防止 IP 泄漏

#### Agent 增强

- [ ] **视觉感知** — 集成截图 → LLM 视觉理解，处理验证码、图片内容
- [ ] **技能自动匹配** — Agent 根据任务意图自动选择最匹配的技能模板
- [ ] **任务计划器** — 将复杂目标拆解为子任务序列，支持条件分支

#### 基础设施

- [ ] **代码签名** — macOS 和 Windows 安装包代码签名
- [ ] **自动更新** — Tauri Updater 集成
- [ ] **数据导入/导出** — Context 配置、Cookies 批量操作

### v1.x — 深度自动化

- [ ] **并发调度器** — 支持 50+ Context 并行任务队列
- [ ] **工作流编排** — 可视化多步骤任务 DAG 编辑器
- [ ] **账号中心** — 平台账号状态监控与封禁检测
- [ ] **HTTP API** — 提供 REST/WebSocket 接口供外部系统调用
- [ ] **Docker 部署** — 无头模式 + 远程 API 支持

---

## 🗓️ 发布历史

| 版本   | 日期       | 亮点                                         |
| ------ | ---------- | -------------------------------------------- |
| v0.9.0 | 2026-03-01 | 开源首发，Tauri 2 + CDP + MCP Agent 完整架构 |

---

_本文档随版本发布持续更新。欢迎通过 [Issue](https://github.com/veilbrowser-official/veilbrower/issues) 提出功能建议。_
