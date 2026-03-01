# Changelog

本文档遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [0.9.0] — 2026-03-01 🎉 _开源首发_

### 新增

**核心引擎**

- Tauri 2 + Chrome CDP 桥接，通过 WebSocket 直连 Chrome DevTools Protocol
- 动态 Stealth 脚本注入系统，覆盖 50+ 浏览器指纹点
- 多 Context 隔离架构，每个身份独享 Chrome Profile + 代理 + 指纹矩阵
- PortManager 动态分配 CDP 端口，支持多 Chrome 实例并发

**AI Agent**

- LLM ReAct 决策循环（支持 OpenAI / Anthropic / 自托管）
- 并行工具调用：单轮 LLM 回复批量执行多个浏览器操作
- 长程会话记忆 (AgentHistories)，跨任务保持上下文
- Agent 自愈机制：工具报错自动注入 LLM 下一轮上下文
- MCP (Model Context Protocol) Server 内置，提供结构化工具接口

**基础设施**

- SQLite 本地持久化（Context / Proxy / Extension / TaskRun）
- 结构化 JSON 日志 + Tauri Event 实时推送前端
- 系统资源监控（CPU/内存）实时采样
- 代理管理（HTTP/SOCKS5）+ 延迟检测
- YAML 技能库系统

**前端 UI**（SolidJS + TailwindCSS + 全局黑曜石紫主题）

- Dashboard — 任务状态实时监控 + 浏览器截图预览
- Context 管理、代理管理、扩展管理
- 实时日志终端
- AI 对话界面（Agent 交互面板）

**CI/CD**

- GitHub Actions 全平台构建（macOS arm64/x64、Linux x64、Windows x64）
- 仅在推送 `v*` Tag 时触发构建，避免浪费资源

---

## [历史归档]

_v0.9.0 之前的开发历史为内部版本，不在此记录。_
