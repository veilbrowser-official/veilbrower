# VeilBrowser 许可证服务器

支持高并发、自动备份和监控告警的企业级许可证服务。

## 🚀 快速部署

```bash
# 1. 克隆代码
git clone <repository>
cd services/license-server

# 2. 设置环境变量
cp env.production .env
# 编辑 .env 设置你的API密钥和域名

# 3. 生成SSL证书
./scripts/setup-ssl.sh

# 4. 部署
./scripts/deploy.sh
```

## 📁 目录结构

```
services/license-server/
├── data/                 # 数据库文件
├── logs/                 # 应用日志
├── ssl/                  # SSL证书
├── nginx/               # Nginx配置
│   ├── nginx.conf      # 主配置文件
│   └── logs/          # Nginx日志
├── scripts/            # 部署脚本
│   ├── deploy.sh      # 一键部署
│   ├── backup.sh      # 数据备份
│   └── setup-ssl.sh   # SSL证书设置
└── docker-compose.yml  # Docker编排
```

## 🔧 配置说明

- **端口**: 内部3002，对外80/443
- **数据库**: SQLite (license.db)
- **日志**: 自动轮转，保留30天
- **备份**: 每日自动备份，保留10个副本
- **监控**: 健康检查端点 `/health`

## 🔒 安全特性

- ✅ HTTPS强制跳转
- ✅ 速率限制
- ✅ 请求大小限制
- ✅ 安全头配置
- ✅ 容器隔离
- ✅ 非root用户运行

## 📊 监控命令

```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f license-server
docker-compose logs -f nginx

# 检查健康状态
curl -k https://localhost/health

# 备份数据
./scripts/backup.sh
```

## 🔄 API密钥管理

当前实现使用静态API密钥。未来JWT升级计划：

1. 添加 `/api/auth/token` 端点
2. API调用使用JWT令牌
3. 保留API密钥用于令牌获取
4. 支持密钥版本化管理

## 📋 环境变量

### 生产环境
```bash
LICENSE_API_KEY=your-production-key
NODE_ENV=production
DOMAIN=license.yourdomain.com
```

### 开发环境
```bash
LICENSE_API_KEY=dev-license-api-key-2025
NODE_ENV=development
PORT=3443
```

## 🐳 Docker命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重新构建并重启
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 清理
docker-compose down -v --remove-orphans
```

## 🔧 故障排除

### 服务无法启动
```bash
# 检查日志
docker-compose logs license-server

# 检查健康状态
curl -k https://localhost/health

# 检查SSL证书
ls -la ssl/
```

### SSL证书问题
```bash
# 重新生成开发证书
./scripts/generate-dev-ssl.sh

# 检查证书有效性
openssl x509 -in ssl/fullchain.pem -text -noout
```

### 数据库问题
```bash
# 检查数据库文件
ls -la data/license.db

# 故障排除前先备份
./scripts/backup.sh
```

## 🔄 备份策略

- **自动**: 每日凌晨2点通过cron
- **手动**: `./scripts/backup.sh`
- **保留**: 最新的10个备份
- **位置**: `backups/` 目录

## 📈 性能调优

### Nginx配置
- 速率限制: 每个IP 10 req/sec
- 缓冲区大小: 初始128KB，块256KB
- Keepalive: 后端32个连接

### Node.js配置
- 内存限制: 每个容器512MB
- CPU限制: 0.5核
- 健康检查: 30秒间隔

## 🔐 安全检查清单

- [ ] SSL证书已配置
- [ ] API密钥定期轮换
- [ ] 防火墙规则已设置
- [ ] 日志已监控
- [ ] 备份已测试
- [ ] 更新已应用

## 📞 支持

生产部署问题排查：
1. 检查日志: `docker-compose logs`
2. 验证配置文件
3. 测试健康检查端点
4. 检查SSL证书
5. 检查防火墙规则

---

**最后更新**: 2025-01-04
**版本**: 1.0.0