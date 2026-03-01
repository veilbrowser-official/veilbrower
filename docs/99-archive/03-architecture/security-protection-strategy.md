# VeilBrowser 源码安全防护策略 (2026 蓝图)

## 📋 概述
为了平衡“高强度代码保护”与“构建开发效率”，本项目采用 **分级差异化防护（狙击手策略）**。

## 🎯 核心保护方案

### 1. V8 字节码编译 (Bytenode) —— 【物理层隔离】
- **目标**：主进程 (`main.js`) 及其核心逻辑。
- **方案**：在 `npm run build` 后，通过 `bytenode` 将 `.js` 文件编译为二进制的 `.jsc` 文件。
- **优势**：
    - **极高强度**：不可逆向为源码，只能看到汇编指令。
    - **零性能损耗**：直接被 V8 引擎加载，启动速度甚至略有提升。
    - **构建极快**：编译过程仅需数秒。

### 2. 精准路径混淆 (Selective Obfuscation) —— 【逻辑层加固】
- **目标**：仅针对敏感业务目录：
    - `src/main/licensing/`（授权校验逻辑）
    - `src/main/anti-detection/`（指纹生成核心算法）
    - `src/shared/fingerprint/`（指纹定义）
- **方案**：在 Vite 构建流中集成 `javascript-obfuscator`，仅处理上述目录文件。
- **优势**：
    - **精准打击**：业务代码（如路由、数据库操作）不混淆，维持极速构建。
    - **难以分析**：变量名压缩、控制流扁平化、字符串隐藏。

### 3. 运行时自卫 (Runtime Self-Defense) —— 【环境层检查】
- **目标**：防止动态调试与篡改。
- **实施点**：`src/main/core/security.ts`
- **内容**：
    - **Anti-Debug**：周期性检测 `debugger` 挂载状态。
    - **ASAR Integrity**：在启动阶段校验 `app.asar` 的哈希值（Hash），防止被第三方注入代码。
    - **Native Check**：验证核心原生模块（如 `better-sqlite3`）是否被替换。

---

## 🚀 实施步骤（待执行）

### Phase 1: 基础设施准备
1. 安装 `bytenode` 依赖。
2. 在 `package.json` 中添加 `build:protect` 脚本。

### Phase 2: Vite 插件配置
修改 `electron.vite.config.ts`，配置 `transform` 钩子实现目录过滤。

### Phase 3: 安全层补全
完善 `src/main/core/security.ts` 中的 `initAntiPiracyProtection` 函数。

---

## ⚠️ 注意事项
- **调试困难**：加密后的代码产生的 Error Stack 将失去行号信息，生产环境必须配合完善的 JSON 日志系统。
- **顺序依赖**：必须在完成 **Cross-Platform Build** 稳定后再开启此流程，以防 ABI 错误与加密错误混淆。

**最后更新**: 2026-02-01
**状态**: 待实施 (Draft)
