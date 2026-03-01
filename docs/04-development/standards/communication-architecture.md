# 通信架构规范 (Communication Architecture)

VeilBrowser 采用分层通信架构，明确不同层级和组件之间的通信方式，确保系统解耦、可维护且高性能。

## 1. 核心通信支柱

系统包含三大核心通信支柱，分别解决不同场景的通信需求：

| 组件             | 英文名          | 职责范围                                 | 典型场景                        |
| :--------------- | :-------------- | :--------------------------------------- | :------------------------------ |
| **应用事件总线** | **AppEventBus** | 主进程内部解耦 (Main <-> Main)           | Profile生命周期事件触发业务逻辑 |
| **事件桥接器**   | **EventBridge** | 主进程推送到渲染进程 (Main -> Renderer)  | Profile状态变更同步到UI         |
| **信使系统**     | **Messenger**   | 主进程与Worker进程通信 (Main <-> Worker) | 发送指纹配置、接收Worker日志    |

## 2. 详细规范

### 2.1 AppEventBus (内部总线)

- **位置**: `src/main/infra/event-bus/app-event-bus.ts`
- **原则**: 仅用于主进程内部模块间的解耦。模块 A 发出事件，模块 B、C 监听。
- **使用方式**:

  ```typescript
  import { appEventBus } from "@main/infra/event-bus/app-event-bus";

  // 发送事件 (必须使用统一 BaseEvent 格式)
  appEventBus.emitEvent({
    type: "profile:started",
    profileId: "123",
    timestamp: Date.now(),
  });
  ```

### 2.2 EventBridge (UI同步)

- **位置**: `src/main/infra/event-bridge/event-bridge.ts`
- **原则**: 自动监听 AppEventBus，将**白名单内**的事件转发给 UI。无需在业务代码中手动发送 IPC。
- **白名单**: 目前支持 `profile:*`, `workflow:*`, `job:*`, `task:*`, `action:*`, `browser:*`, `proxy:*`, `license:*` 等前缀。
- **前端接收**:
  ```typescript
  window.electron.on("ipc:event", (event) => {
    if (event.type === "profile:started") {
      console.log("Profile started:", event.profileId);
    }
  });
  ```

### 2.3 Messenger (跨进程RPC)

- **位置**: `src/main/infra/messenger/index.ts`
- **原则**: 也就是 `WorkerProcess` 与主进程的通信通道。支持请求-响应(RPC)和单向消息。
- **规范**: 严禁 Worker 直接调用 Electron API，必须通过 Messenger 通信。

## 3. 架构图

```mermaid
graph TD
    subgraph Main Process
        A[业务模块 (Profile/Job)] -->|emit| B(AppEventBus)
        B -->|subscribe| C[其它业务模块]
        B -->|subscribe| D[EventBridge]
        D -->|IPC: ipc:event| E[Renderer Process]
    end

    subgraph Worker Process
        F[Browser/Puppeteer] <-->|Messenger| A
    end
```

## 4. 最佳实践

1.  **不要在 IPC Handler 中直接写业务逻辑**：IPC Handler 应该调用 Service，Service 处理完后发出 Event，EventBridge 自动通知 UI。
2.  **事件命名规范**：遵循 `domain:action` (如 `profile:created`)，并在 `src/shared/events/constants.ts` 中统一定义。
3.  **单向数据流**：状态变更由后端驱动，前端只负责渲染状态。
