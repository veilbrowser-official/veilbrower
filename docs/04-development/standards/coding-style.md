# 代码规范 (Coding Style)

本文档定义了 VeilBrowser 项目的代码风格和开发规范。所有贡献者必须遵循这些规范。

## 📋 目录

- [TypeScript 规范](#typescript-规范)
- [代码组织原则](#代码组织原则)
- [命名规范](#命名规范)
- [React 规范](#react-规范)
- [组件设计原则](#组件设计原则)
- [状态管理原则](#状态管理原则)
- [数据库访问原则](#数据库访问原则)
- [IPC 通信原则](#ipc-通信原则)

## 🔧 TypeScript 规范

### 核心原则

- **kebab-case.type.ts 文件名**：`user-profile.service.ts`（Angular 风格）
- **PascalCase 类名**：`class UserProfileService`
- **camelCase 方法/属性**：`getUserProfile()`, `userId`
- **SCREAMING_SNAKE_CASE 常量**：`MAX_RETRY_COUNT`

### 严格模式

✅ **必须启用严格模式**：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 路径别名 (Path Aliases)

✅ **使用路径别名**：

- `@/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`
- `@main/*` → `src/main/*`
- `@processes/*` → `src/processes/*`

**强制规则**：
1.  **同级/子级引用**：允许使用相对路径（如 `./utils`, `../shared`）。
2.  **跨层级/跨模块引用**：**必须**使用路径别名，禁止使用超过两级的相对路径（如 `../../../`）。
3.  **根目录引用**：禁止引用项目根目录文件（如 `package.json`），应通过 `utils/appPaths` 获取路径。

```typescript
// ✅ 正确
import { Profile } from "@shared/types";
import { getLogger } from "@main/infra/logger";
import { ProfileCard } from "@/components/ProfileCard";

// ❌ 错误（深层嵌套相对路径，脆弱且难以维护）
import { Profile } from "../../../shared/types";
import { getLogger } from "../../../../main/infra/logger";
```

### 类型定义

✅ **优先使用接口（interface）而非类型别名（type）**：

```typescript
// ✅ 正确
export interface Profile {
  id: string;
  name: string;
}

// ❌ 错误（除非需要联合类型或工具类型）
export type Profile = {
  id: string;
  name: string;
};
```

## 📁 代码组织原则

### 模块化架构 (2025 Standard)

✅ **按功能模块组织代码 (Feature-Based)**：
以 `src/main/profile` 为例，采用 DDD 分层结构：

```text
src/main/profile/
├── api/                    # IPC 接口定义与注册
│   └── profile.ipc.ts
├── application/            # 应用服务层 (Use Cases)
│   └── profile.service.ts
├── domain/                 # 领域层 (Entities & Interfaces)
│   ├── profile.entity.ts
│   └── i.profile.repository.ts
├── infrastructure/         # 基础设施层 (Implementation)
│   └── profile.sqlite.repository.ts
├── lifecycle/              # 生命周期管理
│   ├── profile-lifecycle.manager.ts
│   └── profile-process.monitor.ts
└── index.ts                # 模块入口 (Exports & Init)
```

### 模块入口 (Entry Point)

✅ **每个模块必须有 `index.ts`**：
提供 `initModule()` 函数和必要的导出，封装内部复杂性。

```typescript
// src/main/profile/index.ts
export function initProfileModule() {
  const repo = new SqliteProfileRepository();
  const service = new ProfileService(repo);
  // ... wiring ...
  return { service };
}

export * from "./domain/profile.entity.js";
```

### 服务层 (Service Layer)

✅ **业务逻辑放在 Application Service 层**：
Service 层负责协调 Repository 和其他组件，不直接操作底层（如 SQL）。

```typescript
// src/main/profile/application/profile.service.ts
export class ProfileService {
  constructor(private readonly repo: IProfileRepository) {}

  async createProfile(data: CreateProfileDto): Promise<Profile> {
    // Business Logic
    const profile = new Profile(data);
    await this.repo.save(profile);
    return profile;
  }
}
```

## 🏷️ 命名规范

### 文件命名

- **服务文件**：`*.service.ts`（如 `user-profile.service.ts`）
- **接口文件**：`i.*.repository.ts`（如 `i.profile.repository.ts`，注意 `i` 后面带点）
- **实体文件**：`*.entity.ts`（如 `user-profile.entity.ts`）
- **组件文件**：PascalCase（如 `ProfileCard.tsx`，仅限 React 组件）
- **管理器/其他**：`*.manager.ts`, `*.launcher.ts` (如 `profile-lifecycle.manager.ts`)
- **工具文件**：`*.util.ts` 或 `*.helper.ts`

### 变量命名

- **类名**：PascalCase（`ProfileService`）
- **函数/变量**：camelCase（`createProfile`, `profileData`）
- **常量**：UPPER_SNAKE_CASE（`DEFAULT_TIMEOUT`）
- **接口/抽象类**：PascalCase，Repository 接口使用 `I` 前缀（`IProfileRepository`）

## ⚛️ React 规范

### 函数组件

✅ **优先使用函数组件和 Hooks**：

```typescript
// ✅ 正确
export default function ProfileCard({ profile }: { profile: Profile }) {
  return <div>{profile.name}</div>;
}
```

### Hooks 规则

✅ **严格遵循 React Hooks 规则**：

- 不在条件语句中使用 Hooks
- 不在循环中使用 Hooks

## 📦 状态管理原则

### Zustand Store

✅ **按功能模块划分 Store**：

- `profile.store.ts` - Profile 管理
- `ui.store.ts` - UI 状态

## 🗄️ 数据库访问原则

### Repository 模式

✅ **所有数据库操作通过 Repository 层**：

```typescript
// ✅ 正确
await this.profileRepository.save(profile);

// ❌ 错误（直接在 Service 中操作数据库）
const stmt = db.prepare("INSERT ...");
```

## 🔌 IPC 通信原则

### 安全性

✅ **使用 `contextBridge` 暴露安全 API**：
不直接暴露 Node.js 能力，仅暴露预定义的 IPC 方法。

### 错误处理

✅ **IPC 调用必须处理 Promise rejection**：
在 UI 层统一处理错误提示。

---

**最后更新**: 2025-01-26 | **维护者**: VeilBrowser Team
