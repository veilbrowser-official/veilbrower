# 🔧 开发者指南

本目录包含 VeilBrowser 的开发规范、API 定义和调试指南。

## 核心规范
* [**命名与代码铁律**](standards/coding-style.md) - TypeScript 命名规范、反检测安全铁律。
* [**文件系统使用规范**](standards/fs-usage-standards.md) - 严格禁止直接使用 `fs`，必须使用统一封装。
* [**重构检查清单**](standards/refactor-checklist.md) - 代码重构时的强制检查项。
* [**贡献指南**](contributing.md) - 如何参与项目开发与代码提交。

## API 与通信
* [**IPC API 完整定义**](api/ipc-api.md) - 主进程与渲染进程之间的所有通信接口。
* **DataBus 协议** - (待完善) 子进程实时状态推送协议。

## 质量保证
* [**测试指南**](testing/improvements.md) - 单元测试、集成测试与 E2E 测试方案。
* [**任务中心验证**](testing/task-center-verification.md) - 批量任务调度逻辑的验证过程。
