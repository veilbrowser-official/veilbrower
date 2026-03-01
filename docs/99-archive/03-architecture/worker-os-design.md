# Browser OS 架构设计 (Worker Process Redesign)

> **Status**: Approved v2.0
> **Target**: VeilBrowser 3.0 Architecture

## 1. 核心理念 (Philosophy)

Worker 进程不再是简单的脚本执行器，而是一个**微内核架构的专用操作系统**。
它运行在 Electron Utility Process 中，通过 **Veil-ISA** 指令集与外界通信。

## 2. 系统分层 (System Layers)

```text
src/processes/
├── kernel/                 # [核心层] OS Kernel
│   ├── boot/               # 引导程序 (Bootloader)
│   ├── ipc/                # 系统调用网关 (Syscall Gateway)
│   └── memory/             # 内存管理 (Context / Heap)
│
├── vm/                     # [运行时层] Virtual Machine (CPU)
│   ├── cpu.ts              # 指令解释器 (Fetch-Decode-Execute)
│   ├── registers.ts        # 寄存器状态 (%IP, %RESULT, %ERR)
│   └── dispatcher.ts       # 事件分发 (Instruction Feedback)
│
├── hal/                    # [硬件抽象层] Hardware Abstraction Layer
│   ├── browser/            # 浏览器驱动 (Playwright Wrapper)
│   ├── input/              # HID 驱动 (Human Interaction Simulation)
│   └── stealth/            # 安全驱动 (Anti-detection & Fingerprint)
│
├── syscalls/               # [系统调用层] System Calls
│   ├── table.ts            # 系统调用表 (OpCode Mapping)
│   ├── navigation.ts       # 导航指令实现
│   ├── interaction.ts      # 交互指令实现
│   └── logic.ts            # 逻辑运算实现
│
└── shared/                 # [共享库] Shared Protocols
    ├── isa/                # 指令集定义
    └── protocol/           # 通信协议
```

## 3. 关键组件详解 (Components)

### 3.1 Kernel (微内核)
*   **Gateway**: 接收主进程下发的 `Program` 或 `Block`。
*   **Scheduler**: 虽然是单线程，但可以通过协程处理外部中断 (Interrupts)。

### 3.2 Virtual Machine (CPU)
*   **指令周期**: 严格遵循 `Fetch -> Decode -> Execute` 循环。
*   **执行粒度**:
    *   `execInstruction`: 单步调试/原子操作。
    *   `execBlock`: **(主流模式)** 原子化执行一组指令，减少 IPC 开销。
    *   `execProgram`: 全托管运行模式。
*   **双工反馈**: 
    *   **下行 (Control)**: Block/Instruction。
    *   **上行 (Data)**: `sys:instruction_done` 事件流，实时反馈执行进度。

### 3.3 HAL (硬件抽象层)
这是 VeilBrowser 的“隐身斗篷”。
*   **Stealth-by-Design**: 所有的 `browser.launch`, `page.goto` 等调用，都会自动经过 HAL 层的清洗和伪装。
*   **Human-Like Input**: `input.click` 不再是简单的 CDP 命令，而是包含贝塞尔曲线轨迹和随机延迟的复杂动作序列。

## 4. 通信机制 (Communication)

### 4.1 控制流 (L6 -> Worker)
基于 **Request-Response** 模型。
```typescript
// L6 下发一个 Block
await agentClient.executeBlock(profileId, instructions, blockId);
```

### 4.2 数据流 (Worker -> L6)
基于 **Event Stream** 模型。
```typescript
// Worker 实时汇报进度
vm.emit('instruction:done', { blockId, index, result });
// Gateway 转发给主进程
process.send({ type: 'event', payload: ... });
```

## 5. 迁移策略 (Migration Strategy)

1.  **Phase 1 (Infrastructure)**: 建立目录结构，实现 VM 原型，跑通单元测试。**(已完成)**
2.  **Phase 2 (HAL)**: 迁移 Playwright 逻辑，封装 HAL 接口。
3.  **Phase 3 (Syscalls)**: 实现完整的 ISA 指令集。
4.  **Phase 4 (Compiler)**: 升级 L6 Compiler，输出 ISA 字节码。

---
**VeilBrowser Architecture Team**