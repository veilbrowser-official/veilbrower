# Infrastructure 重构 + 子进程 Logger 重构 - 完成检查清单

## ✅ 已完成的修复

### 1. Infrastructure 重构
- ✅ 创建 `business/infra/` 业务规则层
- ✅ 创建 `services/infra/` 服务实现层
- ✅ 迁移 Logger 到 `services/infra/logger/`
- ✅ 统一 Database 到 `database/` (删除重复的infra系统)
- ✅ 迁移 Crypto 到 `services/infra/crypto/`
- ✅ 所有导入路径已更新（~200 个文件）

### 2. 子进程 Logger 重构（2025 标准）
- ✅ 创建 `processes/utils/logger.ts`（零依赖，只通过 stdout 发送 JSON）
- ✅ 更新主进程监听逻辑（统一落盘）
- ✅ 替换所有子进程 logger 导入（60+ 个文件）
- ✅ 优化主进程日志监听（静态导入，性能更优）

### 3. 修复的问题
- ✅ 修复 `profileWindowManager.ts` crypto 导入路径
- ✅ 修复 `cache.ts` crypto 导入路径
- ✅ 修复 `storage.ts` crypto 导入路径
- ✅ 修复动态导入 DAO 路径
- ✅ 优化日志监听性能（移除动态导入）

## 📋 连调前验证清单

### 关键功能验证
- [ ] **应用启动**：主进程正常初始化，logger 正常输出
- [ ] **数据库初始化**：`initDatabase()` 正常执行，迁移脚本运行
- [ ] **Profile 启动**：子进程正常 spawn，日志通过 stdout 发送
- [ ] **日志落盘**：子进程日志被主进程正确接收并写入文件
- [ ] **配置文件加密**：Profile 配置加密/解密正常

### 导入路径验证
- [ ] 无旧路径引用（crypto、database、logger）
- [ ] 子进程无主进程依赖
- [ ] Facade 导出正常工作

### 性能验证
- [ ] 日志监听无性能问题（静态导入生效）
- [ ] 子进程日志发送不阻塞业务逻辑

### 潜在问题
- ⚠️ `src/main/database/` 旧文件仍存在（已复制到新位置，可作为备份保留）
- ⚠️ 部分文件直接导入 DAO（而非通过 facade），功能正常但风格不统一（可选优化）

## 🚀 连调建议

1. **启动测试**：
   ```bash
   npm run electron:dev
   ```
   - 检查控制台是否有导入错误
   - 检查日志文件是否正常生成

2. **Profile 启动测试**：
   - 创建新 Profile
   - 启动 Profile
   - 检查子进程日志是否出现在主日志文件中

3. **功能回归测试**：
   - Profile CRUD 操作
   - 配置加密/解密
   - 数据库查询

## 📝 后续优化（可选）

1. **统一 DAO 导入**：所有文件通过 facade 导入（当前部分直接导入 DAO）
2. **清理旧文件**：确认无问题后删除 `src/main/database/` 和 `src/main/utils/logger.ts`、`crypto.ts`
3. **完善业务规则层**：实现更多 usecases 和规则函数

---

**重构完成时间**：2025-01-XX  
**状态**：✅ 准备连调

