# VeilBrowser 许可证测试指南

## 🚀 快速开始

> ⚠️ **重要**: 从现在开始，许可证功能**不再支持mock模式**。桌面端激活许可证时，必须确保服务端正在运行。这确保了开发测试的真实性和可靠性。

## 🔧 环境要求

### 全栈启动（推荐）
```bash
# 一键启动服务端和客户端
./scripts/start-dev-full.sh
```

### 分离启动
```bash
# 1. 启动服务端
cd server
npm install
npm run server:dev

# 2. 验证服务端（新终端）
curl http://localhost:3001/api/health

# 3. 运行API集成测试
./scripts/test-license-integration.sh

# 4. 启动客户端（原终端）
./scripts/start-dev-with-license.sh
```

## 🧪 测试许可证

### 可用测试许可证

| 许可证密钥 | 计划类型 | Profile数量 | 高级功能 | 到期时间 |
|-------------|----------|-------------|----------|----------|
| `VB-FREE-TEST-001` | 免费版 | 5个 | ❌ | 永不过期 |
| `VB-PERSONAL-TEST-001` | 个人版 | 10个 | ✅ | 1年后过期 |
| `VB-PRO-TEST-001` | 专业版 | 无限 | ✅ | 永不过期 |

### 测试步骤

1. **打开应用** → **设置** → **授权管理**
2. **点击"激活许可证"**
3. **选择测试许可证**（快捷按钮）或手动输入
4. **点击"激活许可证"**
5. **验证激活成功**（显示成功动画）
6. **重启应用**验证持久化

## 🔧 许可证格式验证

### 支持的格式

1. **测试许可证格式**: `VB-XXXX-TEST-XXX`
   - 示例: `VB-FREE-TEST-001`
   - 前端会保持原始格式，不进行自动格式化

2. **正式许可证格式**: `XXXX-XXXX-XXXX-XXXX`
   - 示例: `ABCD-1234-EFGH-5678`
   - 前端会自动格式化输入

### 验证规则

- ✅ **格式正确**: 按钮启用，可以点击激活
- ❌ **格式错误**: 按钮禁用，显示提示信息
- ✅ **测试许可证**: 一键选择按钮快速填入

## 🔍 故障排除

### 常见问题

#### 1. 服务端连接失败（最常见）
```bash
# 错误现象：激活时显示"许可证服务端不可用"
# 解决方案：

# 1. 检查服务端是否运行
curl http://localhost:3001/api/health

# 2. 如果未运行，启动服务端
cd server && npm run server:dev

# 3. 或使用全栈启动脚本
./scripts/start-dev-full.sh
```

#### 2. 如何清理测试许可证
```bash
# 方式1：开发模式前端重置
./scripts/start-dev-with-license.sh
# 然后在授权管理页面点击"重置许可证（开发模式）"

# 方式2：直接清理文件
rm ~/Library/Application\ Support/VeilBrowser/license.dat
rm ~/Library/Application\ Support/VeilBrowser/privacy.json

# 方式3：重新初始化数据库
cd server && rm data/veilbrowser.db* && npm run server:dev
```

#### 2. 服务端连接失败
```bash
# 检查服务端状态
curl http://localhost:3001/api/health

# 检查端口占用
lsof -i :3001
```

#### 2. 激活失败
```bash
# 检查API请求日志
tail -f server/logs/api-requests.log

# 检查错误日志
tail -f server/logs/api-errors.log
```

#### 3. 客户端无法连接
```bash
# 验证环境变量
echo $LICENSE_API_URL
echo $LICENSE_API_KEY

# 使用一键启动脚本
./scripts/start-dev-with-license.sh
```

### 日志文件位置

- **服务端日志**: `server/logs/`
- **客户端日志**: `~/Library/Application Support/VeilBrowser/logs/`
- **数据库**: `server/data/veilbrowser.db`

## 📊 许可证功能验证清单

### ✅ 核心功能
- [ ] 许可证激活（测试许可证）
- [ ] 许可证验证（启动时）
- [ ] 功能权限检查（Profile数量限制）
- [ ] 本地存储加密
- [ ] 硬件指纹绑定

### ✅ 用户体验
- [ ] 格式验证和提示
- [ ] 激活成功动画
- [ ] 错误信息显示
- [ ] 测试许可证快捷选择
- [ ] 许可证重置功能（开发模式）

### ✅ 数据持久化
- [ ] 激活状态重启后保持
- [ ] 隐私设置保存
- [ ] 使用统计记录

### ✅ 许可证管理
- [ ] 许可证重置功能
- [ ] 重置确认对话框
- [ ] 重置后状态恢复

## 🎯 下一步

完成基础测试后，可以进行以下扩展测试：

1. **并发测试**: 多个设备同时激活
2. **边界测试**: 过期许可证、硬件变更等
3. **性能测试**: 大量激活请求处理能力
4. **安全测试**: 篡改检测、异常输入处理

---

**最后更新**: 2026-01-02
