# ADR 0003: 使用 SQLite 替代 PostgreSQL

## 状态

已接受

## 背景

VeilBrowser 需要存储 Profile、分组、代理、标签等数据。在选择数据库时，我们评估了 SQLite 和 PostgreSQL。

## 决策

我们选择 **SQLite** 作为 VeilBrowser 的数据库，而不是 PostgreSQL。

## 理由

### 1. 零配置和部署简单

- **SQLite** 是嵌入式数据库，无需单独部署
- 数据库文件存储在 `{userData}/veilbrowser.db`
- **PostgreSQL** 需要单独部署和配置，增加复杂度

### 2. 适合 Electron 应用

- **SQLite** 是 Electron 应用的理想选择
- 无需网络连接，数据完全本地化
- **PostgreSQL** 需要网络连接，不适合桌面应用

### 3. 性能优秀

- **SQLite** 对于我们的场景（单用户、中小规模数据）性能优秀
- 读取性能 < 50ms（冷缓存）
- **PostgreSQL** 虽然性能更好，但我们的场景不需要

### 4. 数据安全

- **SQLite** 数据库文件可以加密（通过应用层加密）
- 数据完全本地化，不依赖外部服务
- **PostgreSQL** 需要网络连接，存在安全风险

### 5. 开发体验好

- **SQLite** 使用 `better-sqlite3`，API 简单易用
- 支持事务、索引、外键等完整 SQL 功能
- **PostgreSQL** 需要额外的 ORM 或查询构建器

### 6. 跨平台支持

- **SQLite** 原生支持 Windows、macOS、Linux
- 与 Electron 完美集成
- **PostgreSQL** 虽然也跨平台，但需要单独部署

## 后果

### 正面影响

- ✅ 零配置和部署简单（无需单独部署）
- ✅ 适合 Electron 应用（数据完全本地化）
- ✅ 性能优秀（单用户场景）
- ✅ 数据安全（完全本地化）

### 负面影响

- ⚠️ 不适合多用户场景（但我们的场景是单用户）
- ⚠️ 并发写入性能较差（但我们主要是读取操作）

### 风险

- **低风险**：SQLite 是成熟稳定的数据库
- **缓解措施**：使用事务和索引优化性能

## 替代方案

### 方案 A：使用 PostgreSQL

**优点**：
- 性能更好（多用户场景）
- 支持更复杂的查询

**缺点**：
- 需要单独部署和配置
- 需要网络连接
- 不适合 Electron 应用

### 方案 B：使用 IndexedDB

**优点**：
- 浏览器原生支持
- 无需额外依赖

**缺点**：
- 性能较差
- 查询功能有限
- 不适合复杂数据结构

### 方案 C：使用 JSON 文件

**优点**：
- 简单易用
- 无需额外依赖

**缺点**：
- 性能较差
- 不支持事务
- 不适合复杂数据结构

## 实施

- ✅ 已集成 better-sqlite3（`package.json`）
- ✅ 已实现 DAO 模式（`src/main/database/dao/`）
- ✅ 已实现迁移系统（`src/main/database/migrations.ts`）
- ✅ 已建立索引优化（详见 [数据库设计](../db/database.md)）

## 数据库设计

### 主要表

- `profiles` - Profile 表
- `groups` - 分组表
- `tags` - 标签表
- `proxies` - 代理表
- `font_sets` - 字体集合表
- `ua_sets` - UA 集合表
- `migrations` - 迁移记录表

### 性能优化

- 所有常用查询字段建立索引
- 使用 JSON 字段避免多对多关系 JOIN
- 摘要字段减少关联查询

## 参考

- [SQLite 官方文档](https://www.sqlite.org)
- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [数据库设计](../db/database.md)

---

**创建日期**: 2025-01-XX  
**最后更新**: 2025-01-XX  
**决策者**: VeilBrowser Team

