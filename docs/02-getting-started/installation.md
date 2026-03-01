# VeilBrowser 开发环境设置指南

## 🔧 环境变量配置

### 必需的环境变量

开发环境需要配置以下环境变量才能正常运行：

#### `LICENSE_API_KEY`
- **用途**: 许可证API访问密钥
- **必需**: 否（有开发默认值）
- **默认值**: `dev-license-api-key-2025`
- **建议**: 建议手动设置以匹配你的开发许可证服务器

#### `API_KEY`
- **用途**: 服务端API访问密钥
- **必需**: 否（有开发默认值）
- **默认值**: `dev-server-api-key-2025`
- **建议**: 建议手动设置以匹配你的开发服务端配置

#### `CRYPTO_SALT`
- **用途**: 加密盐值
- **必需**: 否（有开发默认值）
- **默认值**: `dev-crypto-salt-2025`
- **建议**: 建议手动设置以确保加密安全性

### 环境文件配置

#### `.env.development` 文件

创建 `.env.development` 文件在项目根目录：

```bash
# VeilBrowser 开发环境配置
# 此文件仅用于开发环境，不应包含敏感信息

# ========== 环境标识 ==========
NODE_ENV=development
VITE_NODE_ENV=development

# ========== 开发工具 ==========
VITE_DEV_TOOLS=true

# ========== API 配置 ==========
# 许可证API配置
VITE_LICENSE_API_URL=http://127.0.0.1:3001
LICENSE_API_KEY=dev-license-api-key-2025

# 服务端API配置
API_KEY=dev-server-api-key-2025

# ========== 加密配置 ==========
CRYPTO_SALT=dev-crypto-salt-2025

# ========== 日志配置 ==========
LOG_LEVEL=debug

# ========== 其他配置 ==========
# 禁用GPU加速（如果出现渲染问题）
DISABLE_GPU=false
```

### 许可证服务器设置

#### 本地开发许可证服务器

1. **启动许可证服务器**:
   ```bash
   cd services/license-server
   npm install
   npm run dev
   ```

2. **验证服务器运行**:
   ```bash
   curl http://127.0.0.1:3001/health
   ```

#### 许可证配置

- **开发环境**: 使用本地许可证服务器，无需额外配置
- **生产环境**: 许可证信息在构建时注入，无需用户配置

### 故障排除

#### 环境变量未生效

1. **检查文件位置**
   - `.env.development` 必须在项目根目录
   - 确保文件名正确（无额外扩展名）

2. **检查变量加载**
   ```bash
   # 验证环境变量
   npm run dev
   # 查看控制台输出，确认变量已加载
   ```

3. **检查缓存**
   ```bash
   # 清理缓存后重试
   npm run clean:all
   npm install
   npm run dev
   ```

#### 许可证连接问题

1. **检查许可证服务器**
   ```bash
   # 验证服务器状态
   curl http://127.0.0.1:3001/health
   ```

2. **检查网络配置**
   - 确保 `VITE_LICENSE_API_URL` 正确
   - 检查防火墙设置

3. **查看详细日志**
   ```bash
   # 启用详细日志
   LOG_LEVEL=debug npm run dev
   ```

## 🔄 开发环境更新日志

- **2025-01-06**: 初始版本，定义环境变量配置体系
- **2025-01-04**: 添加许可证服务器配置说明