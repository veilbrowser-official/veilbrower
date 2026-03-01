# VeilBrowser 快速启动指南

## ✅ 项目状态

VeilBrowser 核心功能已实现，包括 Profile 管理、指纹伪装、代理集成、7 层自动化体系（Layers 1-5 已实现）。

### 已实现功能
- ✅ **Profile 管理**：创建、编辑、删除、批量操作、启动/关闭
- ✅ **指纹伪装**：50+ 指纹点（Canvas、WebGL、Audio、Fonts 等）
- ✅ **代理管理**：HTTP/SOCKS5 支持，健康检测，智能匹配
- ✅ **环境隔离**：每个 Profile 独立 `userDataDir`，完全隔离
- ✅ **执行引擎**：Layer 5 执行引擎（IPC 通信、任务分发、并发控制）
- ✅ **工作流编排**：Layer 6 工作流引擎（可视化编辑器、YAML/JSON 解析、断点调试）
- ✅ **实时预览**：网格预览模式，实时截图更新
- ✅ **Dashboard**：新版 Dashboard 界面，环境抽屉管理

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run electron:dev
```

这将启动：
- Vite 开发服务器（端口 5173）
- Electron 主窗口（新版Dashboard界面）
- 自动创建示例 Profile（美国、中国、俄罗斯）
- 环境抽屉默认收起，按 Ctrl+K 展开

**新版布局体验**：
- 左侧菜单点击“环境列表”展开抽屉
- 点击环境自动切换到Dashboard
- 顶部开关“经典模式”切回旧版列表页
- 编辑配置500ms自动保存，热更新浏览器

### 3. 构建生产版本

```bash
# 当前平台
npm run electron:build

# macOS
npm run electron:build:mac

# Windows
npm run electron:build:win

# Linux
npm run electron:build:linux
```

### 4. 自动化体系（7层架构）

VeilBrowser 采用 7 层自动化体系，当前实现状态：

- **Layer 1** ✅ 基础设施层：SQLite 数据库、日志系统、内存监控
- **Layer 2** ✅ 代理与网络层：代理管理、健康检测、智能匹配
- **Layer 3** ✅ 环境隔离层：Profile 隔离、CDP 控制、多 Tab 管理
- **Layer 4** ⚠️ 反检测层：基础指纹注入已实现，行为仿真待增强
- **Layer 5** ✅ 执行引擎层：任务分发、IPC 通信、并发控制、结果收集
- **Layer 6** ✅ 任务编排层：工作流引擎、可视化编辑器、YAML/JSON 解析、断点调试
- **Layer 7** ⏳ AI 智能上层：待实现 AI Hook（依赖外部 API）

详细架构说明请参考 [系统架构文档](ARCHITECTURE.md#系统架构)。

## 📁 项目结构

```
VeilBrowser/
├── docs/                       # 文档目录
│   ├── ARCHITECTURE.md          # 系统架构（包含7层自动化体系）
│   ├── QUICKSTART.md          # 本指南
│   ├── api/                   # API 文档
│   ├── modules/               # 模块文档（按7层架构）
│   └── ...                    # 其他文档
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── core/              # 入口（main.ts, preload.ts）
│   │   ├── business/          # 业务逻辑层（按领域组织）
│   │   │   ├── workflow/      # Layer 6: 工作流业务逻辑
│   │   │   ├── execution/     # Layer 5: 执行业务逻辑
│   │   │   ├── anti-detection/# Layer 4: 反检测业务逻辑
│   │   │   ├── profile/       # Layer 3: Profile 业务逻辑
│   │   │   └── proxy/         # Layer 2: 代理业务逻辑
│   │   ├── services/          # 服务层（实现业务逻辑）
│   │   │   ├── workflow/      # Layer 6: 工作流服务
│   │   │   ├── execution/      # Layer 5a: 执行引擎服务
│   │   │   ├── profile/       # Layer 3: Profile 服务
│   │   │   ├── proxy/         # Layer 2: 代理服务
│   │   │   └── infra/         # Layer 1: 基础设施服务
│   │   ├── ipc/               # IPC 处理器（统一注册）
│   │   ├── processes/         # 子进程（Worker, Execution）
│   │   ├── windows/           # 窗口管理
│   │   └── utils/             # 工具函数
│   ├── renderer/              # React 渲染进程
│   │   ├── components/        # UI 组件
│   │   ├── pages/             # 页面组件
│   │   ├── features/          # 功能模块（按功能组织）
│   │   │   ├── workflow/      # Layer 6: 工作流编辑器
│   │   │   ├── profiles/      # Profile 管理 UI
│   │   │   └── proxy/         # 代理管理 UI
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # React Hooks
│   │   └── services/          # 前端服务（AI Hook 待实现）
│   └── shared/                # 共享代码
│       ├── fingerprint/       # Layer 4: 指纹生成器
│       ├── types/             # 共享类型定义
│       └── utils/             # 共享工具
├── build/                     # 构建资源
├── resources/                 # 静态资源
└── public/                    # 公共资源
```

## 🎯 核心功能

### 1. Profile 管理
- ✅ 创建/编辑/删除/批量操作 Profile
- ✅ 启动/关闭 Profile 窗口（独立userDataDir隔离）
- ✅ Profile 状态持久化（SQLite + Zustand persist）

### 2. 指纹伪装
- ✅ 深度指纹注入（Canvas/WebGL/Audio/Fonts via CDP）
- ✅ 噪声种子一致性（SqliteDeviceRepository）
- ✅ 多国家配置（US/CN/RU等，自动时区/语言匹配）
- ✅ 指纹测试集成待（CreepJS页面）

### 3. 代理管理
- ✅ HTTP/SOCKS5支持（proxyDAO + HealthChecker）
- ✅ 国家/城市匹配（Smartproxy API池备选）
- ✅ 实时延迟测试（UI反馈）

### 4. 界面（新版Dashboard）
- ✅ 左侧环境抽屉（拖拽/搜索/批量创建）
- ✅ 右侧驾驶舱（高频编辑 + 四个大按钮）
- ✅ 全局搜索自动展开卡片
- ✅ 经典/新版模式无缝切换
- ✅ 撤销/重做框架（命令模式待完善）

### 5. 自动化体系（7层架构）
- **Layer 1-3** ✅ 已实现：基础设施、代理管理、环境隔离
- **Layer 4** ⚠️ 部分实现：基础指纹注入已实现，行为仿真待增强
- **Layer 5** ✅ 已实现：任务分发、IPC 通信、并发控制
- **Layer 6** ✅ 已实现：工作流编排、可视化编辑器、YAML/JSON 解析、断点调试
- **Layer 7** ⏳ 待实现：AI 智能上层（依赖外部 API）
- 详细实现状态请参考 [系统架构文档](ARCHITECTURE.md#实现状态)

## 🔧 技术栈

- **Electron 33+** (Chromium 129+)
- **Vite 5** + **React 18** + **TypeScript 5** (严格模式)
- **Ant Design 5.21+** (暗黑主题 #722ed1)
- **Zustand** (状态 + persist)
- **React Hook Form** + **Zod** (表单验证)
- **better-sqlite3** (DAO模式)
- **argon2** (加密)
- **Playwright** (待集成自动化)

## 📝 下一步开发

### 已实现功能
- ✅ Profile CRUD + 批量操作（DAO + Store）
- ✅ 指纹生成/注入（main/anti-detection）
- ✅ 代理管理/UI（ProxyManagement.tsx）
- ✅ Dashboard 布局（环境抽屉 + 实时预览）
- ✅ 执行引擎（Layer 5：任务分发、IPC 通信、并发控制）
- ✅ 工作流编排（Layer 6：可视化编辑器、YAML/JSON 解析、断点调试）
- ✅ 环境隔离（Layer 3：独立 userDataDir、CDP 控制）

### 待实现功能（按优先级）
1. **Layer 4 增强**（高优先）：行为仿真、undetected-playwright 集成
2. **Layer 7**（低优先）：AI Hook（Grok API + RAG）
3. 扩展管理：Chrome 扩展安装/卸载
4. Cookies 导入/导出：增强 Profile 管理
5. 指纹测试页面：CreepJS 集成
6. 工作流模板库：预置常用工作流模板

详细开发计划请参考 [路线图](../ROADMAP.md)。

## 🐛 已知问题
1. CDP 注入偶发失败（已添加重试机制，持续优化）
2. 并发启动大量 Profile 可能内存峰值（已使用 p-limit 限流）
3. 浏览器嵌入拖拽分离功能待完善

## 📚 开发文档

### 核心文档
- [系统架构](ARCHITECTURE.md) - 系统整体架构（7 层自动化体系 + 进程模型）
- [IPC 接口文档](api/ipc-api.md) - 所有 IPC 通信接口
- [数据库设计](db/database.md) - 表结构 + 字段说明

### 模块文档（按 7 层架构）
- [Profile 生命周期](modules/profile-lifecycle/README.md) - **Layer 3**: 环境隔离层
- [反检测与行为仿真](modules/anti-detection/README.md) - **Layer 4**: 反检测层
- [执行引擎](modules/execution-engine/README.md) - **Layer 5**: 执行引擎层

### 其他文档
- [贡献指南](../CONTRIBUTING.md) - 代码贡献规范
- [代码规范](../CODING-STYLE.md) - TypeScript/React 编码标准
- [路线图](../ROADMAP.md) - 未来开发计划

---
**最后更新**: 2025-01-XX | **维护者**: VeilBrowser Team

