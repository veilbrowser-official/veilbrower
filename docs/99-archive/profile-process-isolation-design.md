# Profile 进程隔离方案设计文档

## 📄 文档概述

**文档目的**：本文档详细描述 VeilBrowser 的 **进程隔离方案**（Per Profile Spawn 子进程 + 端口池），用于实现生产级单机版并发 100 Profile 的目标。方案基于 Hybrid Electron BrowserWindow + Playwright CDP 架构，确保完整隔离（崩溃/资源独立）、高并发支持（多 CPU 核心并行）、保留 Playwright 高级 API（Layer 4/5 任务无复杂化）。

**设计原则**：
- **进程隔离**：每个 Profile 一个独立 Electron 子进程，完整隔离（内存/崩溃/资源）
- **端口池管理**：动态端口分配（9200-10200 范围随机），避免冲突
- **单一控制点**：主进程通过 CDP 统一控制所有 Playwright 操作，子进程只暴露 CDP 服务器（避免双客户端冲突）
- **API 保留**：Layer 5 任务在主进程直接使用 Playwright 高级 API（`page.click`、`page.waitForNavigation`），100% 保留，无 raw CDP 复杂化
- **生产级目标**：单机并发 100 Profile（内存 ~10GB，CPU 8+ 核心），稳定可靠
- **厂商级实践**：参考 AdsPower/Multilogin 的 spawn + 端口池 + 主进程统一 CDP 控制方案

**适用场景**：单机版高并发 Profile（10-100+），需要强隔离和稳定性的生产环境。

**版本**：v1.0（2025-01），基于现有 hybrid 架构（Electron BrowserWindow + Playwright CDP）。

---

## 🏗️ 方案概述

### 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     主进程 (Main Electron)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Profile DAO  │  │  端口池管理   │  │ 子进程池管理  │          │
│  │ (SQLite)     │  │ (9200-10200)  │  │ (PID跟踪)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Layer 5 执行引擎 (p-limit 队列)                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ Task 1   │→ │ Task 2   │→ │ Task 3   │→ ...         │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  │       ↓ IPC           ↓ IPC         ↓ IPC                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ CDP (connectOverCDP)
┌─────────────────────────────────────────────────────────────────┐
│              子进程 1 (Profile 1)                                │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ BrowserWindow│  │ CDP Server   │  (只暴露，不连接)          │
│  │ (native)     │  │ (port 9223)   │                            │
│  └──────────────┘  └──────────────┘                            │
│  职责：创建窗口 + 暴露 CDP，不执行 Playwright 操作              │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│              子进程 2 (Profile 2)                                │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ BrowserWindow│  │ CDP Server   │  (只暴露，不连接)          │
│  │ (native)     │  │ (port 9224)   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              ...
┌─────────────────────────────────────────────────────────────────┐
│              子进程 100 (Profile 100)                           │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ BrowserWindow│  │ CDP Server   │  (只暴露，不连接)          │
│  │ (native)     │  │ (port 9300)   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 关键特性

1. **进程隔离**：
   - 每个 Profile 独立 Electron 子进程（`child_process.spawn`）
   - 独立 Chromium 实例、BrowserWindow、CDP 服务器
   - 崩溃隔离：一个 Profile 崩溃不影响其他（生产关键）

2. **端口池管理**：
   - 动态端口范围：9200-10200（100+ 端口，随机分配）
   - 主进程管理端口池（Set 跟踪占用，Map<ProfileId, Port> 映射）
   - 冲突避免：随机选择 + 可用性检查（`net.fetch(port)` 验证）

3. **通信机制**：
   - 主进程 ↔ 子进程：CDP (Chrome DevTools Protocol)
   - 每个子进程开放独立 CDP 端口（9200-10200 范围），**只暴露 CDP 服务器，不连接 Playwright**
   - 主进程通过 `chromium.connectOverCDP(webSocketUrl)` 连接到子进程的 CDP 服务器
   - **单一控制点**：主进程是唯一的 Playwright 客户端，执行所有操作（反检测注入、cookies、导航、Layer 5 任务）
   - Layer 5 任务直接使用 Playwright API（`page.click`、`page.goto` 等），100% 保留，无需额外 IPC 层
   - 状态同步：子进程 stdout 发送 'ready' 信号，主进程监听更新 Zustand

4. **配置传递机制**（优雅方案：预写到 userData 目录）：
   - **主进程职责**：
     - 从缓存/数据库获取完整 Profile 配置（`FullProfileConfig`）
     - 加密序列化后预写到 `{userDataPath}/config.enc`（固定路径）
     - Spawn 子进程时只传递基本参数（profileId, port, userDataPath），无需环境变量
   - **子进程职责**：
     - 从 `join(userDataPath, 'config.enc')` 直接读取并解密配置
     - **不访问数据库或缓存**，完全进程隔离
   - **优势**：
     - ✅ **零额外传递**：利用已有 userDataPath 参数，路径固定，无大小/并发冲突
     - ✅ **简单可靠**：文件持久化到 Profile 目录，随生命周期管理；加密保持安全
     - ✅ **高性能**：I/O <1ms，无序列化开销；符合 Electron 原生机制
     - ✅ **厂商一致**：类似 AdsPower（预写到隔离目录），易扩展（支持热更新）
     - ✅ **进程隔离**：子进程不共享主进程的数据库连接，避免并发冲突

5. **Playwright API 保留**：
   - **子进程职责**：只创建 BrowserWindow + 暴露 CDP 服务器，**不执行任何 Playwright 操作**
   - **主进程职责**：通过 CDP 连接到子进程，获取 context/page 对象，执行所有 Playwright 操作
     - 反检测注入（`applyAntiDetection`）
     - Cookies 注入（`context.addCookies`）
     - 导航（`page.goto`）
     - Layer 5 任务（`page.click`、`page.waitForNavigation` 等）
   - **为什么单一控制点**：避免双客户端连接冲突（CDP 不支持多 Playwright 实例同时附加），确保稳定性和高并发支持
   - Layer 5 任务在主进程直接使用 Playwright 高级 API，无复杂化

---

## 📐 详细设计

### 1. 端口池管理（主进程）

#### 1.1 端口池初始化

**逻辑**：
- 端口范围：9200-10200（100+ 端口，支持 100 Profile）
- 数据结构：`Set<number>` 跟踪可用端口，`Map<string, number>` 映射 ProfileId → Port
- 初始化：填充 Set（9200-10200），清空 Map

**实现位置**：`src/main/modules/profile/portPool.ts`（新文件）

**关键方法**：
- `initializePortPool()`: 初始化端口池（填充 Set）
- `allocatePort(profileId: string): Promise<number>`: 分配端口（随机选择 + 可用性检查）
- `releasePort(profileId: string): void`: 释放端口（Profile 关闭时调用）

#### 1.2 端口分配算法

**流程**：
1. 从可用 Set 随机选择端口（`Math.floor(Math.random() * availablePorts.size)`）
2. 检查端口可用性（`net.fetch(\`http://localhost:${port}/json/version\`)` 验证）
3. 如果可用，从 Set 移除，存入 Map，返回 port
4. 如果不可用（端口被占用），重试（最多 5 次）
5. 如果全部失败，抛出错误（"Port pool exhausted"）

**冲突避免**：
- 随机选择减少冲突概率
- 可用性检查确保端口真正可用
- 重试机制处理临时冲突
- 生产环境：加锁（Mutex）防止并发分配冲突

#### 1.3 端口回收

**触发时机**：
- Profile 关闭（`closeIsolatedProfile`）
- 子进程异常退出（监听 'exit' 事件）
- 主进程清理（app.quit）

**逻辑**：
- 从 Map 获取 port
- 从 Map 移除 ProfileId
- 将 port 回收到 Set（可用端口池）

---

### 2. Spawn 子进程（主进程，Layer 3）

#### 2.1 启动流程

**函数**：`launchIsolatedProfile(profileId: string): Promise<LaunchResult>`

**步骤**：
1. **获取配置**：`getConfig(profileId)` → fingerprint, proxy, cookies, userDataPath
2. **分配端口**：`allocatePort(profileId)` → port (e.g., 9223)
3. **Spawn 子进程**：
   ```typescript
   const child = spawn('electron', [
     'src/main/modules/profile/profileChild.js',
     profileId,
     port.toString(),
     userDataPath
   ], {
     stdio: 'pipe',  // 捕获日志
     env: { ...process.env, PROFILE_ID: profileId }
   });
   ```
4. **监听子进程事件**：
   - `'stdout'`: 监听 'ready' 信号（子进程通过 stdout 发送）
   - `'exit'`: 子进程退出（kill + releasePort + update status 'stopped'）
   - `'error'`: spawn 失败（status 'failed', releasePort）
5. **等待子进程 ready**：监听 stdout 'READY' 消息
6. **通过 CDP 连接到子进程**：获取 Playwright context/page 对象
7. **执行所有 Playwright 操作**（主进程统一控制）：
   - 反检测注入（`applyAntiDetection`）
   - Cookies 注入（`context.addCookies`）
   - 导航（`page.goto`）
   - 全局 initScript（`context.addInitScript`）
8. **返回 LaunchResult**：{ profileId, childProcess, port, context, page, cleanup }

**实现位置**：`src/main/modules/profile/window.ts`（修改现有函数）

#### 2.2 子进程配置

**参数传递**（argv）：
- `argv[0]`: 'electron' (可执行文件)
- `argv[1]`: 'src/main/modules/profile/profileChild.js' (entry script)
- `argv[2]`: profileId (string)
- `argv[3]`: port (string, e.g., "9223")
- `argv[4]`: userDataPath (string, optional)

**环境变量**：
- `PROFILE_ID`: profileId（子进程内使用）
- `CDP_PORT`: port（子进程内使用）

#### 2.3 错误处理

**Spawn 失败**：
- 原因：内存不足、OS 进程限制（ulimit -u）
- 处理：status 'failed', releasePort, 日志记录
- 用户反馈：Zustand status 更新，UI 显示错误

**子进程异常退出**：
- 监听 'exit' 事件（code !== 0）
- 处理：releasePort, status 'stopped', 清理资源
- 监控：Layer 1 记录 PID/exit code

---

### 3. 子进程实现（profileChild.js，Per Profile）

#### 3.1 Entry Script

**文件位置**：`src/main/modules/profile/profileChild.ts`（新文件）

**启动流程**：
1. **解析参数**：
   ```typescript
   const profileId = process.argv[2];
   const port = parseInt(process.argv[3], 10);
   const userDataPath = process.argv[4] || join(app.getPath('userData'), 'profiles', profileId);
   ```

2. **启用 CDP 服务器**：
   ```typescript
   app.commandLine.appendSwitch('remote-debugging-port', port.toString());
   ```

3. **创建 BrowserWindow**：
   ```typescript
   const window = new BrowserWindow({
     x: targetX, y: targetY, width: targetWidth, height: targetHeight,
     show: false,
     webPreferences: {
       partition: `persist:${profileId}`,  // 隔离 session
       contextIsolation: true,
     }
   });
   ```

4. **配置代理/UA**：
   ```typescript
   if (proxy) {
     window.webContents.session.setProxy({ proxyRules: ... });
   }
   window.webContents.setUserAgent(fingerprint.userAgent);
   ```

5. **加载页面**：
   ```typescript
   await window.loadURL('about:blank');
   window.show();
   ```

6. **发送 ready 信号**（通过 stdout，主进程监听）：
   ```typescript
   console.log(`[ProfileChild ${profileId}] READY`);
   ```

**关键**：子进程**不**执行以下操作（这些由主进程通过 CDP 执行）：
- ❌ 不连接 Playwright（`connectOverCDP`）
- ❌ 不注入反检测（`applyAntiDetection`）
- ❌ 不注入 Cookies（`context.addCookies`）
- ❌ 不导航（`page.goto`）
- ❌ 不处理 Layer 5 任务

**为什么**：避免双客户端连接冲突，确保单一控制点（主进程统一管理所有 Playwright 操作）。

#### 3.2 关闭流程

**触发**：主进程 kill 子进程（SIGTERM）

**步骤**：
1. 监听窗口关闭事件：
   ```typescript
   browserWindow.on('closed', () => {
     app.quit();
   });
   ```
2. 主进程 kill 子进程后，子进程自动退出
3. 主进程收到 'exit' 事件，清理资源（端口释放、状态更新）

**注意**：子进程不处理任何任务，所有操作由主进程通过 CDP 执行。

---

### 4. Layer 5 集成（主进程，执行引擎）

#### 4.1 队列设计

**数据结构**：
- 主队列：`p-limit` (concurrency = CPU cores * 2, e.g., 16 for 8-core)
- 任务格式：`{ profileId: string, action: 'click' | 'type' | ..., params: {...} }`
- 结果格式：`{ success: boolean, error?: string, result?: any }`

**实现位置**：`src/main/services/execution.ts`（修改现有文件）

#### 4.2 任务执行

**流程**：
1. Layer 5 队列添加任务（`queue.add(async () => { ... })`）
2. 获取 LaunchResult（`getActiveContext(profileId)` from Map）
3. **直接使用 Playwright API**（主进程通过 CDP 连接执行）：
   ```typescript
   const result = await getActiveContext(profileId);
   await result.page.click('#button');
   await result.page.waitForNavigation({ waitUntil: 'networkidle' });
   ```
4. 返回结果（success/error）

**并发控制**：
- p-limit 限制主队列并发（16 tasks）
- 每个 Profile 的 page 对象在主进程，直接执行（无 IPC 延迟）
- 100 Profile 并发：主队列 100 tasks，p-limit 限 16 同时执行，其余排队

#### 4.3 API 保留

**关键**：主进程直接使用 Playwright 高级 API，100% 保留

**示例**（主进程内）：
```typescript
// 高级 API（保留，直接在主进程执行）
const launchResult = getActiveContext(profileId);
await launchResult.page.click('#button');
await launchResult.page.waitForNavigation({ waitUntil: 'networkidle' });
await launchResult.page.type('#input', 'text');
```

**优势**：
- 无 IPC 延迟（~10ms）→ 直接执行（<1ms）
- 无序列化开销（params/result 直接传递）
- 100% Playwright API（高级等待、重试、trace 等）

#### 4.4 失败隔离

**重试机制**：
- 任务失败（Playwright error）→ 重试 3 次（exponential backoff）
- 子进程崩溃（'exit' event）→ 不重试，status 'failed'，用户手动重启
- CDP 连接断开 → 自动重连（`connectOverCDP` retry）

**监控**：
- Layer 1 记录任务失败率（>20% 警报）
- Layer 6 重试策略（YAML 配置）

---

### 5. 关闭/清理（原子操作）

#### 5.1 关闭流程

**函数**：`closeIsolatedProfile(profileId: string): Promise<void>`

**步骤**：
1. 获取子进程（from Map）
2. 关闭 Playwright 连接（`context.close()`）
3. Kill 子进程（`child.kill('SIGTERM')`，优雅关闭）
4. 等待子进程 'exit' 事件（timeout 5s）
5. 如果超时，force kill（`child.kill('SIGKILL')`）
6. releasePort（从端口池回收）
7. db.transaction 更新 status 'stopped'
8. 从 Map 移除子进程

**原子性**：
- db.transaction 确保状态一致性
- 资源清理（端口/内存）在事务外（避免阻塞）

#### 5.2 资源清理

**子进程退出时**：
- 端口自动释放（主进程监听 'exit' 事件）
- 内存自动回收（OS 进程管理）
- CDP 连接自动关闭（Playwright context.close）

**主进程清理**：
- app.quit 时遍历所有子进程，发送 'close' 消息
- 等待所有子进程退出（Promise.all）
- 清理端口池（Set.clear, Map.clear）

---

## 📊 性能指标（100 Profile）

### 资源占用

**内存**：
- 每个子进程：~80-100MB（轻量 Chromium flags: `--no-sandbox`, `--disable-gpu`）
- 100 Profile 总计：~8-10GB
- 优化后（禁用 GPU/沙箱）：~6-8GB

**CPU**：
- Idle 状态：~5% (100 进程，大部分 idle)
- 任务执行：峰值 50% (并行点击/导航，8 核心并行)
- 并发控制：p-limit 限 16 tasks，避免 CPU 过载

**启动时间**：
- 单个 Profile：~300-500ms (spawn + BrowserWindow + CDP 连接)
- 100 Profile 并行启动：~30s (批量 spawn 10/批，避免 OS 限制)
- 优化：Lazy spawn（首次任务时创建，idle 5min 回收）

### 并发能力

**Layer 5 队列**：
- 主队列容量：无限制（内存队列，FIFO）
- 并发执行：16 tasks (p-limit = CPU cores * 2)
- 100 Profile 并发：每个 Profile 1 task，总 100 tasks，p-limit 限 16 同时执行

**IPC 延迟**：
- 单次 IPC 通信：~10-20ms (Electron IPC 本地通信)
- 任务执行（page.click）：~100-500ms (取决于网络/页面复杂度)
- 总延迟：~110-520ms per task

### 监控指标

**Layer 1 监控**（SQLite + process.hrtime）：
- PID 跟踪（Map<ProfileId, PID>）
- 端口占用率（Set.size / 100）
- 内存使用（process.memoryUsage per 子进程）
- 任务失败率（>20% 警报）

---

## 🔄 厂商实践对比

### AdsPower

**方案**：
- Per Profile spawn（独立进程 + 端口池，随机 9000-10000）
- 主进程 IPC 任务分发
- Raw CDP 执行（`webContents.debugger.sendCommand`）

**优势**：
- 强隔离（崩溃不影响其他）
- 高并发（200+ Profile 单机）

**劣势**：
- Raw CDP 复杂（失去高级 API）

**你的优势**：
- Playwright API + 端口池 = 厂商隔离 + 高级便利

### Multilogin

**方案**：
- 混合：低并发共享实例，高并发 spawn 子进程
- CDP 共享/独立根据负载
- Layer 5 自定义队列（主进程直接使用 CDP，无 IPC）

**优势**：
- 灵活（根据负载切换）
- 生产级（Docker 容器封装）

**你的匹配**：
- 类似架构，但用 Playwright 增强（API 保留）

---

## ⚠️ 实施注意事项

### 依赖

- `child_process` (Node.js built-in)
- `net` (Node.js built-in, 端口检查)
- `playwright-core` (CDP 连接)

### 测试步骤

1. **单 Profile 测试**：
   - Spawn 子进程，验证端口分配
   - 验证 CDP 连接（`connectOverCDP`）
   - 验证 CDP 连接（主进程 `connectOverCDP` 成功）
   - 验证 Playwright API（主进程 `page.click` 执行成功）

2. **多 Profile 测试**（5 Profile 并发）：
   - 验证端口无冲突
   - 验证 CDP 连接（主进程成功连接所有子进程）
   - 验证资源占用（内存 <500MB）
   - 验证 Playwright API（主进程 `page.click` 在所有 Profile 上执行成功）

3. **Layer 5 集成测试**：
   - 队列分发任务到子进程
   - 验证 Playwright API（`page.click` 在子进程内工作）
   - 验证失败隔离（子进程崩溃不影响其他）

### 风险与缓解

**风险 1：Spawn 失败（OS 进程限制）**
- 原因：`ulimit -u` 限制（macOS 默认 256）
- 缓解：检查 OS 限制，提示用户调整（`ulimit -u 10000`）
- 监控：Layer 1 记录 spawn 失败率

**风险 2：端口冲突（多实例）**
- 原因：多个 Electron 实例同时运行
- 缓解：随机端口 + 可用性检查 + 重试
- 监控：端口占用率 >80% 警报

**风险 3：IPC 丢失（子进程崩溃）**
- 原因：子进程异常退出，主进程未收到 'exit' 事件
- 缓解：心跳机制（ping/pong，5s 超时 kill）
- 监控：Layer 1 记录 IPC 失败率

---

## 📝 实施计划

### Phase 1: 端口池管理（1-2 天）
- 创建 `portPool.ts`
- 实现 `allocatePort`/`releasePort`
- 测试端口分配/回收

### Phase 2: 子进程 Spawn（2-3 天）
- 创建 `profileChild.ts`
- 修改 `window.ts` (spawn 逻辑)
- 测试单 Profile 启动/关闭

### Phase 3: CDP 连接与 Playwright 操作（2-3 天）
- 主进程通过 CDP 连接到子进程
- 主进程执行所有 Playwright 操作（反检测注入、cookies、导航）
- 测试 CDP 连接和 Playwright API

### Phase 4: Layer 5 集成（2-3 天）
- 修改 `execution.ts` (队列分发)
- 测试多 Profile 并发任务
- 验证 Playwright API 保留

### Phase 5: 优化与监控（1-2 天）
- 性能优化（内存/CPU）
- Layer 1 监控集成
- 文档更新

**总计**：7-12 天（MVP 版本）

---

## 📚 相关文档

- [7层自动化体系架构](./automation-architecture.md)
- [预渲染实现细节](./pre-render-implementation.md)

---

**最后更新**：2025-01-XX  
**维护者**：VeilBrowser Team

