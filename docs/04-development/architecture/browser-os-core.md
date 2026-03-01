# VeilBrowser OS Core 架构文档

> **版本**: 1.0.0 (2025-02)
> **状态**: 稳定 (Stable)
> **模块**: `src/processes`

---

## 🏗️ 架构概览

VeilBrowser OS 是运行在 Electron Renderer 进程（Worker）中的轻量级沙盒操作系统。它模拟了一个完整的运行时环境，用于执行自动化任务、管理指纹、模拟人类行为，并与底层浏览器（Playwright）进行交互。

### 五层架构模型

Browser OS 采用严格的分层架构，自底向上分别为：

| 层级   | 模块                      | 职责                           | 关键组件                                                |
| ------ | ------------------------- | ------------------------------ | ------------------------------------------------------- |
| **L1** | **Kernel** (内核层)       | 进程引导、IPC 通信、异常捕获   | `BootLoader`, `SyscallGateway`, `ProcessSandbox`        |
| **L2** | **VM** (虚拟机层)         | 指令执行、寄存器管理、内存管理 | `VirtualMachine` (CPU), `Registers`, `Memory`           |
| **L3** | **Syscalls** (系统调用层) | 提供底层能力给 VM 调用         | `SyscallTable`, `Logic`, `Perception`, `Interaction`    |
| **L4** | **HAL** (硬件抽象层)      | 屏蔽浏览器差异，模拟输入设备   | `BrowserDriver`, `InputDriver` (Human Simulation)       |
| **L5** | **Stealth** (反检测层)    | 指纹注入、特征抹除             | `StealthPlugin`, `ScriptFactory`, `FingerprintInjector` |

---

## 🧠 核心组件详解

### 1. Kernel (内核)

位于 `src/processes/kernel/`。

- **BootLoader**: 负责初始化环境，加载配置，启动 VM。
- **IPC Gateway**: 处理主进程 (`Main`) 与 Worker 进程的通信。所有通信通过原生 Node.js IPC 进行，摒弃了 ZMQ。

### 2. Virtual Machine (VM)

位于 `src/processes/vm/`。
VeilBrowser 拥有设计完备的虚拟 CPU：

- **Fetch-Decode-Execute**: 标准的指令执行循环。
- **寄存器 (Registers)**: 包含 `IP` (指令指针), `SP` (栈指针), `RESULT` (运算结果), `ERROR` (错误状态)。
- **调用栈 (Call Stack)**: 支持 `CALL`/`RET` 子程序调用。
- **数据栈 (Data Stack)**: 支持 `PUSH`/`POP` 数据操作。
- **错误处理**: 支持 `ERR_TRAP` 自动跳转机制。

### 3. Syscalls (系统调用)

位于 `src/processes/syscalls/`。
连接 VM 指令与底层能力的桥梁。目前实现了 27 个核心系统调用。

### 4. HAL (硬件抽象层)

位于 `src/processes/hal/`。

- **BrowserDriver**: 封装 Playwright Page/Context 操作。
- **InputDriver**: 核心的人类模拟引擎。
  - **贝塞尔曲线**: 模拟鼠标移动的自然轨迹。
  - **Fitts' Law**: 计算点击目标的运动时间。
  - **噪声注入**: 随机化输入延迟和坐标偏移。

### 5. Stealth (反检测引擎)

位于 `src/processes/core/stealth/`。

- **ScriptFactory**: 动态生成 800+ 行的指纹伪装脚本。
- **覆盖范围**:
  - **Canvas/WebGL/WebGPU**: 噪声注入。
  - **AudioContext**: 音频指纹混淆。
  - **Hardware**: 内存、核心数、电池、传感器伪装。
  - **Environment**: 时区、语言、插件、字体伪装。

---

## 📜 ISA 指令集体系 (Veil-ISA)

VM 支持 30+ 条指令，覆盖五大类能力。

### 1. 流程控制 (Flow Control)

| OpCode | 指令                | 说明                 |
| ------ | ------------------- | -------------------- |
| `0x00` | **NOP**             | 空操作               |
| `0x01` | **EXIT** `code`     | 终止程序             |
| `0x02` | **JMP** `addr`      | 无条件跳转           |
| `0x04` | **JEZ** `addr`      | 结果为零/假跳转      |
| `0x05` | **JNZ** `addr`      | 结果非零/真跳转      |
| `0x06` | **CALL** `addr`     | 调用子程序 (压栈)    |
| `0x07` | **RET**             | 从子程序返回 (弹栈)  |
| `0x08` | **ERR_TRAP** `addr` | 设置全局错误捕获地址 |

### 2. Tab/Frame 管理 (Page Context)

> **设计决策**: VeilBrowser 采用**显式 Tab 管理**策略。新页面打开时 **不会自动切换活跃页**，必须通过 `TAB_SELECT` 显式切换。这避免了工作流执行时的上下文混乱。

| OpCode | 指令                              | 说明                                                 |
| ------ | --------------------------------- | ---------------------------------------------------- |
| `0x28` | **TAB_LIST**                      | 列出所有 Tab，返回 `[{index, url, title, isActive}]` |
| `0x29` | **TAB_SELECT** `index \| pattern` | 切换活跃 Tab (支持索引或 URL glob 模式)              |
| `0x2A` | **TAB_NEW** `url?`                | 新建 Tab 并切换                                      |
| `0x2B` | **TAB_CLOSE** `index?`            | 关闭 Tab (默认当前，禁止关闭 Panel)                  |
| `0x2C` | **FRAME_SELECT** `selector?`      | 选择 iframe 上下文 (传 `main` 或空返回主 frame)      |

### 3. 数据操作 (Data Operations)

| OpCode | 指令                      | 说明                                                 |
| ------ | ------------------------- | ---------------------------------------------------- |
| `0x10` | **MOV** `dest, src`       | 数据传送                                             |
| `0x11` | **PUSH** `val`            | 压入数据栈                                           |
| `0x12` | **POP**                   | 弹出数据栈                                           |
| `0x13` | **CALC** `a, b, op`       | 算术运算 (+, -, \*, /, ==, !=, >, <)                 |
| `0x14` | **STR_OP** `str, op, ...` | 字符串操作 (len, upper, lower, split, replace, etc.) |
| `0x15` | **JSON_PARSE** `str`      | JSON 解析对象                                        |

### 3. 感知能力 (Perception)

| OpCode | 指令                     | 说明                                |
| ------ | ------------------------ | ----------------------------------- |
| `0x20` | **DOM_QUERY** `sel`      | 查询元素，返回 {count, found}       |
| `0x21` | **DOM_TEXT** `sel`       | 获取元素文本                        |
| `0x22` | **DOM_ATTR** `sel, attr` | 获取元素属性                        |
| `0x23` | **DOM_SNAPSHOT** `type`  | 获取页面 HTML 或 Accessibility Tree |
| `0x24` | **PAGE_URL**             | 获取当前 URL                        |
| `0x25` | **WAIT_NAV** `until, ms` | 等待页面导航                        |
| `0x26` | **WAIT_EL** `sel, state` | 等待元素状态 (visible/attached)     |
| `0x27` | **WAIT_MS** `ms`         | 显式等待 (Sleep)                    |

### 4. 交互能力 (Interaction)

| OpCode | 指令                        | 说明                            |
| ------ | --------------------------- | ------------------------------- |
| `0x30` | **NAV_GOTO** `url`          | 页面跳转                        |
| `0x31` | **NAV_RELOAD**              | 刷新页面                        |
| `0x32` | **HID_CLICK** `sel`         | 模拟人类点击 (带轨迹、随机延迟) |
| `0x33` | **HID_INPUT** `sel, txt`    | 模拟人类输入 (变频击键)         |
| `0x34` | **HID_SCROLL** `x, y`       | 模拟平滑滚动                    |
| `0x35` | **HID_KEY** `key`           | 模拟键盘按键 (支持组合键)       |
| `0x36` | **HID_UPLOAD** `sel, files` | 文件上传                        |
| `0x37` | **HID_MOUSE** `x, y`        | 模拟鼠标移动                    |

### 5. 扩展能力 (Extensions) - _Planned_

- `0x40` **AI_PROMPT**: 调用 LLM 进行页面分析。
- `0x41` **CAPTCHA_SOLVE**: 本地/云端验证码求解。

---

## 🛡️ 反检测机制

Browser OS 的反检测不同于传统插件注入，它在 **Context 初始化阶段** 就通过 CDP/Playwright API 注入原生级别的伪装脚本 (Script Factory)。

### 关键特性

1.  **不可变性**: 使用 `Object.defineProperty` 冻结属性，防止被检测脚本篡改。
2.  **原型链伪装**: 确保伪造对象的 `__proto__` 链条与真实浏览器一致。
3.  **ToString 保护**: Hook `Function.prototype.toString`，确保伪造函数返回 `[native code]`。
4.  **动态生成**: 每次启动的指纹脚本都是动态组装的，避免静态特征码检测。

---

## 🔄 开发工作流

1.  **定义 OpCode**: 在 `src/shared/types/isa/index.ts` 添加新指令。
2.  **实现 Syscall**: 在 `src/processes/syscalls/` 下对应模块实现函数逻辑。
3.  **注册 Table**: 在 `src/processes/syscalls/table.ts` 注册 OpCode 映射。
4.  **编写测试**: 在 `tests/unit/processes/syscalls/` 添加单元测试。

---

**VeilBrowser Team** | 2025
