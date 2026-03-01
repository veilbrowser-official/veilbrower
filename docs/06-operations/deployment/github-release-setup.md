# 🐙 GitHub Release 配置指南

## 📋 概述

本指南介绍如何为 VeilBrowser 配置 GitHub Release，实现自动更新功能。

## 🔧 配置步骤

### 1. 注册专用 GitHub 账号

**推荐设置：**
- 📧 **邮箱**: 使用专用 Gmail（如 veilbrowser.app@gmail.com）
- 👤 **用户名**: `veilbrowser-app` 或 `veilbrowser-official`
- 🔒 **两步验证**: 必须开启
- 🖼️ **头像**: 使用项目Logo或抽象图案
- 📝 **简介**: "VeilBrowser - Advanced Browser Automation Tool"

**重要提醒：**
- 🚨 **不要配置全局 Git 账户**：发布脚本会自动使用专用账户配置
- 🔧 **本地仓库配置**：脚本使用 `git config --local` 只影响当前仓库

### 2. 创建 GitHub 仓库

1. **仓库名称**: `veilbrowser`
2. **描述**: "Let every account be born in shadow - Advanced Browser Automation"
3. **可见性**: 公开（Public）
4. **初始化**: 不需要 README、.gitignore、License

### 3. 配置 electron-builder

**文件**: `electron-builder.config.ts`

```typescript
// 发布配置（用于自动更新）
publish: [
  {
    provider: 'github',
    owner: 'veilbrowser-app',        // 🔴 替换为实际的GitHub用户名
    repo: 'veilbrowser',             // 🔴 替换为实际的仓库名
    private: false,                  // 公开仓库设为false
    releaseType: 'release',          // 只发布正式版本
    // token: process.env.GITHUB_TOKEN, // 🔴 私有仓库时需要
  }
]
```

### 4. 环境变量配置

**创建文件**: `.env.local`

```bash
# GitHub Token（私有仓库时需要）
GITHUB_TOKEN=your_github_personal_access_token

# 其他环境变量
NODE_ENV=production
```

## 📦 发布流程

### 自动发布脚本

**自动生成**: 运行 `setup-github-release.sh` 后会自动创建 `scripts/publish-release.sh`

**特性：**
- 🔧 **自动 Git 配置**：使用专用账户，不影响您的全局配置
- 🏗️ **一键构建**：自动构建所有平台版本
- 📦 **自动发布**：推送到 Git 和创建 GitHub Release

**使用方法：**

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
./scripts/publish-release.sh patch

# 小版本 (1.0.0 -> 1.1.0)
./scripts/publish-release.sh minor

# 大版本 (1.0.0 -> 2.0.0)
./scripts/publish-release.sh major
```

**脚本会自动执行：**
1. ✅ 检查未提交的更改
2. 📦 更新 package.json 版本号
3. 🔨 构建应用 (macOS/Windows/Linux)
4. 🔧 配置专用 Git 账户 (仅本地仓库)
5. 💾 提交代码和创建标签
6. 📤 推送到 GitHub
7. 🐙 创建 GitHub Release (需要 GitHub CLI)

### 手动发布流程

1. **构建应用**
   ```bash
   npm run build
   npm run electron:build:mac
   npm run electron:build:win
   npm run electron:build:linux
   ```

2. **更新版本号**
   ```bash
   npm version patch  # 或 minor, major
   ```

3. **创建 GitHub Release**
   - 进入仓库 Releases 页面
   - 点击 "Create a new release"
   - Tag: `v1.0.1` (与package.json版本一致)
   - Title: `VeilBrowser v1.0.1`
   - Description: 填写更新内容
   - **上传文件**:
     - `release/VeilBrowser-1.0.1.dmg`
     - `release/VeilBrowser Setup 1.0.1.exe`
     - `release/VeilBrowser-1.0.1.AppImage`
     - `release/VeilBrowser-1.0.1.deb`
     - `release/VeilBrowser-1.0.1.rpm`

4. **发布 Release**

## 🔍 验证配置

### 测试更新检查

```bash
# 启动应用，查看控制台输出
npm run electron:dev

# 应该看到类似日志：
# [UpdateService] 初始化完成
# [UpdateService] 开始检查更新
```

### 手动触发更新检查

```typescript
// 在开发者工具控制台中执行
window.electron?.update?.checkForUpdates();
```

## 🐛 故障排除

### 常见问题

1. **"Repository not found"**
   - 检查 owner 和 repo 名称是否正确
   - 确认仓库存在且公开

2. **"Bad credentials"**
   - 检查 GITHUB_TOKEN 是否正确（私有仓库）

3. **更新文件下载失败**
   - 检查 Release 中的文件路径
   - 确认 latest.yml 文件存在

4. **代码签名问题**
   - macOS 需要开发者证书
   - Windows 需要代码签名证书

### 调试技巧

```bash
# 查看 electron-builder 日志
DEBUG=electron-builder:* npm run electron:build

# 查看 electron-updater 日志
# 在应用中开启开发者工具，查看控制台
```

## 📚 相关文档

- [electron-builder 发布配置](https://www.electron.build/configuration/publish)
- [electron-updater 文档](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)

## 🎯 完成清单

- [ ] 注册专用 GitHub 账号
- [ ] 创建 veilbrowser 仓库
- [ ] 更新 electron-builder.config.ts
- [ ] 测试构建和发布流程
- [ ] 验证自动更新功能

---

**最后更新**: 2025-01-01
**状态**: 待配置</contents>
</xai:function_call"> 

<xai:function_call name="search_replace">
<parameter name="file_path">electron-builder.config.ts
