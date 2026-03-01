# 影刀 RPA 工具集成方案

**文档版本**: 1.0  
**创建日期**: 2025-01-XX  
**状态**: 设计阶段（未实现）

## 📋 概述

本文档描述了 VeilBrowser 与影刀 RPA 工具的集成方案，实现影刀主程序自动发现和管理多个 VeilBrowser Profile 的能力。

### 核心目标

- ✅ 影刀主程序能够自动发现所有运行中的 VeilBrowser Profile
- ✅ 影刀主程序能够区分不同 Profile 的连接
- ✅ 支持同时控制多个 Profile 执行 RPA 工作流
- ✅ 零配置，用户安装扩展后自动工作

## 🎯 问题分析

### 当前情况

- ✅ 影刀扩展已安装到多个 VeilBrowser Profile
- ✅ 每个 Profile 都是独立的浏览器实例
- ✅ 影刀扩展通过 Native Messaging 连接主程序

### 核心挑战

**问题**：影刀主程序如何区分多个 Profile 的连接？

- 多个 Profile = 多个扩展实例
- 每个扩展实例都连接到同一个影刀主程序
- 主程序需要知道：这个连接来自哪个 Profile？

## 🔧 技术方案

### 方案设计：条件注入桥接脚本

**核心思路**：VeilBrowser 在 Profile 启动时，如果检测到启用了影刀扩展，则注入桥接脚本，自动在 Native Messaging 连接时发送 Profile ID。

### 工作流程

```
VeilBrowser Profile 启动
    ↓
检查是否启用了影刀扩展
    ↓ (如果启用)
注入 Profile ID 和桥接脚本
    ↓
影刀扩展加载（Content Script）
    ↓
扩展调用 chrome.runtime.connectNative()
    ↓ (被桥接脚本拦截)
桥接脚本自动发送 Profile ID
    ↓
影刀主程序收到连接 + Profile ID
    ↓
主程序建立映射：connection → profileId
    ↓
后续命令根据 profileId 路由到对应连接
```

### 数据流

```
VeilBrowser Profile A (profileId: "p001")
    ↓ (注入 profileId)
影刀扩展实例 A
    ↓ (connectNative + 自动发送 profileId)
影刀主程序
    ↓ (建立映射: connection_A → "p001")
后续命令执行时，指定 profileId 路由到对应连接

VeilBrowser Profile B (profileId: "p002")  
    ↓ (注入 profileId)
影刀扩展实例 B
    ↓ (connectNative + 自动发送 profileId)
影刀主程序
    ↓ (建立映射: connection_B → "p002")
```

## 🛠️ 实现细节

### 1. 条件检查：是否启用影刀扩展

**检查逻辑**：
- 影刀扩展 ID: `hofgfmmdolnmimplihglefekekfcfijf`
- 在 Profile 启动时，检查该扩展是否在启用列表中
- 只有启用了影刀扩展时才注入桥接脚本

**优势**：
- ✅ 安全性：只在必要时注入，不影响其他扩展
- ✅ 性能：减少不必要的脚本注入
- ✅ 兼容性：不影响其他 RPA 工具

### 2. 桥接脚本注入

**注入时机**：
- Profile 启动后，页面 DOM 准备好时
- 确保扩展已经加载

**注入内容**：
1. **Profile ID 存储**：`window.__VEILBROWSER_PROFILE_ID__`
2. **Native Messaging 拦截**：拦截 `chrome.runtime.connectNative()`
3. **自动发送 Profile ID**：在连接建立后自动发送

**关键代码逻辑**：
```javascript
// 桥接脚本伪代码
(function() {
  // 1. 存储 Profile ID
  window.__VEILBROWSER_PROFILE_ID__ = '${profileId}';
  
  // 2. 拦截 Native Messaging
  const originalConnectNative = chrome.runtime.connectNative;
  chrome.runtime.connectNative = function(application) {
    // 只对影刀扩展生效
    if (application === 'shadowbot.chrome.bridge' || 
        application === 'shadowbot.chrome.bridge_v2') {
      
      const port = originalConnectNative.call(this, application);
      
      // 3. 自动发送 Profile ID
      setTimeout(() => {
        port.postMessage({
          type: 'PROFILE_IDENTIFY',
          profileId: '${profileId}',
          _fromVeilBrowser: true,
          timestamp: Date.now()
        });
      }, 100);
      
      return port;
    } else {
      // 其他扩展正常连接
      return originalConnectNative.call(this, application);
    }
  };
})();
```

### 3. 影刀主程序映射

**映射关系**：
- `connectionId` → `profileId`：根据连接找到对应的 Profile
- `profileId` → `connectionId`：根据 Profile 找到对应的连接

**消息格式**：
```json
{
  "type": "PROFILE_IDENTIFY",
  "profileId": "profile_001",
  "_fromVeilBrowser": true,
  "timestamp": 1234567890
}
```

## 🔒 安全性考虑

### 安全措施

1. **条件注入**：只在启用影刀扩展时注入，最小化安全风险
2. **作用域限制**：只在 VeilBrowser 管理的页面注入
3. **错误处理**：注入失败不影响扩展正常运行
4. **日志记录**：记录注入操作，便于审计

### 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 信息泄露（Profile ID） | 低 | Profile ID 本身不敏感，且只在 VeilBrowser 页面可见 |
| 代码执行 | 低 | 桥接脚本简单，只做消息转发 |
| 功能劫持 | 低 | 只拦截影刀的 Native Messaging，不影响其他扩展 |
| 兼容性问题 | 中 | 条件注入确保不影响其他扩展 |

## 📊 方案优势

### ✅ 功能完整
- 影刀扩展能正常工作
- 自动识别和管理多个 Profile
- 支持同时控制多个 Profile

### ✅ 安全性高
- 只在必要时注入
- 不影响其他扩展
- 最小化安全风险

### ✅ 性能良好
- 减少不必要的脚本注入
- 只在需要时才执行桥接逻辑
- 降低内存和 CPU 开销

### ✅ 易于维护
- 注入条件清晰明确
- 可以轻松扩展到其他 RPA 工具
- 代码逻辑简洁

### ✅ 用户体验
- 零配置，自动工作
- 安装扩展后即可使用
- 无需手动配置连接

## 🔄 扩展性

### 支持多个 RPA 工具

可以轻松扩展到其他 RPA 工具：

```typescript
const rpaExtensions = [
  'hofgfmmdolnmimplihglefekekfcfijf', // 影刀
  // 可以添加其他 RPA 工具的扩展 ID
];
```

### 动态检测

可以监听扩展启用/禁用事件，动态注入或清理桥接脚本。

## 📝 实现计划

### Phase 1: 基础实现（未开始）
- [ ] 实现条件检查逻辑
- [ ] 实现桥接脚本注入
- [ ] 添加日志记录
- [ ] 单元测试

### Phase 2: 完善功能（未开始）
- [ ] 错误处理增强
- [ ] 性能优化
- [ ] 文档完善

### Phase 3: 扩展支持（未开始）
- [ ] 支持其他 RPA 工具
- [ ] 动态检测机制
- [ ] 配置化支持

## 🧪 测试计划

### 功能测试
- [ ] 单个 Profile 连接测试
- [ ] 多个 Profile 同时连接测试
- [ ] Profile 启动/关闭测试
- [ ] 扩展启用/禁用测试

### 兼容性测试
- [ ] 其他扩展正常工作测试
- [ ] 不同浏览器版本测试
- [ ] 不同操作系统测试

### 性能测试
- [ ] 注入脚本性能影响
- [ ] 内存占用测试
- [ ] CPU 使用率测试

## 📚 参考资料

### 相关文档
- [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/mv3/nativeMessaging/)
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [VeilBrowser 扩展系统文档](../modules/extension-system.md)（待创建）

### 相关代码
- `src/main/services/extension/extensionLoader.service.ts` - 扩展加载服务
- `src/main/services/profile/launcher.service.ts` - Profile 启动服务
- `src/main/services/extension/extension.service.ts` - 扩展管理服务

## 🎯 总结

本方案通过**条件注入桥接脚本**的方式，实现了 VeilBrowser 与影刀 RPA 工具的无缝集成。方案既保证了功能完整性，又确保了安全性和性能，是一个优雅且实用的解决方案。

**关键优势**：
- ✅ 零配置，自动工作
- ✅ 安全性高，条件注入
- ✅ 性能良好，最小开销
- ✅ 易于维护，逻辑清晰

---

**文档维护者**: VeilBrowser Team  
**最后更新**: 2025-01-XX
