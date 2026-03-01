# 问题排查指南

本目录包含 VeilBrowser 的常见问题、故障排除和修复指南。

## 📋 文档列表

### 数据库问题
- **[SQLite 修复指南](./sqlite-fix.md)** - SQLite 数据库常见问题和修复方法

## 🔍 快速诊断

### 系统信息收集
```bash
# 收集系统信息
npm run diagnose:system

# 检查 Profile 状态
npm run diagnose:profiles

# 验证依赖完整性
npm run verify:deps
```

### 日志分析
```bash
# 查看错误日志
tail -f logs/app.log | grep ERROR

# 查看启动日志
grep "Application started" logs/app.log

# 查看安全事件
grep "SECURITY\|tamper\|integrity" logs/app.log
```

## 🚨 常见问题

### 启动问题

#### Q: 应用无法启动，显示白屏
**诊断步骤:**
```bash
# 检查主进程日志
tail -n 50 logs/main.log

# 检查渲染进程控制台错误
# 在应用中按 F12 打开开发者工具
```

**可能原因:**
- Node.js 版本不兼容 (需要 20.0.0+)
- 依赖安装不完整
- 权限问题

**解决方案:**
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查 Node.js 版本
node --version

# 重置应用数据 (谨慎操作)
npm run clear-db
```

#### Q: macOS 代码签名警告
**诊断:**
```bash
# 检查签名状态
codesign -dv app-path/Contents/MacOS/VeilBrowser
```

**解决方案:**
- 开发环境：禁用 Gatekeeper
- 生产环境：配置 Apple 开发证书

### 数据库问题

#### Q: SQLite 数据库损坏
**症状:** 应用启动失败，数据库错误

**解决方案:** 参考 [SQLite 修复指南](./sqlite-fix.md)

#### Q: Profile 数据丢失
**诊断:**
```bash
# 检查数据库文件
ls -la ~/Library/Application\ Support/VeilBrowser/

# 查看数据库大小
du -sh ~/Library/Application\ Support/VeilBrowser/veilbrowser.db
```

**恢复方法:**
```bash
# 从备份恢复 (如果有)
cp backup/veilbrowser.db ~/Library/Application\ Support/VeilBrowser/

# 重建数据库
npm run reset-db
```

### 网络问题

#### Q: 代理连接失败
**诊断:**
```bash
# 测试代理连接
curl --proxy http://proxy-server:port https://httpbin.org/ip

# 查看代理日志
grep "proxy" logs/app.log
```

**解决方案:**
- 检查代理服务器状态
- 验证代理配置
- 测试网络连接

#### Q: 许可证服务器连接失败
**诊断:**
```bash
# 测试服务器连接
curl -k https://license-server/api/health

# 检查证书问题
openssl s_client -connect license-server:443
```

**解决方案:**
- 检查网络配置
- 验证 SSL 证书
- 确认服务器状态

### 性能问题

#### Q: 应用启动慢
**诊断:**
```bash
# 查看启动时间
grep "Application started" logs/app.log

# 检查内存使用
grep "heap" logs/app.log
```

**优化措施:**
- 清理临时文件: `npm run clear-db`
- 重启应用
- 检查磁盘空间

#### Q: Profile 加载慢
**诊断:**
```bash
# 查看 Profile 数量
npm run diagnose:profiles

# 检查浏览器缓存
du -sh ~/Library/Application\ Support/VeilBrowser/profiles/
```

**解决方案:**
- 清理浏览器缓存
- 减少并发 Profile 数量
- 增加系统内存

### 安全问题

#### Q: 防盗版保护触发
**诊断:**
```bash
# 查看安全日志
grep "SECURITY_CHECK_WARNING\|tamper\|integrity" logs/app.log

# 检查哈希文件
ls -la dist-electron/hashes/
```

**解决方案:**
- 重新安装官方版本
- 检查文件完整性
- 联系技术支持

#### Q: 许可证验证失败
**诊断:**
```bash
# 查看许可证日志
grep "license" logs/app.log

# 检查许可证文件
ls -la ~/Library/Application\ Support/VeilBrowser/license.dat
```

**解决方案:**
- 重新激活许可证
- 检查硬件环境变化
- 联系许可证支持

## 🛠️ 维护工具

### 数据清理
```bash
# 清理数据库
npm run clear-db

# 清理所有数据
npm run clear-all

# 重置数据库
npm run reset-db
```

### 日志管理
```bash
# 查看日志文件
ls -la logs/

# 清理旧日志
find logs/ -name "*.log" -mtime +30 -delete

# 压缩日志
gzip logs/*.log
```

### 系统诊断
```bash
# 运行完整诊断
npm run diagnose:all

# 检查系统兼容性
npm run verify:system

# 验证安装完整性
npm run verify:installation
```

## 📞 获取帮助

### 技术支持渠道
1. **GitHub Issues**: [提交问题](https://github.com/veilbrowser/veilbrowser/issues)
2. **Discord 社区**: 实时讨论和支持
3. **邮箱支持**: support@veilbrowser.com
4. **文档搜索**: 在 docs/ 目录中搜索相关主题

### 提交问题报告
**请包含以下信息:**
- 操作系统版本
- Node.js 版本
- VeilBrowser 版本
- 完整的错误日志
- 重现步骤
- 预期行为 vs 实际行为

### 性能问题报告
**请提供:**
- 系统配置 (CPU, 内存, 磁盘)
- 应用运行时的资源使用情况
- 慢操作的具体描述
- 相关的性能指标

## 🚀 预防措施

### 定期维护
- [ ] 每周检查日志文件大小
- [ ] 每月清理临时文件
- [ ] 每季度验证数据库完整性
- [ ] 及时更新到最新版本

### 备份策略
- [ ] 重要 Profile 数据备份
- [ ] 数据库定期备份
- [ ] 配置文件备份
- [ ] 许可证信息记录

### 监控告警
- [ ] 设置日志监控告警
- [ ] 监控磁盘使用率
- [ ] 监控内存使用情况
- [ ] 定期检查安全事件

## 📚 相关链接

- [快速开始](../QUICKSTART.md)
- [开发环境](../DEVELOPMENT.md)
- [日志系统](../logging/README.md)
- [部署指南](../deployment/README.md)
