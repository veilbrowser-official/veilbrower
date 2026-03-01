# Chromium 策略迁移：预打包 → 运行时下载

## 📋 概述

VeilBrowser 从 Chromium 预打包策略迁移到运行时下载策略，解决 macOS 权限问题，提升维护性和跨平台兼容性。

## 🎯 迁移背景

### 原始问题（预打包策略）
- ❌ macOS Gatekeeper 拦截预打包 Chromium
- ❌ Chromium 版本与 Playwright 版本不匹配
- ❌ 复杂的平台特定路径检测逻辑
- ❌ 打包体积大（~200MB）
- ❌ 版本同步维护困难

### 解决方案（运行时下载策略）
- ✅ Playwright 自动下载匹配版本 Chromium
- ✅ 无权限问题（下载文件无 quarantine）
- ✅ 统一路径处理逻辑
- ✅ 打包体积减小
- ✅ 维护成本降低

## 🔄 迁移详情

### 1. 主进程环境变量设置

#### 修改前（预打包）
```typescript
// main.ts
if (process.env.NODE_ENV === 'production') {
  delete process.env.PLAYWRIGHT_BROWSERS_PATH; // 使用系统 Chromium
} else {
  const browsersPath = path.join(app.getAppPath(), 'third-party', 'browsers');
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath; // 使用预打包 Chromium
}
```

#### 修改后（运行时下载）
```typescript
// main.ts
const userDataPath = app.getPath('userData');
const browsersPath = path.join(userDataPath, 'browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath; // 统一使用用户数据目录
```

### 2. 打包配置清理

#### 修改前
```javascript
// electron-builder.cjs
const getPlatformBrowserConfig = () => {
  // 复杂的平台检测和路径构建逻辑 (~50行)
  // 返回 Chromium 打包配置
};

extraResources: [
  ...getPlatformBrowserConfig() // 打包 Chromium 到 app.asar.unpacked
]
```

#### 修改后
```javascript
// electron-builder.cjs
// 移除 getPlatformBrowserConfig 函数
// 移除 extraResources 中的 Chromium 打包配置
// 打包配置大幅简化
```

### 3. Worker 进程启动逻辑

#### 修改前
```typescript
// context.ts - buildLaunchOptions()
let executablePath: string | undefined;
// 复杂的 Chromium 路径检测逻辑 (~100行)
// 遍历 chromium-* 目录，检测不同平台的可执行文件
// Windows: chrome-win/chrome.exe
// macOS: chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium
// Linux: chrome-linux/chrome

const launchOptions = {
  executablePath, // 手动设置路径
  // ... 其他配置
};
```

#### 修改后
```typescript
// context.ts - buildLaunchOptions()
// 移除所有 Chromium 路径检测逻辑

const launchOptions = {
  // 移除 executablePath，让 Playwright 自动解析
  // ... 其他配置
};
```

## 📊 对比分析

| 方面 | 预打包策略 | 运行时下载策略 |
|------|-----------|----------------|
| **首次启动时间** | 立即启动 | ~30秒下载时间 |
| **打包体积** | +200MB | 体积无变化 |
| **跨平台兼容** | 需要平台特定逻辑 | 完全统一 |
| **版本维护** | 需要手动同步 | 自动匹配 Playwright |
| **权限问题** | macOS Gatekeeper 拦截 | 无权限问题 |
| **代码复杂度** | ~150行路径检测逻辑 | 0行复杂逻辑 |
| **错误处理** | 复杂的fallback逻辑 | 简单的环境变量设置 |

## 🚀 实施步骤

### 1. 环境变量统一
- ✅ 修改 `main.ts`，统一设置 `PLAYWRIGHT_BROWSERS_PATH`
- ✅ 移除生产/开发环境的差异处理

### 2. 打包配置清理
- ✅ 删除 `electron-builder.cjs` 中的 `getPlatformBrowserConfig` 函数
- ✅ 移除 `extraResources` 中的 Chromium 打包配置

### 3. Worker 进程简化
- ✅ 删除 `context.ts` 中的 Chromium 路径检测逻辑 (~100行)
- ✅ 移除 `executablePath` 的手动设置
- ✅ 简化 `launchOptions` 构建

### 4. 脚本和文档更新
- ✅ 更新 `setup-browsers.js` 为验证脚本
- ✅ 更新 `test-browser-config.js` 为测试脚本
- ✅ 创建首次下载用户体验界面

### 5. 用户体验优化
- ✅ 添加首次下载进度界面
- ✅ 实现错误重试和离线模式
- ✅ 状态持久化，避免重复显示

## 🎨 代码质量提升

### 移除的复杂逻辑
- **平台检测**: `os.arch()` 判断 ARM64/Intel Mac
- **路径遍历**: 递归查找 `chromium-*` 目录
- **文件检测**: 检查各种平台的 `.exe`/`.app`/二进制文件
- **版本排序**: 选择最新版本的 Chromium
- **错误处理**: 多层fallback逻辑

### 简化的核心逻辑
```typescript
// 修改前：150行复杂路径检测
// 修改后：5行环境变量设置
const userDataPath = app.getPath('userData');
const browsersPath = path.join(userDataPath, 'browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
```

## 🔧 技术细节

### Playwright 路径解析机制

1. **环境变量检查**: 检查 `PLAYWRIGHT_BROWSERS_PATH`
2. **本地缓存检查**: 在指定目录查找已下载的 Chromium
3. **自动下载**: 如果未找到，自动下载匹配版本
4. **标准路径**: 使用统一的目录结构和命名

### Chromium 存储位置

```
macOS: ~/Library/Application Support/VeilBrowser/browsers/
├── chromium-1134/
│   └── chrome-mac/
│       └── Chromium.app/
Windows: %APPDATA%\VeilBrowser\browsers\
Linux: ~/.config/VeilBrowser/browsers/
```

### 版本匹配保证

Playwright 1.47.0 → Chromium 113.x（自动匹配，无需手动指定）

## 📈 收益总结

### 技术收益
- **减少代码量**: ~150行复杂逻辑 → 5行简洁配置
- **提升稳定性**: 消除平台特定bug，统一处理逻辑
- **简化维护**: 无需跟踪 Chromium 版本变化
- **减少打包时间**: 移除 200MB 文件的压缩/解压

### 用户体验收益
- **解决启动失败**: 彻底解决 macOS Chromium 权限问题
- **提升可靠性**: 版本匹配保证，减少兼容性问题
- **改善首次体验**: 清晰的下载进度和错误处理
- **跨平台一致**: Windows/macOS/Linux 行为完全一致

### 开发体验收益
- **简化开发**: 无需处理 Chromium 版本同步
- **减少测试**: 统一逻辑减少平台特定测试
- **便于调试**: 清晰的日志和错误信息

## 🎯 总结

这次 Chromium 策略迁移是 VeilBrowser 架构现代化的重要一步，通过采用运行时下载策略：

1. **解决了核心问题**: macOS 权限和版本兼容性问题
2. **大幅简化代码**: 移除了 150+ 行复杂路径检测逻辑
3. **提升了用户体验**: 添加了专业的首次下载界面
4. **增强了可维护性**: 统一处理逻辑，减少平台差异

这是一个典型的**用正确的技术方案解决复杂问题**的成功案例。

---

**迁移完成时间**: 2026-01-21
**涉及文件**: 8个核心文件
**减少代码量**: ~200行
**解决平台**: Windows / macOS / Linux