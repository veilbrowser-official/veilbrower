# 🔧 VeilBrowser 依赖分离指南

## 🎯 问题背景

在开发过程中，发现桌面程序和server项目的依赖发生了混淆：

- **桌面程序** 错误地包含了server专用依赖（express、cors、winston等）
- **版本不一致** better-sqlite3版本在两个项目中不一致
- **native模块冲突** 原生模块版本不一致可能导致编译和运行时错误

## ✅ 解决方案

### 1. 依赖严格分离

#### 桌面程序 (VeilBrowser 主应用)
```json
{
  "dependencies": {
    "better-sqlite3": "^12.4.1",  // SQLite数据库
    "electron": "^25.0.0",       // Electron框架
    "antd": "^5.21.0",           // UI组件库
    // ... 其他桌面应用依赖
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "typescript": "^5.7.2",
    "tsx": "^4.20.6",
    // ... 其他开发工具
  }
}
```

#### Server项目 (独立API服务)
```json
{
  "dependencies": {
    "better-sqlite3": "^12.4.1",  // 必须与桌面程序版本完全一致
    "express": "^4.19.2",         // Web框架
    "cors": "^2.8.5",             // CORS中间件
    "winston": "^3.18.3",         // 日志库
    // ... 其他server专用依赖
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",  // 必须与桌面程序版本完全一致
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/winston": "^2.4.4",
    // ... 其他server开发依赖
  }
}
```

### 2. 共享依赖版本同步

#### 关键原则
- **Native模块**：版本必须完全一致（better-sqlite3, zeromq等）
- **类型定义**：对应的@types包版本必须一致
- **核心库**：如果两个项目都使用，版本应该兼容

#### 版本管理脚本
```bash
# 验证依赖分离
npm run verify:deps

# 检查特定依赖版本
node -e "console.log(require('./package.json').dependencies['better-sqlite3'])"
node -e "console.log(require('./server/package.json').dependencies['better-sqlite3'])"
```

### 3. 避免依赖混淆的开发规范

#### 添加依赖时的检查清单
1. **确定依赖用途**：桌面程序专用、server专用、还是共享？
2. **检查现有依赖**：避免重复添加
3. **版本一致性**：共享依赖版本必须相同
4. **类型定义**：同时添加对应的@types包

#### 依赖安装命令
```bash
# 桌面程序依赖
npm install <package> --save

# Server依赖
cd server && npm install <package> --save

# 共享依赖（需要手动保持版本一致）
npm install <package> --save
cd server && npm install <package> --save
```

## 🛠️ 维护工具

### 依赖验证脚本
```bash
npm run verify:deps  # 验证依赖分离是否正确
```

### 常见问题排查
```bash
# 检查是否有server依赖混入桌面程序
npm run verify:deps

# 检查native模块版本
node scripts/verify-dependencies.js

# 修复SQLite问题
npm run fix:sqlite
```

## 🎯 最佳实践

### 1. 定期检查
- 每周运行 `npm run verify:deps`
- CI/CD中集成依赖验证
- 代码审查时检查依赖变更

### 2. 版本管理
- 使用 `^` 范围版本，但保持两个项目同步更新
- 重要native模块使用精确版本
- 维护一个共享依赖清单

### 3. 文档化
- 维护DEPENDENCY_SEPARATION.md
- 新成员培训时强调依赖分离
- 依赖变更需要更新文档

## 📋 当前状态

✅ **依赖已正确分离**
- 桌面程序：38个生产依赖，38个开发依赖
- Server：5个生产依赖，8个开发依赖
- 共享依赖：better-sqlite3 ^12.4.1 (版本一致)

✅ **Native模块统一**
- better-sqlite3: ^12.4.1
- @types/better-sqlite3: ^7.6.13

✅ **验证工具就绪**
- `npm run verify:deps` - 依赖分离验证
- `npm run fix:sqlite` - SQLite修复
- `npm run diagnose:profiles` - Profiles诊断

---

**最后更新**: 2025-12-31
**状态**: ✅ 依赖分离完成，验证工具就绪
