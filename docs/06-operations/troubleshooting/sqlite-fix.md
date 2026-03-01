# 🔧 VeilBrowser SQLite 修复指南

## 🚨 当前问题

桌面应用无法启动，错误信息：
```
Error: Cannot find module 'better-sqlite3'
```

## 🔍 问题原因

1. **better-sqlite3 模块缺失**：之前被意外删除
2. **npm 权限问题**：无法自动重新安装模块
3. **编译版本不匹配**：Node.js版本升级后需要重新编译

## 🛠️ 解决方案

### 方法1：自动修复脚本（推荐）

```bash
# 在项目根目录运行
npm run fix:sqlite
```

### 方法2：手动修复步骤

#### 步骤1：修复npm权限
```bash
# 终端中执行
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.nvm

# 如果仍有问题，清理npm缓存
npm cache clean --force
```

#### 步骤2：重新安装better-sqlite3
```bash
# 方法A：强制重新编译安装
npm install better-sqlite3 --build-from-source

# 方法B：使用electron-rebuild
npx electron-rebuild -f -w better-sqlite3

# 方法C：使用项目脚本
npm run rebuild-native
```

#### 步骤3：验证安装
```bash
# 测试better-sqlite3是否工作
node -e "console.log('better-sqlite3 version:', require('better-sqlite3'))"
```

### 方法3：临时变通（如果上述方法都不行）

如果实在无法修复npm问题，可以：

1. **降级Node.js版本**到支持的版本
2. **或者联系技术支持**获取预编译的better-sqlite3包

## ✅ 验证修复

修复完成后，运行应用：

```bash
npm run electron:dev
```

应该能正常启动，看到应用界面。

## 📋 技术说明

- **桌面程序**：必须使用SQLite数据库，不能使用内存数据库
- **Server项目**：可以使用内存数据库或升级到PostgreSQL
- **当前状态**：代码已修复，只需要重新编译better-sqlite3

## 🔍 诊断工具

```bash
# 诊断Profiles数据加载问题
npm run diagnose:profiles

# 测试许可证逻辑
npm run test:license-logic

# 测试服务端配置
npm run test:server-config
```

## 📞 获取帮助

如果上述方法都无法解决问题，请：

1. 提供完整的错误日志
2. 说明你的操作系统和Node.js版本
3. 联系技术支持团队

---

**最后更新**: 2025-12-31
**状态**: 🟡 代码修复完成，等待用户执行修复步骤
