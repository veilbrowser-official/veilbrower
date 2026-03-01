# 部署发布文档

本目录包含 VeilBrowser 的部署、发布和分发相关文档。

## 📋 文档列表

### 核心部署文档
- **[GitHub Release 配置](./github-setup.md)** - 完整的 GitHub Release 设置指南
- **[生产环境构建](../scripts/build-production.sh)** - 生产环境构建脚本和配置

### 发布脚本
- **[发布脚本](../scripts/publish-release.sh)** - 自动发布到 GitHub Release
- **[GitHub 配置脚本](../scripts/setup-github-release.sh)** - GitHub 仓库和 Release 配置

## 🚀 发布流程

### 1. 准备发布环境
```bash
# 配置 GitHub Release
./scripts/setup-github-release.sh <github-username> <repo-name>

# 设置生产环境变量
export BUILD_LICENSE_API_KEY="your-license-api-key"
export BUILD_CRYPTO_SALT="your-crypto-salt"
export BUILD_SERVER_API_KEY="your-server-api-key"
```

### 2. 执行发布
```bash
# 发布补丁版本 (1.0.0 -> 1.0.1)
./scripts/publish-release.sh patch

# 发布小版本 (1.0.0 -> 1.1.0)
./scripts/publish-release.sh minor

# 发布大版本 (1.0.0 -> 2.0.0)
./scripts/publish-release.sh major
```

### 3. 验证发布
- 检查 [GitHub Releases](https://github.com/your-org/your-repo/releases)
- 验证自动更新功能
- 测试各平台安装包

## 📦 构建产物

发布脚本会自动生成以下文件：

### macOS
- `VeilBrowser-0.8.0.dmg` - DMG 安装包
- `VeilBrowser-0.8.0-mac.zip` - ZIP 压缩包
- `VeilBrowser-0.8.0-arm64.dmg` - Apple Silicon DMG
- `VeilBrowser-0.8.0-arm64-mac.zip` - Apple Silicon ZIP

### Windows
- `VeilBrowser-0.8.0.exe` - NSIS 安装程序
- `VeilBrowser-0.8.0.exe.blockmap` - 自动更新块文件

### Linux
- `VeilBrowser-0.8.0.AppImage` - AppImage 格式
- `VeilBrowser-0.8.0.deb` - Debian 包
- `VeilBrowser-0.8.0.rpm` - RPM 包

## 🔐 安全配置

### 环境变量
```bash
# 许可证服务配置
BUILD_LICENSE_API_KEY=your-production-license-api-key

# 加密配置
BUILD_CRYPTO_SALT=your-production-crypto-salt

# 服务器配置
BUILD_SERVER_API_KEY=your-production-server-api-key
```

### 代码签名 (macOS)
```bash
# 设置代码签名证书
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"
```

## 📊 自动更新

VeilBrowser 使用 electron-updater 实现自动更新：

- **检查频率**: 应用启动时和每 4 小时
- **更新源**: GitHub Releases
- **增量更新**: 支持块级增量更新
- **强制更新**: 支持强制版本更新

## 🔍 故障排除

### 常见问题

**Q: GitHub Release 创建失败**
A: 检查 GITHUB_TOKEN 权限，确保有 repo 和 releases 权限

**Q: 代码签名失败 (macOS)**
A: 确保有有效的 Apple Developer 证书，或在开发环境禁用签名

**Q: 自动更新不工作**
A: 检查 GitHub Release 的文件名格式，确保与 electron-updater 期望一致

## 📚 相关链接

- [配置管理](../configuration/README.md)
- [系统架构](../ARCHITECTURE.md)
- [防盗版保护](../security/anti-piracy.md)
- [许可证系统](../licensing/README.md)
