# 配置管理 (Configuration)

本目录包含 VeilBrowser 的配置管理相关文档。

## 📚 目录

- [**环境变量配置 (Environment Variables)**](environment-variables.md)
  详细列出了所有支持的环境变量、配置优先级、安全注意事项以及 `.env` 文件的使用方法。

## 配置体系概览

VeilBrowser 采用分层配置体系，确保在不同环境（开发、测试、生产）下都能灵活、安全地运行。

### 1. 静态配置 (Build-time)
部分敏感配置（如加密盐值、许可证密钥）在**构建时**注入，确保生产环境的安全性。
- 详情请参考 [环境变量配置](environment-variables.md#构建时注入机制)。

### 2. 运行时配置 (Runtime)
应用启动时读取的配置，主要通过环境变量控制。
- **开发环境**: 读取 `.env.development`
- **生产环境**: 读取注入的环境变量或系统环境变量

### 3. 用户配置 (User Preferences)
存储在用户数据目录下的配置，如：
- 用户偏好设置
- 窗口大小与位置
- 自定义快捷键

**路径**: 
- macOS: `~/Library/Application Support/VeilBrowser/config.json` (示例)
- Windows: `%APPDATA%/VeilBrowser/config.json` (示例)

> **注意**: 具体的应用内部配置文件结构文档待完善 (TODO)。
