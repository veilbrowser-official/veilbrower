# 🏗️ 架构设计

本目录包含 VeilBrowser 的核心架构设计文档。

## 核心文档

- [**AgentOS Core Architecture (V3)**](01-agent-os-architecture.md) - 系统整体设计哲学与最新三层执行架构。
- [**7层架构总纲**](00-manifesto.md) - 系统整体设计哲学与 7 层执行模型。
- [**安全与反检测策略**](02-security-stealth.md) - 50+ 指纹点的伪装逻辑与安全隔离。
- [**端口规划**](ports-planning.md) - 系统高位端口分配与物理隔离规则。
- [**依赖分离设计**](dependency-separation.md) - 核心模块间的解耦与依赖管理。
- [**安全保护策略**](anti-piracy-strategy.md) - 软件授权与防破解策略。

## 架构决策记录 (ADR)

查看 [ADR 目录](adr/) 了解项目重大技术决策的演进过程。

> _注：旧版本（例如 Electron / CEF 阶段、早期的 IPC 与 Event 模型设计）相关设计文档已移至 `docs/99-archive`。_
