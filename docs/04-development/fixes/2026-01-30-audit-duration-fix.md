# Audit Timeline Duration Fix Report

## 修复内容

针对用户反馈的“审计时间轴里面的持续时间怎么没计算出来”的问题，进行了后端和前端的双重修复：

1.  **后端修复 (SessionService)**：
    *   修改了 `cleanupZombieSessions` 方法。
    *   **变更前**：仅更新 `status` 和 `end_time`，`duration` 字段保持 `NULL`。
    *   **变更后**：在清理僵尸会话时，自动计算并填充 `duration` (`updated_at - start_time`)，确保异常退出的会话也有时长记录。

2.  **前端修复 (LogTerminal)**：
    *   **运行中会话显示优化**：
        *   对于状态为 `Running (0)` 的会话，现在会动态计算 `当前时间 - 开始时间`，并显示为 "XXm XXs (运行中)"。
        *   解决了之前运行中会话因数据库 `duration` 为空而显示 `-` 的问题。
    *   **0ms 显示修复**：
        *   修正了 `formatDuration` 函数，现在 `0` 毫秒会正确显示为 `0ms`，而不是 `-`。

## 验证

*   **运行中任务**：应显示当前已运行时长。
*   **已完成/已崩溃任务**：应显示正确的总耗时。
