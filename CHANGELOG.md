# 更新日志

本文档遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 规范。

## [未发布]

### 新增
- 添加网格预览功能，支持实时截图更新
- 添加 URL 历史搜索和自定义快速站点到 Dashboard
- 添加 IPC 接口文档（`docs/api/ipc-api.md`）
- 添加数据库设计文档（`docs/db/database.md`）
- 添加架构设计文档（`docs/ARCHITECTURE.md`）
- 添加 ADR（架构决策记录）文档
- 添加贡献指南（`CONTRIBUTING.md`）
- 添加代码规范（`CODING-STYLE.md`）
- 添加模块文档（按 7 层架构组织）

### 优化
- 优化网格预览布局：减小间距和 padding，添加容器边界
- 优化卡片尺寸以匹配截图比例（240×150）
- 优化网格列宽计算，充分利用空间
- 优化 README.md，添加 5 分钟快速上手指南
- 优化截图频率（10 秒）和质量（240×150，quality: 35）
- 优化架构文档结构：整合进程模型和数据流到系统架构章节
- 优化文档体系：统一文档命名和结构，符合 2025 年最佳实践
- 更新 IPC API 文档：添加 Execution 和 Window API
- 更新数据库文档：添加设备白名单相关表（device_templates, device_instances, timezone_mappings）
- 更新快速开始指南：反映最新实现状态

### 修复
- 修复 `getActiveTab()` 一致返回首个页面的问题
- 修复任务执行结果成功率计算错误
- 修复 `latencyColor is not defined` 错误
- 修复 `filteredProfiles` 初始化顺序问题

## [1.0.0] - 2025-01-XX

### 新增
- 初始版本发布
- Profile 管理（创建、更新、删除、批量操作）
- 指纹伪装（50+ 指纹点）
- 代理管理（HTTP/SOCKS5 支持，健康检测）
- 分组管理（树形结构）
- 标签管理
- Dashboard 界面（新版布局）
- 环境抽屉（搜索、筛选、批量操作）
- 网格预览模式（实时截图更新）
- 7 层自动化体系（部分实现）

### 技术栈
- Electron 33+ (Chromium 129+)
- React 18 + TypeScript 5
- Ant Design 5.21+
- Zustand + React Hook Form + Zod
- better-sqlite3 + DAO 模式
- Playwright + ZeroMQ
- argon2 加密

---

**格式说明**：
- `新增` - 新功能
- `优化` - 现有功能的改进
- `修复` - Bug 修复
- `移除` - 已移除的功能
- `安全` - 安全相关的更新

