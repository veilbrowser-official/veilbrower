# 测试策略与规范 (Testing Strategy)

> **原则**: 测试代码不应污染生产代码目录 (`src/`)，所有测试应集中管理。

## 1. 测试分层体系

VeilBrowser 采用标准的金字塔测试策略：

| 层级                   | 目录位置                 | 命名规范    | 关键技术        | 职责                                      |
| :--------------------- | :----------------------- | :---------- | :-------------- | :---------------------------------------- |
| **Unit (单元测试)**    | `tests/unit/**/*`        | `*.spec.ts` | Vitest, vi.mock | 验证单一类/函数的逻辑，100% Mock 外部依赖 |
| **Integration (集成)** | `tests/integration/**/*` | `*.test.ts` | Vitest, Real DB | 验证模块间协作、数据库交互、真实文件系统  |
| **E2E (端到端)**       | `tests/e2e/**/*`         | `*.e2e.ts`  | Playwright      | 模拟用户真实操作，验证全链路业务闭环      |

## 2. 目录结构规范

测试目录结构应严格镜像 `src` 目录结构，以便快速定位。

```
src/
  main/
    workflow/
      domain/
        entities/
          execution.entity.ts

tests/
  unit/
    main/                    # 镜像 src/main
      workflow/
        domain/
          entities/
            execution.entity.spec.ts
  integration/
    main/
      workflow/
        execution-flow.test.ts
  e2e/
    login.e2e.ts
```

> ❌ **禁止**：在 `src/` 目录下放置 `*.spec.ts` 或 `*.test.ts` 文件。
> ❌ **禁止**：在单元测试中直接导入真实数据库连接（必须 Mock）。

## 3. 单元测试指南 (Unit Testing)

### 3.1 核心原则

- **速度至上**：单元测试必须在毫秒级运行。
- **环境隔离**：完全 Mock 掉 Electron (`app`, `ipcMain`), FS, Database, Network。
- **DDD 对齐**：优先测试 Domain Entities 和 Pure Functions。

### 3.2 Mock 最佳实践 (Vitest)

```typescript
// ✅ 推荐：模块级 Mock
vi.mock("@/main/infra/logger", () => ({
  getLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

// ✅ 推荐：Mock 依赖类
vi.mock("@/main/database/db", () => ({
  getDb: () => mockDbInstance,
}));
```

## 4. 集成测试指南 (Integration Testing)

- **真实环境**：允许连接测试数据库 (SQLite In-Memory 或 Test DB)。
- **清理数据**：每个 `describe` 或 `test` 后必须重置数据状态 (`beforeEach`/`afterEach`)。
- **关注点**：重点测试 Repository 持久化、Service 编排逻辑。

## 5. E2E 测试指南 (Playwright)

- **场景驱动**：每个测试文件对应一个用户 Story（如 "用户导入 Profile 并启动"）。
- **稳定性**：即使测试时间长，也要保证稳定性（使用 `await expect` 等待元素）。

## 6. CI/CD 集成

- `npm run test:unit`: 提交前必跑 (Pre-commit hook)
- `npm run test:e2e`: 合并 PR 前必跑 (CI Pipeline)

---

**历史代码迁移**：
如果发现 `src/` 下存在历史遗留测试文件，请逐步迁移至 `tests/` 目录，并更新引用路径。
