# VeilBrowser 构建指南

**完整构建说明文档** - 从环境搭建到发布的全流程指南

## 📊 构建状态报告

> 📋 **[查看当前构建状态](./BUILD_STATUS.md)** - 最新构建状态、已知问题和解决进度

**快速概览**:
- ✅ macOS 构建: 完全可用
- ❌ Windows 构建: 等待 Wine 配置
- ✅ 防盗版保护: 6层完整保护 (219个文件)
- ⚠️ 构建大小: 250MB (可优化)

### 🚀 快速跳转
- [立即开始构建](#快速开始)
- [配置构建环境](#构建环境要求)
- [解决构建问题](#故障排除)
- [查看构建状态](./BUILD_STATUS.md)

## 📋 目录

> 💡 **导航提示**: 点击下面的链接可直接跳转到对应章节

### 📊 构建概览
- [构建状态报告](#构建状态报告)

### 🛠️ 环境与准备
- [构建环境要求](#构建环境要求)
  - [系统要求](#系统要求)
  - [软件依赖](#软件依赖)
  - [磁盘空间要求](#磁盘空间要求)

### 🚀 构建流程
- [快速开始](#快速开始)
  - [1. 环境准备](#1-环境准备)
  - [2. 开发构建](#2-开发构建)
  - [3. 生产构建](#3-生产构建)
  - [4. 验证构建](#4-验证构建)
- [构建类型详解](#构建类型详解)
  - [开发构建 vs 生产构建](#开发构建-vs-生产构建)
  - [构建模式对比](#构建模式对比)

### 🌐 跨平台构建
- [跨平台构建](#跨平台构建)
  - [构建命令](#构建命令)
  - [平台特定配置](#平台特定配置)
    - [macOS 构建](#macos-构建)
    - [Windows 构建](#windows-构建)
    - [Linux 构建](#linux-构建)

### 🛡️ 安全构建
- [防盗版保护构建](#防盗版保护构建)
  - [保护层级](#保护层级)
  - [构建时验证](#构建时验证)
  - [生产构建优化](#生产构建优化)

### 📦 产物与分发
- [构建产物说明](#构建产物说明)
  - [文件结构](#文件结构)
  - [产物说明](#产物说明)
    - [macOS (.dmg / .zip)](#macos-dmg--zip)
    - [Windows (.exe)](#windows-exe)
    - [Linux (.AppImage / .deb / .rpm)](#linux-appimage--deb--rpm)
  - [验证构建产物](#验证构建产物)

### ⚙️ 高级配置
- [高级配置](#高级配置)
  - [环境变量配置](#环境变量配置)
  - [自定义构建配置](#自定义构建配置)
  - [CI/CD 配置](#cicd-配置)
    - [GitHub Actions 示例](#github-actions-示例)

### 🔧 问题解决
- [故障排除](#故障排除)
  - [常见构建问题](#常见构建问题)
    - [问题：原生模块编译失败](#问题原生模块编译失败)
    - [问题：Wine 配置错误 (macOS)](#问题wine-配置错误-macos)
    - [问题：代码签名失败](#问题代码签名失败)
    - [问题：构建产物过大](#问题构建产物过大)
    - [问题：跨平台构建失败](#问题跨平台构建失败)
  - [调试技巧](#调试技巧)
- [性能优化](#性能优化)
  - [构建速度优化](#构建速度优化)
  - [产物大小优化](#产物大小优化)
  - [内存优化](#内存优化)

### 📊 监控与质量
- [构建监控](#构建监控)
  - [构建指标](#构建指标)
  - [质量检查](#质量检查)

### 📚 参考资料
- [相关链接](#相关链接)

## 🛠️ 构建环境要求

### 系统要求

| 平台 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **macOS** | 12.0+ (Intel/Apple Silicon) | 13.0+ (M1/M2 芯片) |
| **Windows** | Windows 10 1903+ | Windows 11 (64位) |
| **Linux** | Ubuntu 18.04+ | Ubuntu 20.04+ (64位) |

### 软件依赖

#### 必需依赖
```bash
# Node.js (必需)
node --version  # 20.0.0 - 22.x.x
npm --version   # 8.0.0+

# Python (用于原生模块编译)
python --version  # 3.8+

# Git
git --version
```

#### 平台特定依赖

**macOS:**
```bash
# Xcode Command Line Tools
xcode-select --install

# Wine (跨平台 Windows 构建)
brew install --cask wine-stable

# 代码签名工具 (可选，生产环境需要)
# Apple Developer Program 证书
```

**Windows:**
```bash
# Visual Studio Build Tools (用于原生模块)
# 下载: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# 安装: Desktop development with C++

# Windows SDK (可选)
```

**Linux:**
```bash
# 构建工具
sudo apt-get install build-essential
sudo apt-get install libnss3-dev
sudo apt-get install libatk-bridge2.0-dev

# RPM 构建 (如需要)
sudo apt-get install rpm

# Snapcraft (如需要)
sudo apt-get install snapcraft
```

### 磁盘空间要求

| 构建类型 | 源码大小 | 构建产物 | 总计 |
|----------|----------|----------|------|
| **开发构建** | ~500MB | ~200MB | ~700MB |
| **生产构建** | ~500MB | ~300MB | ~800MB |
| **全平台构建** | ~500MB | ~1GB | ~1.5GB |

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd VeilBrowser

# 安装依赖
npm install

# 重建原生模块 (如需要)
npm run rebuild-native
```

### 2. 开发构建

```bash
# 构建前端 (Vite)
npm run build

# 构建 Electron 应用 (当前平台)
npm run electron:build

# 开发模式构建
npm run electron:prod
```

### 3. 生产构建

```bash
# 设置生产环境变量
export BUILD_LICENSE_API_KEY="your-production-license-key"
export BUILD_CRYPTO_SALT="your-production-salt"
export BUILD_SERVER_API_KEY="your-server-api-key"

# 执行生产构建
npm run build:production
```

### 4. 验证构建

```bash
# 快速构建验证 (推荐)
./scripts/verify-build.sh

# 或手动检查构建产物
ls -la release/

# 验证应用启动
./release/mac/VeilBrowser.app/Contents/MacOS/VeilBrowser --version
```

## 📦 构建类型详解

### 开发构建 vs 生产构建

| 特性 | 开发构建 | 生产构建 |
|------|----------|----------|
| **优化级别** | 最低 | 最高 |
| **源码映射** | 包含 | 移除 |
| **调试信息** | 完整 | 最小化 |
| **防盗版保护** | 禁用 | 启用 |
| **代码混淆** | 轻度 | 极致 |
| **构建时间** | 快 (~2分钟) | 慢 (~5-10分钟) |

### 构建模式对比

```bash
# 开发模式 (无优化)
NODE_ENV=development npm run electron:build

# 生产模式 (全优化)
NODE_ENV=production npm run electron:build

# 演示模式 (平衡性能)
NODE_ENV=demo npm run electron:build
```

## 🌐 跨平台构建

VeilBrowser 支持在单台机器上构建多平台版本。

### 构建命令

```bash
# 构建所有平台 (需要相应工具)
npm run electron:build

# 指定平台构建
npm run electron:build -- --mac     # 仅 macOS
npm run electron:build -- --win     # 仅 Windows
npm run electron:build -- --linux   # 仅 Linux

# 指定架构
npm run electron:build -- --win --x64      # Windows 64位
npm run electron:build -- --win --ia32     # Windows 32位
npm run electron:build -- --mac --x64      # macOS Intel
npm run electron:build -- --mac --arm64    # macOS Apple Silicon
```

### 平台特定配置

#### macOS 构建
```bash
# 代码签名 (生产环境)
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Notarization (公证)
export APPLE_ID="your-apple-id"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"

npm run electron:build -- --mac
```

#### Windows 构建
```bash
# 证书签名 (生产环境)
export WIN_CSC_LINK="path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="certificate-password"

npm run electron:build -- --win
```

#### Linux 构建
```bash
# Snapcraft 构建 (可选)
npm run electron:build -- --linux snap

# AppImage 构建
npm run electron:build -- --linux AppImage
```

## 🛡️ 防盗版保护构建

VeilBrowser 实现了 6 层防盗版保护体系，构建时自动启用。

### 保护层级

```
Phase 1: 核心算法保护 (extreme 混淆 + Bytenode)
Phase 2: 调度控制保护 (high 混淆 + Bytenode)
Phase 3: 业务逻辑保护 (medium 混淆 + Bytenode)
Phase 4: 执行框架保护 (low 混淆)
Phase 5: 运行时校验 (完整性检查)
Phase 6: 授权管理保护 (extreme 混淆 + Bytenode)
```

### 构建时验证

```bash
# 检查保护文件生成
ls -la dist-electron/protected/
ls -la dist-electron/hashes/

# 验证哈希文件
cat dist-electron/hashes/core.json | jq '.files | length'
# 应显示受保护文件数量

# 检查混淆效果
grep -r "🔐 Protected by VeilBrowser" dist-electron/protected/
```

### 生产构建优化

```bash
# 启用完整保护
export PROTECTION_LEVEL=extreme
export ENABLE_ANTIPIRACY=true

# 构建生产版本
npm run build:production
```

## 📦 构建产物说明

### 文件结构

```
release/
├── mac/
│   ├── VeilBrowser-0.8.0.dmg          # macOS DMG 安装包
│   ├── VeilBrowser-0.8.0-mac.zip      # macOS ZIP 包
│   ├── VeilBrowser-0.8.0-arm64.dmg    # Apple Silicon DMG
│   └── VeilBrowser-0.8.0-arm64-mac.zip # Apple Silicon ZIP
├── mac-arm64/
│   └── [Apple Silicon 专用构建]
├── win-unpacked/                      # Windows 未打包版本
├── linux-unpacked/                    # Linux 未打包版本
├── VeilBrowser-0.8.0.exe             # Windows NSIS 安装程序
├── VeilBrowser-0.8.0-x64.exe         # Windows 便携版
├── VeilBrowser-0.8.0.AppImage        # Linux AppImage
├── VeilBrowser-0.8.8.0.deb           # Linux Debian 包
├── VeilBrowser-0.8.0.rpm             # Linux RPM 包
├── *.blockmap                        # 自动更新块文件
└── latest.yml                        # 版本信息 (自动更新用)
```

### 产物说明

#### macOS (.dmg / .zip)
- **DMG**: 标准 macOS 安装包，包含拖拽安装
- **ZIP**: 压缩包版本，无需安装
- **大小**: ~250-350MB
- **架构**: x64 (Intel) / arm64 (Apple Silicon)

#### Windows (.exe)
- **NSIS**: 完整的 Windows 安装程序
- **便携版**: 无需安装的绿色版本
- **大小**: ~200-300MB
- **架构**: x64 / ia32

#### Linux (.AppImage / .deb / .rpm)
- **AppImage**: 通用 Linux 包，可在任何发行版运行
- **DEB**: Debian/Ubuntu 专用包
- **RPM**: RedHat/CentOS/Fedora 专用包
- **大小**: ~200-300MB

### 验证构建产物

```bash
# 检查文件完整性
find release/ -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" | xargs ls -lh

# 验证应用信息
# macOS
codesign -dv release/mac/VeilBrowser.app

# Windows
# 使用 sigcheck.exe 或类似工具验证签名

# Linux
file release/VeilBrowser-0.8.0.AppImage
```

## ⚙️ 高级配置

### 环境变量配置

```bash
# 构建配置
NODE_ENV=production                    # 生产模式
DEBUG=electron-builder:*              # 调试日志
ELECTRON_BUILDER_CACHE=/tmp/cache     # 构建缓存

# 防盗版保护
PROTECTION_LEVEL=extreme              # 保护级别
ENABLE_ANTIPIRACY=true               # 启用保护
DISABLE_OBFUSCATION=false            # 启用混淆

# 代码签名
CSC_LINK=path/to/cert.p12            # macOS 证书
CSC_KEY_PASSWORD=password            # 证书密码
WIN_CSC_LINK=path/to/cert.pfx        # Windows 证书

# 发布配置
GH_TOKEN=github_token                # GitHub Token
GITHUB_REPO=owner/repo               # 仓库信息
```

### 自定义构建配置

创建 `electron-builder.config.ts` 自定义配置：

```typescript
import { Configuration } from 'electron-builder';

const config: Configuration = {
  // 自定义配置
  appId: 'com.veilbrowser.app',
  productName: 'VeilBrowser',

  // 自定义构建选项
  buildVersion: process.env.BUILD_VERSION,
  beforeBuild: async (context) => {
    // 预构建脚本
    console.log('Starting custom build process...');
  },

  afterAllArtifactBuild: async (context) => {
    // 后构建处理
    console.log('Build completed, running post-build tasks...');
  },

  // 平台特定配置
  mac: {
    hardenedRuntime: true,
    gatekeeperAssess: false,
    // 自定义 entitlements
    entitlements: 'custom-entitlements.plist'
  },

  win: {
    // 自定义安装程序
    nsis: {
      // NSIS 自定义配置
    }
  }
};

export default config;
```

### CI/CD 配置

#### GitHub Actions 示例

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run electron:build
        env:
          BUILD_LICENSE_API_KEY: ${{ secrets.BUILD_LICENSE_API_KEY }}
          BUILD_CRYPTO_SALT: ${{ secrets.BUILD_CRYPTO_SALT }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: VeilBrowser-${{ matrix.os }}
          path: release/
```

## 🔧 故障排除

### 常见构建问题

#### 问题：原生模块编译失败

**症状**: `node-gyp` 错误，找不到 Python 或 Visual Studio

**解决方案**:
```bash
# macOS
xcode-select --install

# Windows
# 安装 Visual Studio Build Tools
# 或使用 windows-build-tools
npm install --global windows-build-tools

# Linux
sudo apt-get install build-essential python3-dev
```

#### 问题：Wine 配置错误 (macOS)

**症状**: `无法打开"Wine Stable"，因为无法验证开发者` 或 `wine: command not found`

**解决方案**:
```bash
# 方案 1: 重新安装 wine-cask (推荐)
brew uninstall wine
brew install --cask wine-stable

# 方案 2: 系统设置允许 (临时方案)
# 系统偏好设置 → 安全性与隐私 → 通用
# 找到 "Wine Stable" 被阻止运行 → 点击 "仍要打开"

# 方案 3: 命令行允许运行
sudo spctl --add /Applications/Wine\ Stable.app

# 方案 4: 使用 Wineskin 替代
brew install --cask wineskin

# 验证安装
wine --version
wine cmd /c echo "Wine is working!"
```

#### 问题：代码签名失败

**症状**: 构建时签名错误

**解决方案**:
```bash
# 检查证书
security find-identity -v -p codesigning

# 验证环境变量
echo $CSC_LINK
echo $CSC_KEY_PASSWORD

# 开发环境跳过签名
export CSC_IDENTITY_AUTO_DISCOVERY=false
```

#### 问题：构建产物过大

**症状**: 安装包超过预期大小

**诊断**:
```bash
# 检查各部分大小
du -sh dist/ dist-electron/ release/

# 分析包内容
npx electron-builder --analyze
```

**优化**:
```typescript
// electron-builder.config.ts
compression: 'maximum',  // 最高压缩
removePackageScripts: true,  // 移除 npm scripts
```

#### 问题：跨平台构建失败

**症状**: 在 macOS 上构建 Windows 版本失败

**解决方案**:
```bash
# 确保 Wine 正常
wine --version
wine cmd /c ver

# 检查 electron-builder 版本
npx electron-builder --version

# 清理缓存重试
npx electron-builder cache clean
npm run electron:build -- --win
```

### 调试技巧

```bash
# 详细构建日志
DEBUG=electron-builder:* npm run electron:build

# 保存构建日志
npm run electron:build 2>&1 | tee build.log

# 检查构建缓存
ls -la ~/Library/Caches/electron-builder/

# 清理构建缓存
npx electron-builder cache clean
rm -rf dist/ dist-electron/ release/
```

## ⚡ 性能优化

### 构建速度优化

```bash
# 并行构建 (需要多核 CPU)
export JOBS=max

# 使用构建缓存
npm run electron:build -- --cache

# 增量构建
# 只重新构建变更的部分
```

### 产物大小优化

```typescript
// electron-builder.config.ts
{
  compression: 'maximum',
  removePackageScripts: true,

  files: [
    // 只包含必要的文件
    'dist/**/*',
    'dist-electron/**/*',
    '!**/*.map',
    '!**/*.md',
    '!src/**/*',
    '!node_modules/**/*'
  ],

  extraResources: [
    // 最小化额外资源
  ]
}
```

### 内存优化

```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 构建大型应用时
npm run electron:build -- --memory=max
```

## 📊 构建监控

### 构建指标

```bash
# 构建时间统计
time npm run electron:build

# 产物大小分析
find release/ -type f -exec ls -lh {} \; | awk '{print $5, $9}' | sort -hr

# 依赖分析
npx electron-builder --analyze
```

### 质量检查

```bash
# 检查构建产物完整性
find release/ -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" | xargs -I {} sh -c 'echo "Checking {}"; file "{}"'

# 验证应用启动
# macOS
./release/mac/VeilBrowser.app/Contents/MacOS/VeilBrowser --version

# Windows
./release/win-unpacked/VeilBrowser.exe --version

# Linux
./release/linux-unpacked/veilbrowser --version
```

## 📚 相关链接

- [项目架构](../ARCHITECTURE.md)
- [开发环境设置](../DEVELOPMENT.md)
- [部署发布指南](../deployment/README.md)
- [防盗版保护](../security/anti-piracy.md)

---

## 📖 文档导航

- [⬆️ 回到顶部](#veilbrowser-构建指南)
- [🏠 项目文档中心](../README.md)
- [🚀 部署发布指南](../deployment/README.md)
- [🔧 开发环境设置](../development/README.md)

**构建完成？** 🎉 现在你可以分发你的 VeilBrowser 应用了！

有任何构建问题，参考 [故障排除](#故障排除) 部分或在 [GitHub Issues](https://github.com/veilbrowser/veilbrowser/issues) 中提问。