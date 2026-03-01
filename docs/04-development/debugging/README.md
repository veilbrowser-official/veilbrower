# 调试指南 (Debugging Guide)

本文档旨在帮助开发者快速定位和解决 VeilBrowser 开发过程中的常见问题。

## 🛠️ 调试工具概览

VeilBrowser 提供了一系列内置的脚本和环境变量配置，用于诊断浏览器启动、数据库连接、Profile 加载等问题。

### 1. 核心调试模式

在开发环境下，可以通过环境变量开启详细的调试日志。

**开启所有模块的调试日志：**

```bash
# 在终端中运行
DEBUG=veilbrowser:* npm run dev
```

**仅开启特定模块的调试日志：**

```bash
# 仅调试工作流模块
DEBUG=veilbrowser:workflow* npm run dev

# 仅调试数据库模块
DEBUG=veilbrowser:database* npm run dev
```

**关键环境变量：**
- `VITE_ENABLE_DEBUG=true`: 开启前端调试功能
- `VITE_DEV_TOOLS=true`: 强制开启开发者工具

---

## 🩺 诊断脚本 (Diagnostic Scripts)

项目根目录和 `scripts/` 目录下提供了一些独立的诊断脚本，用于隔离测试特定功能。

### 1. 浏览器启动诊断 (`scripts/diagnose-browser-launch.js`)

当浏览器无法启动或 Crash 时使用。

**功能：**
- 检查 Playwright 版本及 Chromium 可执行文件路径。
- 验证 Chromium 文件是否存在。
- 测试基础启动（Headless 模式）。
- 检查并创建测试用的用户数据目录 (`~/Library/Application Support/VeilBrowser-test`)。
- 测试持久化上下文 (Persistent Context) 启动。

**使用方法：**

```bash
node scripts/diagnose-browser-launch.js
```

### 2. Profile 数据诊断 (`scripts/diagnose-profiles.js`)

当 Profile 列表加载失败或数据异常时使用。

**功能：**
- 检查 SQLite 数据库文件是否存在及其大小。
- 尝试使用系统自带的 `sqlite3` 命令行工具直接连接数据库。
- 统计 `profiles` 表中的记录数，验证数据库可读性。

**使用方法：**

```bash
node scripts/diagnose-profiles.js
```

### 3. 工作流数据库调试 (`debug-workflow-db.js`)

用于调试工作流相关的数据存储问题。

**使用方法：**

```bash
node debug-workflow-db.js
```

---

## 常见问题排查 (Troubleshooting)

### 浏览器启动失败

1. **检查依赖**: 运行 `node scripts/diagnose-browser-launch.js` 确认 Chromium 路径正确。
2. **清理缓存**: 删除 `node_modules` 和 `dist` 目录重新安装。
3. **GPU 问题**: 尝试添加环境变量 `DISABLE_GPU=true` 运行。

### 数据库连接错误

1. **检查文件**: 确认 `~/Library/Application Support/VeilBrowser/veilbrowser.db` 存在且未损坏。
2. **运行诊断**: 使用 `scripts/diagnose-profiles.js` 验证连接。
3. **重建数据库**: 如果是开发环境，可以尝试备份后删除数据库文件，应用会自动重新初始化。

### 日志查看

- **主进程日志**: 终端输出 (stdout/stderr)。
- **渲染进程日志**: 开发者工具 (DevTools) -> Console。
- **日志文件**: 检查 `logs/` 目录（如果配置了文件日志）。

---

## 贡献

如果你开发了新的诊断工具或发现了通用的调试技巧，请更新本文档。
