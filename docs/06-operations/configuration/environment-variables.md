# VeilBrowser 环境变量配置指南

## 概述

VeilBrowser 实现了统一的配置管理系统，支持开发和生产环境的自动适配。生产环境使用构建时注入的配置，确保敏感信息对用户完全不可见。本文档描述了所有支持的环境变量及其用途。

## 配置管理系统

### 设计原则

- **统一接口**: 开发和生产使用相同代码
- **环境透明**: 自动检测运行环境，无需手动配置
- **安全分层**: 配置优先级：环境变量 > 构建时注入 > 默认值
- **用户友好**: 生产环境开箱即用，无需用户配置

### 配置优先级

| 环境 | LICENSE_API_KEY | CRYPTO_SALT | API_KEY | 配置方式 |
|------|----------------|-------------|---------|----------|
| 开发 | .env文件 | .env文件 | .env文件 | 手动配置 |
| 生产 | 构建时注入 | 构建时注入 | 构建时注入 | 自动注入 |

### 构建时注入机制

生产环境的敏感配置通过构建时的环境变量注入：

```bash
# 构建时设置
BUILD_LICENSE_API_KEY=your_key BUILD_CRYPTO_SALT=your_salt npm run build
```

### 运行时配置加载

1. **开发环境**: 从 `.env` 文件加载
2. **生产环境**: 从构建时注入的配置加载
3. **自动检测**: 无需手动指定环境类型

## 环境文件

### .env.development (开发环境)

```bash
# VeilBrowser 开发环境配置
# 此文件仅用于开发环境，不应包含敏感信息

# ========== 环境标识 ==========
NODE_ENV=development
VITE_NODE_ENV=development

# ========== 开发工具 ==========
VITE_DEV_TOOLS=true
VITE_ENABLE_LOGGER=true
VITE_ENABLE_DEBUG=true

# ========== 性能配置 ==========
DISABLE_GPU=false
VITE_ENABLE_HMR=true

# ========== 日志配置 ==========
LOG_LEVEL=debug
LOG_PRETTY_PRINT=true

# ========== 调试配置 ==========
DEBUG=veilbrowser:*
VITE_DEBUG_BUILD=false

# ========== 许可证配置（开发环境）==========
# 注意：生产环境的许可证密钥不应在此文件中
VITE_LICENSE_API_URL=http://127.0.0.1:3001
VITE_LICENSE_CHECK_INTERVAL=30000
```

### .env.production (生产环境)

```bash
# VeilBrowser 生产环境配置
# 此文件包含生产环境所需的敏感配置

# ========== 环境标识 ==========
NODE_ENV=production
VITE_NODE_ENV=production

# ========== 生产优化 ==========
VITE_DEV_TOOLS=false
VITE_ENABLE_LOGGER=false
VITE_ENABLE_DEBUG=false

# ========== 性能配置 ==========
DISABLE_GPU=false
VITE_ENABLE_HMR=false

# ========== 日志配置 ==========
LOG_LEVEL=warn
LOG_PRETTY_PRINT=false

# ========== 许可证配置（生产环境）==========
# 注意：这些值应在构建时注入，不应明文存储
BUILD_LICENSE_API_KEY=your_production_license_key
BUILD_CRYPTO_SALT=your_production_crypto_salt
BUILD_SERVER_API_KEY=your_production_server_key

# ========== 许可证运行时配置 ===========
VITE_LICENSE_API_URL=https://license.veilbrowser.app
VITE_LICENSE_CHECK_INTERVAL=300000
```

## 环境变量说明

### 核心环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `development` | 运行环境：`development` 或 `production` |
| `VITE_NODE_ENV` | `development` | Vite 构建环境标识 |

### 开发工具配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_DEV_TOOLS` | `true` (dev), `false` (prod) | 启用开发者工具 |
| `VITE_ENABLE_LOGGER` | `true` (dev), `false` (prod) | 启用客户端日志 |
| `VITE_ENABLE_DEBUG` | `true` (dev), `false` (prod) | 启用调试功能 |
| `VITE_ENABLE_HMR` | `true` (dev), `false` (prod) | 启用热模块替换 |

### 性能配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DISABLE_GPU` | `false` | 禁用 GPU 加速（服务器环境） |

### 日志配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_LEVEL` | `debug` (dev), `warn` (prod) | 日志级别 |
| `LOG_PRETTY_PRINT` | `true` (dev), `false` (prod) | 美化打印日志 |
| `SAMPLE_RATE` | `0.1` (debug), `0.2` (info) | 日志采样率 |

### 许可证配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `BUILD_LICENSE_API_KEY` | - | 生产环境许可证API密钥 |
| `BUILD_CRYPTO_SALT` | - | 生产环境加密盐值 |
| `BUILD_SERVER_API_KEY` | - | 生产环境服务器API密钥 |
| `VITE_LICENSE_API_URL` | 本地/生产URL | 许可证服务器URL |
| `VITE_LICENSE_CHECK_INTERVAL` | `30000` (dev), `300000` (prod) | 许可证检查间隔(ms) |

### 调试配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DEBUG` | - | 调试命名空间（仅开发环境） |
| `CI` | `false` | CI环境标识 |
| `FORCE_DEVTOOLS` | `false` | 强制打开开发者工具 |

### 路径配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `5173` | Vite 开发服务器端口 |
| `PROFILE_PANEL_PORT` | 动态分配 | ProfilePanel 服务器端口 |
| `VEIL_USER_DATA_PATH` | `~/.veilbrowser` | 用户数据目录 |

## 使用方式

### 开发环境

```bash
# 使用默认配置
npm run dev

# 或明确指定环境文件
NODE_ENV=development npm run dev
```

### 生产环境

```bash
# 构建时注入敏感配置
BUILD_LICENSE_API_KEY=xxx BUILD_CRYPTO_SALT=yyy npm run build

# 或使用环境文件（不推荐存储敏感信息）
cp .env.production .env
npm run build
```

### CI/CD 环境

```bash
# 在 CI/CD 中设置环境变量
export NODE_ENV=production
export BUILD_LICENSE_API_KEY=${LICENSE_KEY}
export BUILD_CRYPTO_SALT=${CRYPTO_SALT}
export BUILD_SERVER_API_KEY=${SERVER_KEY}

npm run build
```

## 安全注意事项

### 🔐 敏感信息处理

1. **不要在版本控制中存储敏感信息**
   - `.env.production` 已加入 `.gitignore`
   - 敏感配置应通过 CI/CD 环境变量注入

2. **构建时注入原则**
   - 敏感密钥在构建时注入，不在运行时读取
   - 使用 `process.env.BUILD_*` 变量在构建时替换

3. **运行时配置**
   - 非敏感配置可在运行时通过环境变量调整
   - 敏感配置应在构建时静态替换

### 🛡️ 最佳实践

```bash
# ✅ 正确：构建时注入
BUILD_LICENSE_API_KEY=secret npm run build

# ❌ 错误：运行时环境变量
LICENSE_API_KEY=secret npm run electron:prod

# ✅ 正确：非敏感配置
LOG_LEVEL=debug npm run dev

# ❌ 错误：敏感信息明文存储
echo "LICENSE_API_KEY=secret" >> .env.production
```

## 故障排除

### 环境变量未生效

1. **检查变量名称**
   - 确保变量名正确，区分大小写
   - `VITE_*` 前缀的变量才能在前端代码中使用

2. **检查加载顺序**
   - `.env` 文件在项目根目录
   - 确保在应用启动前加载

3. **检查构建缓存**
   ```bash
   npm run clean:all
   npm run build
   ```

### 许可证相关问题

1. **开发环境许可证**
   - 使用本地许可证服务器
   - 设置 `VITE_LICENSE_API_URL=http://127.0.0.1:3001`

2. **生产环境许可证**
   - 确保 `BUILD_LICENSE_API_KEY` 在构建时设置
   - 检查许可证服务器可访问性

## 更新日志

- **2025-01-06**: 初始版本，定义完整的环境变量配置体系
