# VeilBrowser

> **新架构**: Tauri + CEF + Rust Hook  
> **状态**: 🚧 架构重组中（2026-02-18）

---

## 🏗️ 项目结构

```
VeilBrowser/
├── legacy-electron/          # 🗂️ Electron 旧代码（已归档）
├── src-tauri/                # 🦀 Tauri 主控面（Rust 后端）
├── veil-hook/                # 🎣 Rust Hook 框架（独立子项目）
├── frontend/                 # ⚛️ React 前端 UI
├── cef-binaries/             # 🌐 CEF 预编译二进制
├── docs/                     # 📚 项目文档
└── scripts/                  # 🛠️ 自动化脚本
```

---

## 🚀 快速开始

### 环境要求

- **Rust**: 1.93+ (`rustup`)
- **Node.js**: 20+ (`nvm`)
- **Tauri CLI**: `cargo install tauri-cli@2.1`

### 开发模式

```bash
# 1. 安装前端依赖
cd frontend && npm install

# 2. 启动前端开发服务器
npm run dev

# 3. 启动 Tauri 应用（新终端）
cd src-tauri
cargo tauri dev
```

### 构建生产版本

```bash
# 构建前端
cd frontend && npm run build

# 构建 Tauri 应用
cd src-tauri
cargo tauri build
```

---

## 📂 模块说明

### src-tauri/ — Rust 后端

- **Tauri 2.1**: 主控面，负责窗口管理、IPC、系统集成
- **CEF Manager**: CEF 进程生命周期管理
- **Services**: Profile、授权、工作流等业务服务
- **Database**: SQLite 数据持久化

### veil-hook/ — Hook 框架

- **Canvas Hook**: Canvas 指纹扰动
- **WebGL Hook**: WebGL 参数修改
- **Audio Hook**: AudioContext 指纹伪装
- **WebRTC Hook**: WebRTC IP 隐藏
- **Injector**: DLL/Dylib 注入工具

### frontend/ — React 前端

- **React 18**: 现代化 UI 框架
- **Ant Design 5**: 紫色暗黑主题
- **Zustand**: 轻量状态管理
- **Vite**: 快速开发构建

### legacy-electron/ — 归档代码

旧的 Electron 架构实现（7层架构），仅供参考，不再维护。

详见 [legacy-electron/README.md](./legacy-electron/README.md)。

---

## 📋 开发路线图

### ✅ Phase 0: Tauri POC（已完成）

- Tauri 2.1 项目搭建
- Mock CEF Manager 验证
- CEF 145.0.24 下载就绪

### 🚧 当前: 架构重组

- Electron 代码归档
- 新目录结构创建
- Rust Workspace 配置

### ⏭️ Phase 0.1: 真实 CEF 集成

- 编译 cefsimple
- 移除 Mock 模式
- Rust Hook 框架开发

### 🔮 未来: 完整迁移

- UI 组件迁移（Agent A）
- 业务逻辑迁移（Agent B）
- Hook 框架完善（Agent C）

详见 [ROADMAP.md](./ROADMAP.md)。

---

## 📚 文档

- [产品文档](./docs/01-product/)
- [架构设计](./docs/02-architecture/)
- [API 文档](./docs/03-api/)
- [开发指南](./docs/04-development/)
- [架构重组方案](./.gemini/antigravity/brain/058cb7f7-c3e0-4f58-936a-a54bc95af473/architecture_restructure.md)

---

## 🤝 并行开发

支持多 Agent 同时工作：

- **Agent A**: 前端 UI 迁移（`frontend/`）
- **Agent B**: Tauri 后端开发（`src-tauri/`）
- **Agent C**: Hook 框架开发（`veil-hook/`）

详见 [架构重组方案](./architecture_restructure.md)。

---

## 📄 License

MIT

---

**注意**: 本项目正在从 Electron 架构迁移至 Tauri + CEF + Rust。旧代码位于 `legacy-electron/`。
