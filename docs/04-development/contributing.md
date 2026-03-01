# 贡献指南

感谢你对 VeilBrowser 项目的关注！本文档将帮助你了解如何为项目做出贡献。

## 📋 目录
- [MVP开发原则](#mvp开发原则)
- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Issue 报告](#issue-报告)
- [Pull Request](#pull-request)

## 🤝 行为准则

- **尊重他人**：保持友好和专业的态度
- **开放包容**：欢迎不同背景和经验的贡献者
- **建设性反馈**：提供有建设性的批评和建议
- **遵守规范**：遵循项目的代码规范和开发流程

## 🚀 如何贡献

### 1. Fork 项目

1. 在 GitHub 上 Fork 本项目
2. 克隆你的 Fork 到本地：
   ```bash
   git clone https://github.com/your-username/VeilBrowser.git
   cd VeilBrowser
   ```

### 2. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范**：
- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关

### 3. 开发环境设置

```bash
# 安装依赖
npm install

# 启动开发模式
npm run electron:dev

# 运行类型检查
npm run typecheck

# 运行 Lint
npm run lint
```

### 4. 开发流程

1. **阅读相关文档**：
   - [架构设计](docs/ARCHITECTURE.md)
   - [代码规范](CODING-STYLE.md)
   - [IPC 接口文档](docs/api/ipc-api.md)

2. **编写代码**：
   - 遵循项目的代码规范
   - 添加必要的注释和文档
   - 确保类型检查通过（`npm run typecheck`）
   - 确保 Lint 检查通过（`npm run lint`）

3. **测试你的更改**：
   - 手动测试新功能或修复
   - 确保没有破坏现有功能
   - 检查控制台是否有错误

4. **提交更改**：
   - 遵循[提交规范](#提交规范)
   - 确保提交信息清晰描述你的更改

## 💡 MVP开发原则

我们遵循精益创业和敏捷开发的理念，在保证产品质量的前提下，优先考虑用户价值和快速迭代。

### 🎯 MVP成功标准

- ✅ **功能可用 > 代码完美**
- ✅ **用户价值 > 技术债务**
- ✅ **快速迭代 > 大规模重构**

### 🏗️ 技术债务哲学

- **不是bug，是未来优化的空间**
- **记录而非回避，规划而非拖延**
- **业务驱动重构，而非技术驱动**

### 📋 实践指南

#### 评估重构时机
- **立即修复**：影响用户体验的bug，安全漏洞
- **规划修复**：代码质量问题，技术债务
- **推迟修复**：非关键的代码优化，架构重构

#### MVP发布策略
- **核心功能稳定**：确保基础功能正常工作
- **用户价值优先**：解决用户痛点而非技术完美
- **渐进式改进**：发布后根据用户反馈持续优化
- **风险控制**：小步快跑，可快速回滚

#### 技术债务管理
- **记录债务**：在`docs/technical-debt.md`记录已知问题
- **优先级排序**：根据用户影响程度排序修复计划
- **版本规划**：在ROADMAP中规划技术债务清理
- **持续改进**：每个版本都清理部分技术债务

## 📝 代码规范

详见 [CODING-STYLE.md](CODING-STYLE.md)，主要规范包括：

- **TypeScript 严格模式**：启用所有严格检查
- **React Hooks 规则**：严格遵循 Hooks 规则
- **命名规范**：组件 PascalCase，函数/变量 camelCase
- **文件组织**：按功能模块组织代码
- **注释要求**：复杂逻辑必须添加注释

## 📤 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
feat(profile): 添加批量创建 Profile 功能

- 支持从 CSV 文件批量导入
- 添加进度条显示
- 优化错误处理

Closes #123
```

## 🐛 Issue 报告

### 报告 Bug

1. **检查是否已有相关 Issue**：避免重复
2. **使用 Bug 报告模板**：
   - 清晰描述问题
   - 提供复现步骤
   - 提供环境信息（OS、Node 版本等）
   - 提供错误日志或截图

### 功能请求

1. **检查是否已有相关 Issue**：避免重复
2. **使用功能请求模板**：
   - 清晰描述功能需求
   - 说明使用场景
   - 提供可能的实现方案（可选）

## 🔀 Pull Request

### PR 检查清单

- [ ] 代码遵循项目规范
- [ ] 类型检查通过（`npm run typecheck`）
- [ ] Lint 检查通过（`npm run lint`）
- [ ] 手动测试通过
- [ ] 更新相关文档（如需要）
- [ ] 提交信息符合规范
- [ ] 没有合并冲突

### PR 流程

1. **创建 PR**：
   - 标题清晰描述更改
   - 描述中说明更改原因和影响
   - 关联相关 Issue（如 `Closes #123`）

2. **代码审查**：
   - 等待维护者审查
   - 根据反馈进行修改
   - 保持 PR 更新（解决冲突）

3. **合并**：
   - 维护者审查通过后合并
   - 使用 "Squash and merge" 保持提交历史整洁

## 📚 开发资源

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Playwright 文档](https://playwright.dev)

## ❓ 需要帮助？

- 查看 [文档目录](README.md#-文档体系)
- 在 Issue 中提问
- 联系维护者

---

**感谢你的贡献！** 🎉

