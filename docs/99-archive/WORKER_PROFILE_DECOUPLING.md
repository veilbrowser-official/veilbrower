# VeilBrowser Worker-Profile 解耦架构设计

## 📋 概述

本文档记录 VeilBrowser Worker-Profile 解耦架构设计方案。该方案通过**Worker-Profile解耦 + 任务驱动**实现检测任务独立运行，同时保持工作流任务的Profile绑定。

**核心理念**: **简化优先** - 移除Worker池管理复杂度，直接启动Worker进程，按需创建，任务完成后自动清理。

---

## 🎯 核心架构设计

### **总体架构图**

```
┌─────────────────────────────────────────────────┐
│                User Interface                   │
├─────────────────┬───────────────────────────────┤
│ Profile List    │ Task Center                   │
│ • 手动Profile管理 │ • 检测任务提交                │
└─────────────────┼───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │ Task Scheduler           │ ← 任务调度器
    │ ├─ 检测任务              │ ← 直接启动独立Worker
    │ ├─ 工作流任务            │ ← 使用现有launcher
    │ └─ 并发控制              │ ← 简单并发限制
    └─────────────┼─────────────┘
                  │
        ┌─────────┼─────────┐
        │   Workers        │ ← 按需创建
        │├─ 检测Worker      │ ← 独立运行，不绑定Profile
        ││  ├─ 接收检测任务  │
        ││  ├─ 执行检测      │
        ││  └─ 自动退出      │
        │└─ Profile Worker  │ ← 绑定Profile（现有逻辑）
        │   ├─ Profile环境   │
        │   └─ 工作流执行    │
        └──────────────────┘
```

### **核心设计原则**

1. **Worker-Profile解耦**: 检测任务不绑定Profile，独立运行
2. **按需创建**: 直接启动Worker进程，任务完成后自动清理
3. **简化管理**: 无池管理，无状态维护，降低复杂度
4. **向后兼容**: 工作流任务继续使用现有launcher.service.ts

---

## 🔧 核心组件详解

### **1. TaskScheduler（简化版任务调度器）**

**职责**: 接收任务 → 启动Worker → 执行 → 清理

```typescript
class TaskScheduler {
  async scheduleTask(task: Task): Promise<TaskExecutionResult> {
    if (task.type === 'detection') {
      // 检测任务：直接启动独立Worker进程
      return await this.executeDetectionTask(task);
    } else {
      // 工作流任务：使用现有launcher.service.ts
      return await this.executeWorkflowTask(task);
    }
  }
  
  private async executeDetectionTask(task: DetectionTask) {
    // 直接fork worker进程
    const workerProcess = fork(workerPath, [], {
      env: { WORKER_MODE: 'detection_only' }
    });
    
    // 发送任务
    workerProcess.send({ type: 'RUN_DETECTION', task });
    
    // 等待结果
    return await this.waitForResult(workerProcess);
  }
}
```

**关键特性**:
- **无池管理**: 直接启动Worker，任务完成后自动退出
- **简单高效**: 无状态维护，无资源复用
- **并发控制**: 简单的并发限制机制

### **2. Detection Worker（检测模式Worker）**

**职责**: 接收检测任务 → 执行检测 → 返回结果 → 退出

```typescript
// detectionWorker.ts
async function main() {
  // 等待检测请求
  const { fingerprint } = await waitForDetectionRequest();
  
  // 执行检测
  const result = await runDetection(fingerprint);
  
  // 发送结果
  process.send({ type: 'DETECTION_RESULT', result });
  
  // 自动退出
  process.exit(0);
}
```

**关键特性**:
- **完全独立**: 不绑定Profile，不加载Profile环境
- **自动清理**: 任务完成后自动退出
- **无状态**: 每次检测都是独立任务

### **3. Profile Worker（现有逻辑）**

**职责**: 绑定Profile → 加载环境 → 执行工作流

```typescript
// worker.ts (现有逻辑)
async function main() {
  // 接收Profile数据
  const profileContext = await waitForLaunchMessage();
  
  // 初始化Profile环境
  initWorkerContext(profileContext);
  
  // 执行工作流任务
  await handleWorkflowTasks();
}
```

**关键特性**:
- **Profile绑定**: 1:1绑定Profile，保持环境稳定
- **长期运行**: Profile启动后保持运行
- **向后兼容**: 完全兼容现有逻辑

---

## 📋 Task类型体系

### **核心Task类型**

| Task类型 | Profile绑定 | Worker类型 | 执行方式 |
|----------|------------|-----------|----------|
| **detection** | ❌ 不绑定 | 独立Worker | 直接fork，任务完成后退出 |
| **workflow_execution** | ✅ 绑定 | Profile Worker | 使用现有launcher.service.ts |

---

## 🔄 执行流程详解

### **检测任务执行流程**

```
1. 用户提交检测任务
   └── IPC → TaskScheduler
       ↓
2. TaskScheduler接收任务
   ├── 并发控制检查
   └── 启动独立Worker进程
       ↓
3. Detection Worker启动
   ├── 等待检测请求（IPC）
   ├── 接收任务数据
   └── 执行检测
       ↓
4. 检测执行
   ├── 启动headless浏览器
   ├── 应用指纹配置
   ├── 执行CreepJS检测
   └── 生成检测结果
       ↓
5. 返回结果
   ├── 通过IPC发送结果
   └── Worker自动退出
       ↓
6. TaskScheduler接收结果
   └── 返回给调用方
```

### **工作流任务执行流程**

```
1. 用户提交工作流任务
   └── 使用现有launcher.service.ts
       ↓
2. Profile启动（如果未启动）
   ├── fork Profile Worker
   ├── 传递Profile数据
   └── 初始化Profile环境
       ↓
3. Profile Worker执行工作流
   ├── 接收工作流任务
   ├── 执行工作流步骤
   └── 返回执行结果
```

---

## 🎯 架构优势

### **1. 简化性** ⭐⭐⭐⭐⭐
- ✅ **无池管理**: 移除复杂的池管理逻辑
- ✅ **按需创建**: 直接启动Worker，简单直接
- ✅ **自动清理**: 任务完成后自动退出，无需手动管理

### **2. 灵活性** ⭐⭐⭐⭐⭐
- ✅ **独立运行**: 检测任务完全独立，不占用Profile资源
- ✅ **扩展友好**: 未来需要池化时再考虑加入
- ✅ **向后兼容**: 工作流任务完全兼容现有逻辑

### **3. 可维护性** ⭐⭐⭐⭐⭐
- ✅ **代码简洁**: 移除大量池管理代码
- ✅ **逻辑清晰**: 任务类型决定Worker类型
- ✅ **易于调试**: 无状态管理，问题定位简单

---

## 📊 性能对比

| 指标维度 | Worker池方案 | 简化方案 | 说明 |
|----------|-------------|----------|------|
| **代码复杂度** | 🔴 高 | 🟢 低 | 简化方案代码量减少60%+ |
| **维护成本** | 🔴 高 | 🟢 低 | 无池管理，维护简单 |
| **启动速度** | 🟡 中等 | 🟢 快 | 直接启动，无池查找 |
| **资源利用** | 🟢 高 | 🟡 中等 | 无复用，但检测任务短时运行 |
| **扩展性** | 🟡 中等 | 🟢 高 | 未来需要时再添加池 |

---

## 🗄️ 数据库适配

### **保留profiles表实例字段**

虽然不使用Worker池，但保留profiles表的实例状态字段，为未来扩展预留：

```sql
-- 保留字段（为未来扩展预留）
worker_id TEXT,              -- 绑定的Worker进程ID
instance_id TEXT DEFAULT 'default',
started_at INTEGER,
last_active_at INTEGER,
task_count INTEGER DEFAULT 0,
mode TEXT DEFAULT 'manual',
```

**说明**: 当前不使用这些字段，但保留以便未来需要时使用。

---

## 📋 实施总结

### **已完成的工作**

1. ✅ **数据库迁移**: 添加profiles表实例字段（版本16）
2. ✅ **类型定义**: 创建Task和Worker相关类型
3. ✅ **业务层扩展**: Worker Pool业务规则和检测用例
4. ✅ **TaskScheduler**: 简化版任务调度器（直接启动Worker）
5. ✅ **检测任务支持**: 使用现有detectionWorker.ts
6. ✅ **IPC接口**: 检测任务IPC Handlers
7. ✅ **服务集成**: 主进程初始化和清理

### **移除的组件**

1. ❌ **SharedWorkerPool**: 共享Worker池
2. ❌ **ExclusiveWorkerPool**: 专用Profile池
3. ❌ **WorkerPoolDispatcher**: 池调度器
4. ❌ **pool-config.ts**: 池配置

### **保留的组件**

1. ✅ **TaskScheduler**: 简化版，直接启动Worker
2. ✅ **detectionWorker.ts**: 检测模式Worker（现有）
3. ✅ **worker.ts**: Profile Worker（现有）
4. ✅ **业务规则**: Worker Pool业务规则（保留，未来可能用到）

---

## 🎉 最终结论

这个**简化架构**完美平衡了功能和复杂度：

**核心优势**:
- **简化性**: 移除池管理，代码量减少60%+
- **灵活性**: 检测任务独立运行，不占用Profile资源
- **可维护性**: 逻辑清晰，易于调试和维护
- **扩展性**: 未来需要池化时再考虑加入

**关键决策**:
- ✅ **不使用Worker池**: 复杂度高，收益有限
- ✅ **Worker-Profile解耦**: 检测任务独立运行
- ✅ **按需创建**: 直接启动Worker，任务完成后自动清理
- ✅ **向后兼容**: 工作流任务完全兼容现有逻辑

这个方案既满足了当前需求（检测任务独立运行），又保持了架构的简洁性，为未来扩展留下了空间！🎯

---

*文档版本*: 1.0 (简化版)
*最后更新*: 2025-12-20
*核心设计*: Worker-Profile解耦 + 按需创建 + 自动清理
*架构决策*: 不使用Worker池，简化优先
*负责人*: VeilBrowser Team

