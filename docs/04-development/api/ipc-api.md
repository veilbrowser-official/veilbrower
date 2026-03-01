# IPC 通信接口文档 (VeilBrowser 3.0)

> **核心原则**: 采用基于 **Veil-ISA** 的指令分发模型。

## 1. 主进程 -> Worker (Control Flow)

### 1.1 `vm:execute_block`
下发一个指令块 (Basic Block) 执行。
*   **参数**:
    ```typescript
    {
      blockId: string;
      instructions: Instruction[];
    }
    ```
*   **返回**: 最后一条指令的执行结果。

### 1.2 `vm:execute_program`
下发一个完整程序。
*   **参数**:
    ```typescript
    {
      program: Program;
    }
    ```

### 1.3 兼容性 Syscalls (Legacy Bridge)
以下方法仍支持直接调用，但在内部会被映射为 ISA 指令：
*   `browser.goto`: 页面跳转
*   `page.click`: 元素点击
*   `page.type`: 文本输入
*   `page.snapshot`: 获取快照 (AI 用)

## 2. Worker -> 主进程 (Data Flow)

### 2.1 `sys:instruction_done` (Event)
每条指令执行完成后的实时反馈。
*   **Payload**:
    ```typescript
    {
      blockId: string;
      index: number;
      op: OpCode;
      result: any;
      meta?: { sourceId: string };
    }
    ```

### 2.2 `sys:log` (Event)
Worker 内部的结构化日志上报。
