# LogTerminal UI 修复报告

## 修复内容

针对用户反馈的“日志部分全屏和锁定的图标都不对，看起来不专业”的问题，已对 `src/renderer/components/LogTerminal/LogTerminal.tsx` 进行了如下修复：

1.  **全屏图标修正**：
    *   **进入全屏**：从 `EyeOutlined` (眼睛) 修改为 `FullscreenOutlined` (标准全屏图标)。
    *   **退出全屏**：从 `MinusOutlined` (减号) 修改为 `FullscreenExitOutlined` (标准退出全屏图标)。

2.  **锁定/自动滚动图标修正**：
    *   **锁定滚动 (自动滚动开启)**：从 `VerticalAlignBottomOutlined` (底对齐) 修改为 `LockOutlined` (锁)，以匹配 Tooltip "锁定滚动" 的语义。
    *   **解锁滚动 (自动滚动关闭)**：从 `PauseCircleOutlined` (暂停) 修改为 `UnlockOutlined` (解锁)，以匹配 Tooltip "取消锁定" 的语义。

3.  **Tooltip 文案优化**：
    *   将自动滚动按钮的 Tooltip 从 "锁定滚动/自动滚动" 调整为 "取消锁定/锁定滚动"，使其状态描述更准确。

## 验证

已通过 TypeScript 类型检查，确认引入了正确的图标组件。
