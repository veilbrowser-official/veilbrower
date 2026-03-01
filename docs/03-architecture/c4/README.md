# C4 架构模型 (C4 Architecture Model)

本目录包含 VeilBrowser 系统的 C4 架构视图。

## System Context (Level 1)

展示 VeilBrowser 与外部系统的交互关系。

```mermaid
C4Context
    title System Context Diagram for VeilBrowser

    Person(user, "User", "运营人员或自动化开发者")
    System(veilbrowser, "VeilBrowser", "指纹浏览器客户端")
    
    System_Ext(license_server, "License Server", "授权验证服务")
    System_Ext(target_site, "Target Website", "TikTok, Amazon, etc.")
    System_Ext(proxy_provider, "Proxy Provider", "代理 IP 服务商")
    System_Ext(rpa_tool, "RPA Tool", "外部 RPA 工具 (如影刀)")

    Rel(user, veilbrowser, "配置环境 / 编排工作流")
    Rel(veilbrowser, license_server, "验证许可证 / 更新检查", "HTTPS")
    Rel(veilbrowser, target_site, "访问 / 交互", "HTTP/HTTPS")
    Rel(veilbrowser, proxy_provider, "获取代理 IP", "API")
    Rel(rpa_tool, veilbrowser, "控制浏览器", "Native Messaging / WebSocket")
```

## Container Diagram (Level 2)

展示 VeilBrowser 内部的高层容器结构。

```mermaid
C4Container
    title Container Diagram for VeilBrowser

    Person(user, "User", "用户")

    System_Boundary(c1, "VeilBrowser Desktop App") {
        Container(main_process, "Main Process", "Electron/Node.js", "负责应用生命周期、IPC通信、数据持久化、代理管理")
        Container(renderer, "Renderer UI", "React/Vite", "用户界面：Profile管理、工作流编辑器")
        ContainerDb(sqlite, "Local Database", "SQLite", "存储 Profile 配置、工作流数据、Cookie")
        Container(browser_worker, "Browser Worker", "Electron Child Process", "独立的浏览器控制进程，负责具体 Profile 的运行与指纹注入")
    }

    Rel(user, renderer, "交互")
    Rel(renderer, main_process, "发送指令 (IPC)", "Electron IPC")
    Rel(main_process, sqlite, "读写数据", "Better-SQLite3")
    Rel(main_process, browser_worker, "启动/监控", "Node.js spawn / Stdio")
    Rel(browser_worker, target_site, "访问网络", "Chromium Network")
```

> **注意**: 更详细的组件图 (Component Diagram) 请参考 [05-layers/](../05-layers/) 下各层的详细设计文档。
