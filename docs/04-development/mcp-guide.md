# VeilBrowser MCP 服务使用指南

> **版本**: v1.0 (Phase 2 Completed)
> **最后更新**: 2026-02-04
> **服务端口**: 11991 (固定)

VeilBrowser 提供了一套符合 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 标准的接口，允许 AI Agent 直接控制指纹浏览器进行各种自动化操作。

## 🔌 连接方式

- **Endpoint**: `http://127.0.0.1:11991/mcp`
- **Method**: `POST`
- **Content-Type**: `application/json`

### 基础请求格式 (JSON-RPC 2.0)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "工具名称",
    "arguments": {
      "参数名": "参数值"
    }
  }
}
```

---

## 🛠️ 核心工具列表

### 1. 生命周期管理 (Lifecycle)

| 工具名           | 描述       | 关键参数           |
| :--------------- | :--------- | :----------------- |
| `start_browser`  | 启动浏览器 | `profileId` (必填) |
| `close_browser`  | 关闭浏览器 | `profileId` (必填) |
| `create_profile` | 创建新环境 | `name`, `proxy`    |
| `list_profiles`  | 列出环境   | `page`, `limit`    |

### 2. 页面导航 (Navigation)

| 工具名         | 描述     | 关键参数     |
| :------------- | :------- | :----------- |
| `navigate_to`  | 打开网址 | `url` (必填) |
| `refresh_page` | 刷新页面 | -            |
| `go_back`      | 后退     | -            |

### 3. 页面感知 (Perception) - ✨ Phase 2 增强

| 工具名              | 描述         | 关键参数                                      |
| :------------------ | :----------- | :-------------------------------------------- |
| `get_page_snapshot` | 获取页面结构 | `format`: "interactable-only" (推荐) / "full" |

**返回数据示例 (Interactable-Only)**:

```json
{
  "url": "https://twitter.com/home",
  "title": "Home / X",
  "elements": [
    {
      "ref": "ref_001",
      "role": "textbox",
      "name": "Post text",
      "selector": ".public-DraftEditor-content"
    },
    {
      "ref": "ref_002",
      "role": "button",
      "name": "Post",
      "selector": "[data-testid='tweetButtonInline']"
    }
  ]
}
```

> **💡 Ref 机制**: `ref` ID (如 `ref_001`) 是当前页面的临时唯一标识。建议在后续交互中优先通过 `selector` 操作，或在 Agent 内部维护 ref 到 selector 的映射。

### 4. 高级交互 (Interaction)

| 工具名            | 描述     | 关键参数                            |
| :---------------- | :------- | :---------------------------------- |
| `click_element`   | 点击元素 | `selector` (CSS选择器)              |
| `type_text`       | 输入文本 | `selector`, `text`                  |
| `hover_element`   | 悬停     | `selector`                          |
| `press_key`       | 按键     | `key` (如 "Enter", "Control+C")     |
| `scroll_page`     | 滚动     | `direction` ("down"/"up"), `amount` |
| `evaluate_script` | 执行JS   | `script` (代码字符串)               |

---

## 📱 实战场景：推特养号 (Twitter Nurture)

本章节展示如何组合使用 MCP 工具完成复杂的业务流程。

### 步骤 1: 启动与登录检查

调用 `start_browser` 启动环境。通常浏览器会恢复上一次的 Session（Cookies）。
调用 `get_page_snapshot` 检查当前页面是否为登录态。

### 步骤 2: 浏览与互动

**场景**: "向下滚动浏览，给第一条推文点赞"

1. **滚动**:

   ```json
   {
     "name": "scroll_page",
     "arguments": { "profileId": "...", "direction": "down", "amount": 500 }
   }
   ```

2. **感知**:
   调用 `get_page_snapshot`。AI 分析返回的 `elements`，找到“点赞”按钮。
   假设找到: `{"role": "button", "name": "Like", "selector": "[data-testid='like']"}`

3. **交互**:
   ```json
   {
     "name": "click_element",
     "arguments": { "profileId": "...", "selector": "[data-testid='like']" }
   }
   ```

### 步骤 3: 发布推文

**场景**: "发布一条内容为 'Hello World' 的推文"

1. **定位输入框**:
   通过 `get_page_snapshot` 找到输入框: `{"role": "textbox", "selector": ".public-DraftEditor-content"}`

2. **输入内容**:

   ```json
   {
     "name": "type_text",
     "arguments": {
       "profileId": "...",
       "selector": ".public-DraftEditor-content",
       "text": "Hello World"
     }
   }
   ```

3. **点击发送**:
   找到发送按钮 `[data-testid='tweetButtonInline']` 并点击。

---

## ❓ 常见问题 (FAQ)

### Q: `evaluate_script` 报错 "Illegal return statement"

**A**: Playwright 的 `evaluate` 期望脚本是一个**函数体**或**表达式**。

- ❌ 错误: `return document.title;` (不能直接在全局作用域 return)
- ✅ 正确: `document.title` (表达式自动返回结果)
- ✅ 正确: `(() => { return document.title; })()` (IIFE)

### Q: 如何处理动态变化的 CSS Class?

**A**: Twitter 等现代前端框架(React/Vue)常生成随机 Class (如 `css-1dbjc4n`)。
**VeilBrowser 解决方案**: `get_page_snapshot` 生成的 **Accessibility Tree** 信息（role, name）不受 CSS Class 变化影响。推荐 AI Agent 结合 `role` 和 `name` 属性来定位元素，或者请求 snapshot 时关注系统生成的稳定 `selector` 建议。
