# VeilBrowser 许可证服务端设置指南

## 📋 概述

VeilBrowser 的许可证管理系统现已支持完整的客户端-服务端架构。客户端负责本地验证和服务端负责许可证激活，实现了隐私友好和安全的许可证管理方案。

## 🏗️ 系统架构

### 服务端组件
- **数据库**: SQLite (`./data/veilbrowser.db`)
- **API服务**: Express.js + TypeScript
- **日志系统**: Winston (文件轮转)
- **认证**: API Key

### 客户端集成
- **硬件指纹**: 自动收集并发送
- **本地存储**: 激活后完全离线
- **开发降级**: 服务端不可用时使用模拟数据

## 🚀 快速开始

### 1. 验证服务端独立性

```bash
# 验证服务端配置是否正确 (重要!)
node scripts/verify-server-setup.js
```

### 2. 安装服务端依赖

```bash
# 进入服务端目录
cd server

# 安装依赖 (现在是独立的，不会触发electron-rebuild)
npm install
```

### 3. 启动服务端

```bash
# 在server目录中启动开发服务器 (带热重载)
npm run dev

# 或者启动生产服务器
npm start
```

服务端将在 `http://localhost:3001` 启动。

### 4. 验证配置修复

```bash
# 测试服务端配置是否正确
npm run test:server-config
```

### 5. 返回项目根目录运行集成测试

```bash
# 返回项目根目录
cd ..

# 运行集成测试 (会自动启动/停止服务端)
npm run test:integration
```

### 5. 验证服务端

```bash
# 健康检查
curl http://localhost:3001/api/health

# 查看API文档
cat server/README.md
```

### 3. 测试集成

```bash
# 运行集成测试
npm run test:integration
```

## 🔧 配置

### 环境变量

```bash
# 服务端配置
PORT=3001                    # 服务端口
HOST=0.0.0.0                # 绑定地址
NODE_ENV=development        # 运行环境
API_KEY=your-custom-key     # API密钥

# 客户端配置 (在Electron中设置)
LICENSE_API_URL=http://your-server:3001/api/license/activate
LICENSE_API_KEY=your-api-key
```

### 测试许可证

开发环境包含以下测试许可证：

| 许可证密钥 | 计划类型 | Profile数量 | 功能 |
|------------|----------|------------|------|
| `VB-FREE-TEST-001` | 免费版 | 5 | 基础功能 |
| `VB-PERSONAL-TEST-001` | 个人版 | 10 | 标准功能 |
| `VB-PRO-TEST-001` | 专业版 | 100 | 完整功能 |

## 📊 数据库结构

### 核心表

```sql
-- 许可证主表
licenses (
  id, license_key, plan, profile_count,
  features, expires_at, created_at, updated_at,
  is_active, deactivated_at, deactivation_reason
)

-- 激活记录 (存储硬件信息)
license_activations (
  id, license_id, hardware_fingerprint,
  mac_address, cpu_id, motherboard_id,
  activated_at, activated_ip, user_agent,
  platform, arch, hostname, is_active
)

-- 验证日志
license_validations (
  id, license_id, activation_id,
  validated_at, client_ip, user_agent,
  is_valid, error_code, error_message, response_time_ms
)

-- 使用统计 (可选)
usage_statistics (
  id, license_id, reported_at, stats, client_version, platform, arch
)

-- 心跳记录 (可选)
heartbeats (
  id, license_id, heartbeat_at, client_ip, client_version, platform, arch
)
```

### API日志

API请求日志存储在文件中，不占用数据库空间：
- `logs/api-requests.log` - 所有API请求
- `logs/api-errors.log` - 错误请求
- `logs/app.log` - 应用日志

## 🔌 API 接口

### 激活许可证
```bash
POST /api/license/activate
Content-Type: application/json
X-API-Key: veilbrowser-api-key-2025

{
  "licenseKey": "VB-PERSONAL-TEST-001",
  "hardwareFingerprint": {
    "macAddress": "00:11:22:33:44:55",
    "cpuId": "Intel CPU",
    "motherboardId": "Motherboard ID",
    "combinedHash": "sha256-hash"
  },
  "clientInfo": {
    "platform": "darwin",
    "arch": "x64",
    "hostname": "MacBook-Pro.local"
  }
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "licenseId": "license_123",
    "plan": "personal",
    "profileCount": 10,
    "expiresAt": null,
    "features": { /* ... */ },
    "activatedAt": "2025-01-XX...",
    "activationId": "activation_456"
  }
}
```

### 可选接口

```bash
# 许可证验证 (预留)
POST /api/license/validate

# 使用统计上报 (可选)
POST /api/license/usage

# 心跳记录 (可选)
POST /api/license/heartbeat

# 许可证统计 (管理)
GET /api/license/stats/:licenseId
```

## 🔒 安全特性

### 服务端安全
- ✅ API Key 认证
- ✅ 请求频率限制
- ✅ 请求日志审计
- ✅ 硬件指纹验证
- ✅ 激活次数限制

### 客户端安全
- ✅ 硬件绑定激活
- ✅ 本地加密存储
- ✅ 离线优先验证
- ✅ 开发环境降级

## 📈 监控和分析

### 日志分析
```bash
# 查看API请求日志
tail -f logs/api-requests.log

# 搜索特定许可证的请求
grep "license_123" logs/api-requests.log
```

### 数据库查询
```sql
-- 查看激活统计
SELECT
  l.plan,
  COUNT(la.id) as activation_count,
  COUNT(CASE WHEN la.is_active = 1 THEN 1 END) as active_count
FROM licenses l
LEFT JOIN license_activations la ON l.id = la.license_id
GROUP BY l.plan;

-- 查看平台分布
SELECT platform, COUNT(*) as count
FROM license_activations
WHERE is_active = 1
GROUP BY platform;
```

## 🚀 部署建议

### 开发环境
- 使用 `npm run server:dev`
- 测试许可证数据自动插入
- 日志输出到控制台

### 生产环境
- 使用 `npm run server`
- 设置环境变量
- 配置日志轮转
- 使用反向代理 (Nginx)

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server/ ./server/
EXPOSE 3001
CMD ["npm", "run", "server"]
```

## 🔧 故障排除

### 服务端启动失败
```bash
# 检查端口占用
lsof -i :3001

# 检查数据库文件权限
ls -la data/veilbrowser.db

# 查看详细日志
DEBUG=* npm run server:dev
```

### 客户端激活失败
```bash
# 检查服务端连通性
curl -H "X-API-Key: veilbrowser-api-key-2025" \
     http://localhost:3001/api/health

# 检查环境变量
echo $LICENSE_API_URL
echo $LICENSE_API_KEY
```

### 数据库问题
```bash
# 重置数据库
npm run clear-db
# 重启服务端会自动重建表结构
```

## 📚 相关文档

- `server/README.md` - 服务端详细文档
- `docs/licensing-system-design.md` - 系统设计文档
- `src/main/services/licensing/` - 客户端实现

---

## 🎯 下一步计划

1. **测试完整流程**: 客户端 ↔ 服务端集成测试
2. **自定义许可证**: 添加许可证生成和管理界面
3. **用户界面**: 完善许可证管理UI
4. **生产部署**: 配置生产环境和监控
5. **扩展功能**: 多租户、团队管理等

许可证服务端现已准备就绪，可以开始MVP发布前的集成测试了！🎉
