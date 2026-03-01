# 安全铁律 (Security Guidelines)

## 🔥 2025 年指纹浏览器「生死守则」—— 必须 100% 遵守

### ⚠️ 核心铁律

```text
2025 年指纹浏览器安全铁律：
「不留全局标记、不用 binding、不用 console、不用自定义协议、L4 必须 context.addInitScript、结果必须 sendBeacon」
→ 任何一条违反，账号活不过 30 天。
```

---

### 1. 全局标记 & 污染类（一票否决，死得最快）

#### ❌ 禁止在 window 上留下任何以下关键字（大小写不限，正则匹配）：
- `__veil` `__adspower` `__multilogin` `__octo` `__nst` `__gologin` `__kameleo` `__incogniton`
- `__inject` `__stealth` `__fingerprint` `__anti` `__detect` `__bot` `__automation`
- `__playwright` `__puppeteer` `__selenium` `__webdriver`

#### ❌ 禁止使用固定函数名/变量名（如 `veilInjected`、`applyStealth`）
- ✅ **必须每次启动随机化**：`Math.random().toString(36)`

#### ❌ 禁止执行完后不自毁
- ✅ **所有 IIFE 必须在最后 delete 自身或用 Symbol + 立即清理**

#### ❌ 禁止使用 `Symbol.for('xxx')` 可被 `Symbol.keyFor` 枚举
- ✅ **只能用不可描述的 `Symbol()`，不用 `for`**

---

### 2. L4 反检测注入方式（唯一活路）

#### ✅ 必须 100% 使用 `browserContext.addInitScript` 注入完整 L4 脚本
- ❌ **不能依赖 `context.on('page')`**（会漏新 tab/popup）

#### ✅ `addInitScript` 必须在任何页面创建前调用（context 创建后立即注入）

#### ❌ 禁止在 `page.evaluate` 里分段注入 L4（时机错必死）

#### ✅ 允许结合 `routing` + `request/response` 伪装头（推荐）

---

### 2.5. 注入脚本生成原则（编译时 vs 运行时，必须遵守）

#### ⚠️ 核心原则

```text
2025 年注入脚本生成铁律：
「生成时评估，运行时零依赖」—— 所有条件判断必须在脚本生成时完成，生成的 JavaScript 代码必须是纯运行时逻辑
→ 任何违反将导致运行时 ReferenceError，脚本注入失败。
```

#### ✅ 生成时评估原则（必须遵守）

**核心思想**：条件判断在脚本生成时完成，生成的代码只包含必要的逻辑，零运行时依赖外部变量。

**✅ 正确做法（推荐）**：
```typescript
// ✅ 生成时评估：条件判断在模板字符串插值中完成
return `
  ${fingerprint.connectionDownlink !== undefined ? `
    Object.defineProperty(connection, 'downlink', {
      get: () => ${fingerprint.connectionDownlink},
      configurable: true
    });
  ` : ''}
  
  ${fingerprint.localStorage !== false ? `
    // localStorage 实现代码
    window.localStorage = { /* ... */ };
  ` : ''}
`;
```

#### ❌ 禁止做法（运行时依赖）

**❌ 错误示例：运行时条件检查**
```typescript
// ❌ 错误：运行时直接引用 fingerprint 变量（不存在）
return `
  if (fingerprint.connectionDownlink !== undefined) {  // ❌ ReferenceError!
    // ...
  }
`;
```

**原则 1：生成时决策，运行时零条件**
- ✅ 所有条件判断在模板字符串插值中完成（`${condition ? code : ''}`）
- ✅ 生成的 JavaScript 只包含必要的代码，无冗余条件判断
- ✅ 所有变量值在生成时插值，运行时直接使用字面量

---

### 3. 验证结果推送方式（从高到低排序，低于 Beacon 的一律死）

#### ✅ 第1位：`navigator.sendBeacon` → `127.0.0.1` 本地 API（2025 唯一王道）

#### ✅ 第2位：`new Image().src = localhost` 像素追踪（双保险）

#### ✅ 第3位：WebSocket（`ws://127.0.0.1`）（可接受，但不能长连）

#### ❌ 禁止：`page.exposeBinding`（被抓 100%）

#### ❌ 禁止：`page.on('console')` + `console.log` 前缀（被抓 99%）

#### ❌ 禁止：`postMessage` + CDP 监听（被抓 90%）

---

### 4. 内部页面协议 & 来源（一票否决）

#### ❌ 禁止使用任何自定义协议：
- `app://` `veil://` `mybrowser://` `custom://` → 全死

#### ✅ 允许且推荐：
- `http://127.0.0.1:3xxxx`（主 UI）
- `http://127.0.0.1:4xxxx`（检测专用，隔离！）

#### ✅ ProfilePanel 和 CreepJS/PixelScan 必须物理隔离不同端口
- ❌ **同端口 = 迟早被关联特征**

---

### 5. 其他必死行为（2025 已武器化检测）

#### ❌ 禁止在任何页面留下以下痕迹：
- `window.outerWidth === 0` 或 `window.outerHeight === 0`
- `navigator.permissions` 查询异常
- `navigator.plugins` 长度为 0 但有 Chrome PDF Plugin
- `navigator.languages` 是只读但被修改过（报错）
- `SpeechSynthesis.getVoices()` 同步返回（headless 特征）

#### ❌ 禁止在生产环境打开 DevTools（除非用户手动）
- ❌ **自动打开 = 100% 被 Cloudflare/TikTok 识别**

#### ❌ 禁止使用 `data:text/html` 当验证页面（localStorage 不可用）
- ✅ **必须用 `127.0.0.1` 或 `about:blank` + `evaluate` 注入**

---

### 6. 推荐的终极安全实践（顶级厂商标配）

#### ✅ 所有注入脚本用 IIFE + 随机函数名 + 执行后立即自毁

#### ✅ 所有本地服务器端口启动时随机（使用高位端口：ProfilePanel 49152-50000，CDP 9200-10200，其他服务 50001-53000）

#### ✅ 所有关键 API 加双保险（Beacon + Image fallback）

#### ✅ 验证页面全部脱敏（去掉 CreepJS、trustScore、fingerprint 字样）

#### ✅ 检测页面与主 UI 必须双服务器隔离

#### ✅ 后台静默验证用隐形 `about:blank` Tab（不影响用户）

---

## 🤖 2025 年 RPA 自动化阶段安全铁律

### ⚠️ RPA 核心铁律（置顶，任何一条违反，账号/系统活不过 30 天）

```text
2025 年 RPA 自动化安全铁律：
「必须用 Playwright 原生 API、每个 Tab 执行前补 L4、custom 脚本必须验证+包装+自毁、注入失败必须回滚、失败率 >5% 自动切换」
→ 任何一条违反，账号/系统存活率 <30 天。
```

---

### 7. L5b 执行机制 & RPA 注入（核心层）

#### ✅ 必须用 Playwright 原生 API 执行动作
- ❌ **禁止**：`evaluate(() => click())` 等浏览器内模拟点击

#### ✅ 必须在每个 RPA Tab 执行前，再补一次 L4 反检测（双保险）
- ✅ **多注不死，漏注必死**：Context 级别 + 页面级双重注入

#### ✅ 包装 custom action 脚本：IIFE + 随机名 + 自毁
- ✅ **验证脚本**：拒绝危险关键词（`__veil`, `__inject` 等）
- ✅ **随机函数名**：`Math.random().toString(36)` 生成随机 ID
- ✅ **执行后自毁**：清理所有临时属性和全局变量

#### ✅ 增强滚动降级路径：即使仿真失败，也用随机延迟 + 分段滚动
- ✅ **随机延迟**：10-50ms 延迟，模拟真实滚动速度
- ✅ **分段滚动**：5-10 步分段，避免单次 `window.scrollTo()` 被检测

---

### 8. 注入验证 & 回滚机制（增强层）

#### ⚠️ 添加注入验证：在 `executeActionsInPage` 后，随机采样检查
- ✅ **需要实现**：检查 `navigator.webdriver === undefined`、`window.chrome.runtime` 等
- ✅ **失败率阈值**：失败率 >5% 自动回滚

#### ⚠️ 必须有注入失败回滚：失败时关闭页面，重试 3 次后报告管理员
- ✅ **需要实现**：
  - 注入失败时关闭页面
  - 重试 3 次（每次间隔 1-2 秒）
  - 3 次失败后报告管理员（通过 ZMQ 发送告警）

#### ⚠️ 重试机制增强
- ⚠️ **需要增强**：注入失败时重试（`applyAntiDetection`, `injectStealth`）

---

### 9. 监控 & 异常处理（增强层）

#### ✅ 实时监控 RPA Bot 行为
- ✅ **统计报告**：每 5 分钟自动输出统计报告
- ⚠️ **需要增强**：ML 模型检测偏差 >10% 自动暂停（当前无自动暂停机制）

#### ⚠️ 集成 Continuous Security Monitoring
- ✅ **需要实现**：每 4-12 小时自动巡检注入效果（调用 `validateRuntimeFingerprint`）
- ✅ **发现漂移预警**：检测到指纹漂移时自动告警

#### ✅ 所有注入事件必须 log
- ✅ **日志级别**：`info`（成功）、`warn`（失败）、`error`（严重错误）

---

### 10. 加密 & 数据保护（核心层）

#### ✅ 禁止注入明文敏感数据
- ✅ **解密仅在内存中**：配置文件解密后仅在内存中处理

#### ✅ 必须用强哈希保护注入脚本本身
- ✅ **文件完整性**：每次加载配置文件时校验 `configHash`

#### ⚠️ 集成 DLP 监控注入中敏感信息外泄
- ⚠️ **未实现**：当前无 DLP（数据丢失防护）监控

---

### 11. RPA 权限 & 访问控制（高级层）

#### ❌ 必须用 RBAC 限制 RPA Bot 权限
- ✅ **需要实现**：Bot 只允许访问指定 API/页面，禁止全域注入

#### ❌ 必须为每个 RPA Bot 创建独立身份
- ✅ **需要实现**：独立 AD 账号或 OAuth Token，禁止共用账号/注入

#### ❌ 必须限制注入频率/范围
- ✅ **需要实现**：5 次/分钟限制，Zero Trust 验证每一次注入

#### ❌ 必须记录所有注入事件（90 天以上）
- ✅ **需要实现**：持久化到数据库，保存 90 天以上

---

### 12. 浏览器特定守则（高级层）

#### ✅ 禁止在运行时注入全局标记
- ✅ **已实现**：所有注入脚本使用 IIFE + 随机名 + 自毁

#### ✅ 禁止使用 eval / innerHTML 注入
- ✅ **禁止 eval**：所有脚本通过 `page.evaluate()` 执行（非 `eval()`）

#### ⚠️ 禁止忽略浏览器事件触发
- ✅ **已实现**：`addInitScript` 覆盖所有新页面（主要机制）

#### ❌ 必须隔离注入环境
- ✅ **需要实现**：RPA 注入在独立 context 中运行，防主页面污染

---

### 13. 其他必死行为（高级层）

#### ✅ Bot 身份伪装：RPA Bot 必须模拟真人 UA / 指纹
- ⚠️ **需要确认**：UA 非默认值（应在指纹生成器中验证）

#### ❌ 禁止不审计注入代码
- ✅ **需要实现**：每季度审计所有注入脚本，防供应链攻击

#### ❌ 禁止忽略零信任原则
- ✅ **需要实现**：每一次注入必须验证 Bot 身份 + 环境（IP / 时区一致）

#### ⚠️ 禁止使用过时库
- ⚠️ **需要确认**：确保使用 2025 年最新版（如 `crypto.js v4+`）

---

### 14. 推荐的终极安全实践（高级层）

#### ❌ 所有注入脚本用静态代码分析工具扫描
- ✅ **需要实现**：ESLint + custom rules 扫描所有注入脚本

#### ❌ 所有注入加 TTL（过期机制）
- ✅ **需要实现**：5min 过期，强制重新注入

#### ❌ 集成 RPA 专用安全框架
- ❌ **未实现**：无集成（如 Singleclic 2025 框架）

#### ❌ 用 RBAC + 最小权限原则
- ✅ **需要实现**：Bot 只注入必要字段

#### ⚠️ 后台静默监控注入效果
- ✅ **需要增强**：每 6 小时跑一次完整验证

#### ❌ 如果注入失败率 >5%，自动切换备用方案
- ✅ **需要实现**：失败率 >5% 自动切换（如 fallback 到静态配置）
