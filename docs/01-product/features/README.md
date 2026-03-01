# 产品功能特性 (Features)

VeilBrowser 专为高强度自动化场景设计，核心功能围绕**防关联**、**自动化**与**高效协作**展开。

## 🛡️ 浏览器指纹保护 (Fingerprint Protection)

VeilBrowser 提供能够通过各类检测（Pixelscan, BrowserLeaks, CreepJS）的真实浏览器环境。

*   **内核级隔离**: 基于 Chromium 深度定制，每个 Profile 拥有独立的进程和存储空间。
*   **全方位指纹注入**:
    *   **Canvas/WebGL**: 硬件加速指纹噪音注入，非简单屏蔽。
    *   **AudioContext**: 音频指纹随机化。
    *   **WebRTC**: 局域网 IP 隐藏与公网 IP 替换。
    *   **Fonts/Rects**: 字体列表枚举与 DOM 矩形混淆。
    *   **Hardware**: CPU 核心数、内存大小、显卡型号自定义。
*   **真实数据模拟**: 提供基于真实设备采样的 UserAgent 和屏幕分辨率库。

## 🤖 自动化工作流 (Workflow Automation)

内置强大的可视化工作流引擎，无需编写代码即可实现复杂业务逻辑。

*   **可视化编辑器**: 拖拽式节点编排（打开网页、点击、输入、滚动、截图）。
*   **智能节点**:
    *   **验证码识别**: 集成主流打码平台接口。
    *   **元素定位**: 支持 XPath, CSS Selector 及 AI 语义定位（Preview）。
    *   **逻辑控制**: 循环、判断、延时、随机等待。
*   **任务调度中心**:
    *   支持 Excel 数据导入批量生成任务。
    *   多线程并发执行（取决于机器性能）。
    *   实时日志与执行结果截图。

## 🌐 网络与代理管理 (Network Management)

*   **协议支持**: HTTP, HTTPS, SOCKS4, SOCKS5。
*   **动态 IP 轮换**: 支持通过 API 自动提取代理 IP。
*   **网络环境检查**: 启动前自动检测代理连通性、IP 地理位置及黑名单状态。
*   **WebRTC 策略**: 自动跟随代理 IP 设置 WebRTC 行为。

## 👥 团队协作 (Team Collaboration)

*   **Profile 分享**: 一键将环境配置及 Cookie/LocalStorage 数据分享给团队成员。
*   **权限管理**: 细粒度的角色控制（管理员、操作员、观察者）。
*   **云端同步**: 实时同步环境数据，支持断点续传。

## 🔌 API 与扩展性 (Extensibility)

*   **Local API**: 提供 RESTful 接口控制浏览器启动/关闭、Profile 增删改查。
*   **Puppeteer/Playwright 支持**: 兼容主流自动化框架，可直接连接调试端口进行控制。
*   **插件系统**: 支持加载 Chrome 原生扩展（.crx），并支持特定于 Profile 的扩展数据隔离。
