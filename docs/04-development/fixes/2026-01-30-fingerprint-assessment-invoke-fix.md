# Fingerprint Assessment Fix Report

## 修复内容

修复了指纹评估组件中的 `Cannot read properties of undefined (reading 'invoke')` 错误。

**原因**：
`src/renderer/components/FingerprintAssessment/FingerprintAssessment.tsx` 错误地使用了 `window.electron.ipcRenderer.invoke`。
根据 `src/preload/index.ts` 的定义，`ipcRenderer` 对象并未直接暴露给渲染进程（出于安全考虑），而是将 `invoke` 方法直接挂载在 `window.electron` 对象上。

**修复操作**：
将 `window.electron.ipcRenderer.invoke` 替换为正确的 `window.electron.invoke`。

## 验证

*   **指纹评估**：点击指纹评估按钮应不再报错，正常发起 IPC 调用。
