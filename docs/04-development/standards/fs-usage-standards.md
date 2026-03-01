# Fs 模块使用规范 (2025)

## 🎯 概述

VeilBrowser 项目采用现代化的 fs 模块使用规范，确保代码一致性、类型安全和最佳性能。

## 📋 核心规范

### 1. 统一导入方式

#### ✅ 推荐：Promise 风格
```typescript
// 主进程服务文件 - 推荐方式
import * as fs from 'fs/promises';
import { existsSync, rmSync, statSync } from 'fs';
```

#### ❌ 避免：回调风格
```typescript
// 不要使用
import * as fs from 'fs';
import fs from 'fs';
```

### 2. 使用模式

#### 异步操作 (Promise)
```typescript
// ✅ 正确
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path, data);
await fs.readFile(path);
const stats = await fs.stat(path);
```

#### 同步操作 (仅在必要时)
```typescript
// ⚠️ 谨慎使用，仅在性能关键路径
if (existsSync(path)) {
  rmSync(path, { recursive: true });
}
```

### 3. 文件分类规范

#### 主进程服务文件 (`src/main/services/**/*.ts`)
```typescript
import * as fs from 'fs/promises';
import { existsSync, rmSync } from 'fs';
```

#### 工具类文件 (`src/utils/**/*.ts`)
```typescript
import * as fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
```

#### 进程文件 (`src/processes/**/*.ts`)
```typescript
import * as fs from 'fs/promises';  // 异步操作
import { existsSync } from 'fs';     // 同步检查
```

#### 渲染进程文件 (`src/renderer/**/*.ts`)
```typescript
// 谨慎使用，仅在必要时
import * as fs from 'fs/promises';
```

## 🔧 迁移指南

### 第一阶段：统一 Promise 导入

```bash
# 将所有 'fs' 导入改为 'fs/promises'
find src -name "*.ts" -exec sed -i '' "s/from 'fs'/from 'fs\/promises'/g" {} \;
```

### 第二阶段：添加同步方法导入

```typescript
// 为需要同步方法的文件添加
import { existsSync, rmSync, statSync } from 'fs';
```

### 第三阶段：清理回调代码

```typescript
// 回调风格 → Promise 风格
fs.mkdir(path, callback) → await fs.mkdir(path)
fs.writeFile(path, data, callback) → await fs.writeFile(path, data)
```

## ✅ 验证清单

- [ ] 所有文件使用 `import * as fs from 'fs/promises'`
- [ ] 同步方法单独从 `fs` 导入
- [ ] 无回调风格的 fs 使用
- [ ] 构建成功，无类型错误
- [ ] 功能测试通过

## 🚨 注意事项

1. **性能考虑**: 避免在热路径使用同步方法
2. **错误处理**: 正确处理 Promise 拒绝
3. **兼容性**: 确保 Node.js 20+ 环境
4. **类型安全**: 使用 TypeScript 的 fs 类型

## 📚 参考资料

- [Node.js fs/promises API](https://nodejs.org/api/fs.html#promises-api)
- [fs/promises 稳定性](https://nodejs.org/api/fs.html#file-system-flags)

---

**最后更新**: 2025-01-09
**维护者**: VeilBrowser Team