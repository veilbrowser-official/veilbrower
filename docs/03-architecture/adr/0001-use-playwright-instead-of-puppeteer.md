# ADR 0001: 使用 Playwright 替代 Puppeteer

## 状态

已接受

## 背景

VeilBrowser 需要控制多个 Chromium 实例，每个 Profile 对应一个独立的浏览器实例。在选择浏览器自动化框架时，我们评估了 Puppeteer 和 Playwright。

## 决策

我们选择 **Playwright** 作为浏览器自动化框架，而不是 Puppeteer。

## 理由

### 1. 更好的多浏览器支持

- **Playwright** 原生支持 Chromium、Firefox、WebKit 三种浏览器引擎
- **Puppeteer** 仅支持 Chromium
- 虽然 VeilBrowser 当前只使用 Chromium，但未来可能需要支持其他浏览器引擎

### 2. 更强大的 CDP 支持

- **Playwright** 提供了更完善的 CDP（Chrome DevTools Protocol）封装
- 支持更高级的 CDP 功能，如指纹注入、热更新等
- **Puppeteer** 的 CDP 支持相对有限

### 3. 更好的进程隔离

- **Playwright** 的 `launchPersistentContext` 提供了更好的进程隔离
- 每个 Profile 可以完全独立运行，互不干扰
- **Puppeteer** 的进程隔离相对较弱

### 4. 更活跃的社区和更新

- **Playwright** 由 Microsoft 维护，更新频率高
- 社区活跃，问题响应快
- **Puppeteer** 由 Google 维护，但更新频率相对较低

### 5. 更好的错误处理

- **Playwright** 提供了更详细的错误信息和堆栈跟踪
- 支持重试机制和超时控制
- **Puppeteer** 的错误处理相对简单

### 6. 更好的文档和示例

- **Playwright** 的文档更完善，示例更丰富
- 中文文档支持更好
- **Puppeteer** 的文档相对较少

## 后果

### 正面影响

- ✅ 更好的多浏览器支持（未来扩展）
- ✅ 更强大的 CDP 功能（指纹注入、热更新）
- ✅ 更好的进程隔离（每个 Profile 独立运行）
- ✅ 更活跃的社区和更新（问题响应快）

### 负面影响

- ⚠️ 包体积稍大（但可接受）
- ⚠️ 学习曲线稍陡（但文档完善）

### 风险

- **低风险**：Playwright 是成熟稳定的框架，被广泛使用
- **缓解措施**：充分测试，确保兼容性

## 替代方案

### 方案 A：使用 Puppeteer

**优点**：
- 包体积更小
- 社区更成熟（但更新频率较低）

**缺点**：
- 仅支持 Chromium
- CDP 支持有限
- 进程隔离较弱

### 方案 B：使用 Selenium

**优点**：
- 支持多种浏览器
- 社区成熟

**缺点**：
- 性能较差
- 配置复杂
- 不适合 Electron 应用

## 实施

- ✅ 已集成 Playwright（`package.json`）
- ✅ 已实现 `playwrightRunner.ts`
- ✅ 已实现 CDP 注入和热更新
- ✅ 已实现进程隔离

## 参考

- [Playwright 官方文档](https://playwright.dev)
- [Puppeteer 官方文档](https://pptr.dev)
- [子进程自治 CDP 方案](../subprocess-autonomous-cdp-design.md)

---

**创建日期**: 2025-01-XX  
**最后更新**: 2025-01-XX  
**决策者**: VeilBrowser Team

