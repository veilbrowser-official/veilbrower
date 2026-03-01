<div align="center">

<img src="frontend/public/icon.png" alt="VeilBrowser Logo" width="100" height="100" />

# VeilBrowser

**AI-Native Anti-Detection Browser — 下一代 AI 驱动的反检测浏览器**

[![Release](https://img.shields.io/github/v/release/veilbrowser-official/veilbrower?style=flat-square&color=7c3aed)](https://github.com/veilbrowser-official/veilbrower/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?style=flat-square)](https://github.com/veilbrowser-official/veilbrower/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24C8D8?style=flat-square&logo=tauri)](https://tauri.app)
[![Rust](https://img.shields.io/badge/backend-Rust-orange?style=flat-square&logo=rust)](https://www.rust-lang.org)

[简体中文](#) · [English (soon)](#) · [下载安装包](https://github.com/veilbrowser-official/veilbrower/releases) · [报告问题](https://github.com/veilbrowser-official/veilbrower/issues)

</div>

---

## ✨ 这是什么？

**VeilBrowser** 是一款面向 AI 自动化场景的**反检测浏览器控制引擎**。它以 **Tauri 2 + Rust** 为核心，将 Chrome 浏览器通过 CDP（Chrome DevTools Protocol）转化为可编程的 AI Agent 工作节点，实现：

- 🧠 **AI Agent 驱动**：集成 LLM（OpenAI/Claude/自托管），Agent 通过自然语言指令自主完成浏览器操作
- 🎭 **深度反检测**：运行时 Stealth 注入，覆盖 50+ 指纹点，确保浏览器不被平台识别为自动化工具
- 🌐 **多环境隔离**：每个 Context（身份）拥有独立的浏览器 Profile、代理、指纹，互不污染
- ⚡ **MCP 协议支持**：内置 Model Context Protocol Server，AI Agent 可直接调用结构化浏览器工具
- 🔧 **技能库系统**：将常用自动化流程封装为可复用的技能（YAML），AI 可自动选择并执行

---

## 🖥️ 功能截图

> _深色沉浸式 UI — 全局黑曜石紫设计体系_

| Dashboard        | Context 管理     | 实时日志         |
| ---------------- | ---------------- | ---------------- |
| _(截图即将上传)_ | _(截图即将上传)_ | _(截图即将上传)_ |

---

## 🏗️ 技术架构

```
VeilBrowser
├── frontend/             # ⚛️  SolidJS + TailwindCSS — 极致沉浸式前端 UI
├── src-tauri/            # 🦀  Rust 后端 (Tauri 2)
│   ├── domain/           #     业务域：Agent、Identity、Gateway、Engine
│   ├── infrastructure/   #     基础设施：SQLite、MCP Server、日志、监控
│   └── commands/         #     IPC 命令：Contexts、Proxies、Extensions、Tasks
├── skills_library/       # 📚  YAML 技能库 — AI 可直接调用的自动化剧本
├── docs/                 # 📖  项目文档
└── scripts/              # 🛠️  工具脚本
```

**核心技术栈：**

| 层级       | 技术                                       |
| ---------- | ------------------------------------------ |
| 应用框架   | Tauri 2 (Rust)                             |
| 前端       | SolidJS + TypeScript + TailwindCSS         |
| AI 集成    | OpenAI / Anthropic / 自托管 LLM (via HTTP) |
| 浏览器控制 | Chrome DevTools Protocol (CDP)             |
| 协议       | MCP (Model Context Protocol)               |
| 数据库     | SQLite (sqlx)                              |
| 反检测     | 动态 Stealth 脚本注入 (Rust 生成)          |

---

## 🚀 快速开始

### 环境要求

| 工具          | 最低版本   | 安装                                                              |
| ------------- | ---------- | ----------------------------------------------------------------- |
| Rust          | 1.75+      | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js       | 20+        | [nodejs.org](https://nodejs.org)                                  |
| Google Chrome | 任意稳定版 | [chrome.google.com](https://www.google.com/chrome/)               |

### 开发模式

```bash
# 1. 克隆仓库
git clone https://github.com/veilbrowser-official/veilbrower.git
cd veilbrower

# 2. 安装依赖
cd frontend && npm install && cd ..
npm install

# 3. 启动开发服务器（自动热重载）
npm run dev
```

### 构建正式版

```bash
# 前端构建
cd frontend && npm run build && cd ..

# Tauri 构建（当前平台）
cd src-tauri && cargo tauri build
```

---

## 🤖 AI Agent 使用示例

VeilBrowser 内置了 LLM 驱动的 ReAct Agent。在设置中配置好 API Key 后，Agent 即可接收自然语言指令：

```
用户: "去 twitter.com，用 test@example.com 登录，截图保存"

Agent:
  → navigate("https://twitter.com")
  → find_element("[data-testid=loginButton]")
  → click(element)
  → fill_input("[name=email]", "test@example.com")
  → screenshot("twitter_login.png")
  → 完成
```

**支持的 MCP 工具：**

- `browser_navigate` — 导航到 URL
- `browser_click` — 点击元素
- `browser_fill` — 填写表单
- `browser_screenshot` — 截图
- `browser_extract` — 提取页面数据
- `browser_evaluate` — 执行 JavaScript

---

## 🎭 反检测能力

VeilBrowser 在每个浏览器会话启动时自动注入 Stealth 脚本，覆盖以下指纹维度：

| 类别       | 覆盖项                                        |
| ---------- | --------------------------------------------- |
| 浏览器标识 | User-Agent, navigator.userAgentData, platform |
| 图形渲染   | Canvas 噪声, WebGL 参数, GPU 信息             |
| 音频       | AudioContext fingerprint                      |
| 网络       | WebRTC IP 隐藏                                |
| 自动化特征 | `navigator.webdriver`, CDP 痕迹清除           |
| 时间       | performance.now 随机偏移                      |

每个 Context 的指纹基于 Profile ID 确定性生成，保证多次访问的一致性。

---

## 📦 下载安装

前往 [Releases 页面](https://github.com/veilbrowser-official/veilbrower/releases) 下载对应平台安装包：

| 平台                  | 安装包                            |
| --------------------- | --------------------------------- |
| macOS (Apple Silicon) | `VeilBrowser_*_aarch64.dmg`       |
| macOS (Intel)         | `VeilBrowser_*_x64.dmg`           |
| Linux                 | `VeilBrowser_*.AppImage` / `.deb` |
| Windows               | `VeilBrowser_*.msi` / `.exe`      |

---

## 📚 文档

| 文档                                 | 说明                         |
| ------------------------------------ | ---------------------------- |
| [开发指南](docs/04-development/)     | 编码规范、架构约束、安全铁律 |
| [架构设计](docs/03-architecture/)    | 系统架构与模块说明           |
| [快速上手](docs/02-getting-started/) | 安装与配置指南               |
| [产品文档](docs/01-product/)         | 功能介绍与解决方案           |
| [CHANGELOG](CHANGELOG.md)            | 版本更新记录                 |

---

## 🤝 贡献

欢迎提交 Issue 和 PR！请先阅读：

- [开发规范](docs/04-development/standards/coding-style.md)
- [架构约束](docs/04-development/standards/architecture-constraints.md)

```bash
# Fork → Clone → 新建分支 → 提交 PR
git checkout -b feat/your-feature
git commit -m "feat: your feature description"
git push origin feat/your-feature
```

---

## 📄 License

[MIT](LICENSE) © 2026 VeilBrowser Official

---

<div align="center">

**⭐ 如果觉得有用，请给一个 Star！**

Made with ☕ and 🦀 Rust

</div>
