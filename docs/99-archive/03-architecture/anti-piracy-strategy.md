# VeilBrowser 防盗版保护策略文档（2025版）

**版本**: 1.5.0
**更新日期**: 2025-12-31
**维护者**: VeilBrowser Team
**状态**: 🎉 完整防盗版保护体系实现完成，5阶段全覆盖

**已完成阶段**:
- ✅ **Phase 1**: 核心算法保护（Fingerprint + Workflow + ControlFlow）
- ✅ **Phase 2**: 调度控制保护（批量调度 + 并发控制算法）
- ✅ **Phase 3**: 业务逻辑保护（工作流执行 + 启动逻辑 + 变量解析）
- ✅ **Phase 4**: 执行框架保护（执行管理 + 状态管理）
- ✅ **Phase 5**: 运行时校验（多阶段完整性校验）

**技术实现**:
- 🛠️ **插件架构**: Bytenode编译 + JS混淆 + 完整性校验
- 🔧 **构建集成**: Vite无缝集成，自动化保护流程
- 🛡️ **运行时保护**: 四重校验系统，文件篡改实时检测
- 📊 **性能控制**: 总启动时间增加约24秒，保护与性能平衡

**最近更新**:
- 🗑️ 清理L5层死代码：删除了resultCollector.service.ts, taskState.service.ts, taskQueue.ts, scriptCompiler.service.ts, messageParser.ts
- 🔄 重构L5层架构：将execution.service.ts移动到execution/目录，重命名为executionManager.service.ts
- 📁 清理空目录：删除了scheduler/, utils/, worker-pool/空目录
- 📝 更新导入路径：修复了所有引用execution.service.ts的文件的导入路径
- 📋 更新保护策略：ExecutionManager提升为5星级保护，ExecutionStateService提升为5星级保护

---

## 📋 目录

- [总体策略](#总体策略)
- [分层保护架构](#分层保护架构)
- [实施计划](#实施计划)
- [性能影响评估](#性能影响评估)
- [技术选型](#技术选型)
- [监控和调整](#监控和调整)

---

## 🎯 总体策略

### **核心原则**
**"精准保护 + 分层防御 + 渐进实施 + 性能平衡"**

- ✅ **精准保护**：基于实际代码分析，保护真正的核心价值
- ✅ **分层防御**：5星级保护核心算法，4星级保护调度逻辑，3星级保护执行框架
- ✅ **渐进实施**：分阶段实施，便于监控影响和调整策略
- ✅ **性能平衡**：在安全性和用户体验间找到最佳平衡点

### **保护目标**
- **核心算法**：防止逆向分析和算法复制
- **调度逻辑**：防止批量操作策略被破解
- **业务实现**：增加破解难度和成本
- **运行时校验**：实时检测文件篡改

---

## 🏗️ 分层保护架构

### **核心竞争力层（5星级）- 最高保护**

#### **保护方式**
- **Bytenode编译** + **深度JS混淆**
- **运行时完整性校验**
- **反调试保护**

#### **保护文件**
```
算法核心层（Bytenode + 深度混淆）
├── L6规划算法 ⭐⭐⭐⭐⭐
│   ├── src/main/business/workflow/planner/WorkflowPlanner.ts (700+行)
│   ├── src/main/business/workflow/planner/ControlFlowExpander.ts (200+行)
│   └── src/main/services/workflow/variableResolver.service.ts
│
└── L4指纹算法 ⭐⭐⭐⭐⭐
    ├── src/main/anti-detection/ (DDD 架构)
    │   ├── domain/services/fingerprint-factory.service.ts
    │   ├── domain/rules/
    │   └── infrastructure/sqlite.device.repository.ts
    ├── src/shared/types/fingerprint.ts    └── src/business/anti-detection/rules/*.ts (30+规则文件)
```

#### **保护理由**
- **WorkflowPlanner.ts**: 复杂的工作流规划算法，包含DAG解析、依赖分析、拓扑排序
- **FingerprintFactoryService**: 核心指纹生成工厂，编排 14+ 种规则策略
- **SqliteDeviceRepository**: 设备白名单数据库访问层
- **ControlFlowExpander.ts**: 控制流展开算法，支持条件判断、循环、并行执行

### **调度控制层（4星级）- 高保护**

#### **保护方式**
- **Bytenode编译** + **中级JS混淆**
- **基础完整性校验**

#### **保护文件**
```
调度控制层（Bytenode + 中级混淆）
├── 任务中心调度 ⭐⭐⭐⭐
│   ├── src/main/services/task-center/batchTaskScheduler.service.ts (500+行)
│   ├── src/main/services/task-center/schedulers/profileSerialScheduler.service.ts (70+行)
│   ├── src/main/services/task-center/schedulers/globalParallelScheduler.service.ts (50+行)
│   └── 任务拆分和并发控制算法
│
└── L3环境隔离 ⭐⭐⭐⭐
    ├── src/main/services/profile/launcher.service.ts
    └── src/main/business/profile/launcher.ts
```

#### **保护理由**
- **batchTaskScheduler.service.ts**: 复杂的数据源解析、多调度策略、两层并发控制
- **profileSerialScheduler.service.ts**: Profile内串行+Profile间并行的两层限流算法
- **Profile启动逻辑**: 复杂的启动编排和CDP控制

### **执行框架层（3星级）- 中保护**

#### **保护方式**
- **JS混淆器** + **基础混淆**
- **轻度完整性校验**

#### **保护文件**
```
执行框架层（JS混淆器 + 基础混淆）
├── L5执行管理 ⭐⭐⭐⭐⭐ ⭐⭐⭐⭐⭐
│   └── src/main/services/execution/executionManager.service.ts (1000+行)
│
├── L5状态管理 ⭐⭐⭐⭐⭐ ⭐⭐⭐⭐⭐
│   └── src/main/services/execution/executionState.service.ts (700+行)
│
├── 任务调度 ⭐⭐⭐⭐ ⭐⭐⭐⭐
│   ├── src/main/services/task-center/batchTaskScheduler.service.ts (500+行)
│   ├── src/main/services/task-center/schedulers/profileSerialScheduler.service.ts (70+行)
│   └── src/main/services/task-center/schedulers/globalParallelScheduler.service.ts (50+行)
│
├── L6业务逻辑 ⭐⭐⭐ ⭐⭐⭐⭐
│   ├── src/main/services/workflow/workflowExecution.service.ts (1100+行)
│   ├── src/main/services/profile/launcher.service.ts
│   └── src/main/services/workflow/variableResolver.service.ts
│
└── L6其他逻辑 ⭐⭐⭐
    └── src/main/services/workflow/workflowManager.service.ts
```

#### **保护理由**
- **ExecutionEngine.ts**: 任务执行框架，相对标准化的执行流程
- **workflowExecution.service.ts**: 工作流生命周期管理，业务逻辑实现

### **支撑系统层（2-3星级）- 基础保护**

#### **保护方式**
- **轻度混淆**（仅压缩）
- **基础完整性校验**

#### **保护文件**
```
支撑服务层（轻度混淆）
├── L2代理系统 ⭐⭐⭐
│   └── src/main/services/proxy/proxyPool.service.ts
│
└── L1基础设施 ⭐⭐
    └── src/main/database/*.ts
```

---

## 📅 实施计划

### **Phase 1: 核心算法保护（1周）**
```json
{
  "时间": "第1周",
  "目标": "保护最核心的算法逻辑",
  "保护文件": [
    "FingerprintFactoryService.ts",
    "WorkflowPlanner.ts",
    "ControlFlowExpander.ts"
  ],
  "技术方案": "Bytenode编译 + 深度JS混淆",
  "预期影响": "+13秒启动时间",
  "验证标准": "算法文件无法被逆向分析"
}
```

### **Phase 2: 调度控制保护（1周）** ✅ 已实现
```json
{
  "时间": "第2周",
  "状态": "已完成",
  "目标": "保护复杂的调度控制算法",
  "保护文件": [
    "src/main/services/task-center/batchTaskScheduler.service.ts",
    "src/main/services/task-center/schedulers/profileSerialScheduler.service.ts",
    "src/main/services/task-center/schedulers/globalParallelScheduler.service.ts",
    "src/main/services/task-center/schedulers/globalSerialScheduler.service.ts"
  ],
  "技术方案": "Bytenode编译 + 中级JS混淆 + 完整性校验",
  "预期影响": "+6秒启动时间",
  "验证标准": "调度策略无法被轻易复制",
  "实现状态": "插件配置完成，构建集成完毕"
}
```

### **Phase 3: 业务逻辑保护（1周）** ✅ 已实现
```json
{
  "时间": "第3周",
  "状态": "已完成",
  "目标": "保护重要业务逻辑实现",
  "保护文件": [
    "src/main/services/workflow/workflowExecution.service.ts",
    "src/main/services/profile/launcher.service.ts",
    "src/main/services/workflow/variableResolver.service.ts"
  ],
  "技术方案": "Bytenode编译 + 中级JS混淆 + 完整性校验",
  "预期影响": "+5秒启动时间",
  "验证标准": "业务逻辑逆向难度显著增加",
  "实现状态": "插件配置完成，构建集成完毕"
}
```

### **Phase 4: 执行框架保护（1周）** ✅ 已实现
```json
{
  "时间": "第4周",
  "状态": "已完成",
  "目标": "保护执行框架和基础设施",
  "保护文件": [
    "src/main/services/execution/executionManager.service.ts",
    "src/main/services/execution/executionState.service.ts"
  ],
  "技术方案": "JS混淆器 + 基础混淆 + 完整性校验",
  "预期影响": "+2秒启动时间",
  "验证标准": "整体保护体系完整",
  "实现状态": "插件配置完成，构建集成完毕"
}
```

### **Phase 5: 运行时校验（1周）** ✅ 已实现
```json
{
  "时间": "第5周",
  "状态": "已完成",
  "目标": "实现运行时完整性校验",
  "技术方案": "多阶段文件哈希校验 + 运行时监控",
  "预期影响": "+1-2秒启动时间",
  "验证标准": "文件篡改能被实时检测",
  "实现状态": "四重校验系统已集成到main.ts"
}
```

---

## 📈 性能影响评估

### **总体性能影响**
- **冷启动时间**: 30秒 → 56秒（+26秒，+87%）
- **热启动时间**: 无明显影响
- **运行时性能**: 基本无影响（混淆后的代码执行效率相近）

### **分阶段性能影响**
| 阶段 | 影响文件数 | 启动时间增加 | 累计启动时间 | 用户体验影响 |
|------|-----------|-------------|-------------|-------------|
| Phase 1 | 3个核心文件 | +13秒 | 43秒 | 可接受 |
| Phase 2 | 4个调度文件 | +6秒 | 49秒 | 可接受 |
| Phase 3 | 3个业务文件 | +5秒 | 54秒 | 可接受 |
| Phase 4 | 2个框架文件 | +2秒 | 56秒 | 可接受 |
| Phase 5 | 校验系统 | +1秒 | 57秒 | 可接受 |

### **用户体验评估**
- **桌面应用可接受范围**: <60秒启动时间
- **我们的最终影响**: 57秒，仍在可接受范围内
- **优化空间**: 通过预加载和缓存可进一步优化

---

## 🛠️ 技术选型

### **代码混淆技术栈**
```json
{
  "Bytenode": {
    "版本": "^1.3.1",
    "用途": "核心算法字节码编译",
    "优势": "执行速度快，逆向难度极高",
    "文件范围": "5星级和4星级文件"
  },
  "JavaScript混淆器": {
    "库名": "javascript-obfuscator",
    "版本": "^4.1.0",
    "用途": "AST变换和变量重命名",
    "配置档": "深度混淆/中级混淆/基础混淆"
  }
}
```

### **运行时校验技术栈**
```json
{
  "文件完整性校验": {
    "算法": "SHA256哈希",
    "存储方式": "构建时计算，运行时比对",
    "监控方式": "启动时全量校验，运行时增量监控"
  },
  "异常处理策略": {
    "核心文件篡改": "立即退出应用",
    "业务文件异常": "功能降级运行",
    "轻微问题": "记录警告继续运行"
  }
}
```

### **构建工具集成**
```json
{
  "Vite插件": {
    "混淆插件": "自动识别文件类型和保护等级",
    "校验插件": "自动生成哈希文件",
    "开发环境": "跳过混淆保持调试友好"
  },
  "构建脚本": {
    "混淆构建": "npm run build:obfuscated",
    "校验构建": "npm run build:with-integrity",
    "开发构建": "npm run build:dev"
  }
}
```

---

## 📊 监控和调整

### **性能监控指标**
- **启动时间**: 各阶段详细计时
- **文件大小**: 混淆前后对比
- **内存使用**: 运行时内存占用
- **错误率**: 混淆导致的运行错误

### **用户反馈收集**
- **启动时间反馈**: 用户实际体验时间
- **功能异常报告**: 混淆导致的功能问题
- **性能问题反馈**: 运行时性能下降

### **调整策略**
- **基于数据调整**: 根据监控数据调整保护强度
- **分级回退**: 严重问题时降低部分文件的保护等级
- **优化方案**: 预编译、延迟加载、内存优化

---

## 🎯 预期效果

### **安全性提升**
- **逆向难度**: 提升10-20倍
- **算法保护**: 核心算法无法被轻易复制
- **批量破解**: 显著增加破解成本和时间

### **商业价值保护**
- **核心竞争力**: 指纹算法和规划算法得到有效保护
- **市场优势**: 防止竞品快速复制核心功能
- **用户价值**: 保护付费用户的投资价值

### **技术债务控制**
- **渐进实施**: 分阶段实施便于控制风险
- **监控机制**: 实时监控性能影响和问题
- **回退方案**: 问题严重时可快速降级保护

---

## 📝 实施检查清单

### **Phase 1 准备工作**
- [ ] Bytenode依赖安装和测试
- [ ] JavaScript混淆器集成测试
- [ ] 混淆效果评估（可逆向性测试）
- [ ] 性能基准测试建立

### **Phase 1 实施**
- [ ] 核心算法文件混淆
- [ ] Bytenode编译测试
- [ ] 启动时间性能测试
- [ ] 功能完整性测试

### **Phase 2-5 实施**
- [ ] 按计划分阶段实施
- [ ] 每个阶段性能监控
- [ ] 用户体验测试
- [ ] 问题修复和优化

---

## 🚨 风险控制

### **技术风险**
- **混淆导致bug**: 建立完整的测试用例
- **性能严重下降**: 设置性能阈值，超过则回退
- **构建失败**: 准备降级构建方案

### **业务风险**
- **用户流失**: 启动时间过长导致用户流失
- **功能异常**: 混淆导致功能无法正常使用
- **支持成本**: 混淆后的调试困难增加支持成本

### **应对策略**
- **灰度发布**: 先小范围测试，再全量发布
- **监控告警**: 性能和错误率监控告警
- **快速回退**: 严重问题时可快速降级保护

---

## 🚀 **防盗版保护使用指南**

### **构建脚本说明**

#### **生产环境构建（推荐）**
```bash
# 完整防盗版保护构建
npm run electron:build:mac      # macOS 生产版本
npm run electron:build:win      # Windows 生产版本
npm run electron:build:linux    # Linux 生产版本
npm run electron:build          # 通用生产版本

# 这些命令会自动执行：
# 1. npm run build:protected:full (应用完整防盗版保护)
# 2. electron-builder (打包发布)
```

#### **开发环境构建**
```bash
# 无保护的开发构建（调试友好）
npm run electron:build:mac:dev  # macOS 开发版本
npm run electron:build:win:dev  # Windows 开发版本
npm run electron:build:linux:dev # Linux 开发版本
npm run electron:build:dev      # 通用开发版本

# 这些命令使用普通构建，方便调试
```

#### **分阶段测试构建**
```bash
# Phase 1-5 分阶段构建（用于测试）
npm run build:protected:phase1  # 核心算法保护
npm run build:protected:phase2  # 调度控制保护
npm run build:protected:phase3  # 业务逻辑保护
npm run build:protected:phase4  # 执行框架保护
npm run build:protected:phase5  # 运行时校验
npm run build:protected:full    # 完整保护体系
```

### **构建产物说明**

#### **受保护构建产物**
```
dist-electron/
├── core/main.js                    # 混淆后的主进程文件
├── protected/
│   ├── core/                      # Phase 1 字节码文件
│   │   ├── FingerprintFactoryService.jsc
│   │   ├── WorkflowPlanner.jsc
│   │   └── ControlFlowExpander.jsc
│   ├── scheduler/                 # Phase 2 字节码文件
│   │   ├── batchTaskScheduler.jsc
│   │   └── *.jsc
│   └── business/                  # Phase 3 字节码文件
│       ├── workflowExecution.jsc
│       └── *.jsc
└── hashes/                        # 完整性校验文件
    ├── core.json                 # Phase 1 哈希
    ├── scheduler.json            # Phase 2 哈希
    ├── business.json             # Phase 3 哈希
    └── framework.json            # Phase 4 哈希
```

#### **性能影响**
```json
{
  "构建时间": "27秒 (+14秒)",
  "发布包大小": "+5MB (+3%)",
  "启动时间": "+24秒 (总57秒)",
  "保护文件数": "14个核心文件",
  "哈希校验点": "4个校验阶段"
}
```

### **运行时保护机制**

#### **启动时校验流程**
```
1. 应用启动 → main.js 执行
2. 初始化防盗版保护 → 导入校验器
3. 校验Phase 1-4文件 → 对比SHA256哈希
4. 校验通过 → 正常运行应用
5. 校验失败 → 强制退出，显示错误
```

#### **运行时加载机制**
```javascript
// 核心算法加载
const FingerprintFactoryService = await bytenodeLoader.loadModule(
  'core/main/anti-detection/domain/services/fingerprint-factory.service'
);

// 降级机制：如果字节码不存在，使用普通JS文件
// 开发环境跳过校验，生产环境强制校验
```

### **安全保护层级**

#### **5星级保护（核心算法）**
- **技术**: Bytenode字节码 + 深度JS混淆 + SHA256校验
- **文件**: FingerprintFactoryService, WorkflowPlanner, ControlFlowExpander
- **效果**: 无法逆向分析，文件篡改实时检测

#### **4星级保护（调度控制）**
- **技术**: Bytenode字节码 + 中级JS混淆 + SHA256校验
- **文件**: batchTaskScheduler, Serial/ParallelScheduler
- **效果**: 难以复制调度逻辑，文件篡改实时检测

#### **3星级保护（业务逻辑）**
- **技术**: Bytenode字节码 + 中级JS混淆 + SHA256校验
- **文件**: workflowExecution, launcher, variableResolver
- **效果**: 业务逻辑逆向困难，文件篡改实时检测

#### **运行时阻断**
- **技术**: 四重完整性校验 + 强制退出机制
- **触发**: 核心文件篡改时立即阻断应用运行
- **日志**: 详细记录校验失败原因

### **故障排除**

#### **构建失败**
```bash
# 检查依赖是否安装
npm list bytenode javascript-obfuscator

# 重新安装依赖
npm install

# 检查构建日志
npm run build:protected:full 2>&1 | grep -A5 -B5 "error"
```

#### **运行时校验失败**
```bash
# 检查哈希文件是否存在
ls -la dist-electron/hashes/

# 检查字节码文件是否完整
ls -la dist-electron/protected/

# 查看应用日志中的校验详情
# 日志会显示具体的校验失败原因
```

#### **性能问题**
```bash
# 如果启动过慢，可以：
# 1. 使用开发构建进行调试
# 2. 优化Bytenode编译参数
# 3. 考虑预加载策略
```

### **最佳实践**

#### **开发工作流**
```bash
# 开发阶段
npm run electron:build:mac:dev  # 无保护，调试友好

# 发布前测试
npm run build:protected:test    # 完整保护构建测试

# 生产发布
npm run electron:build:mac      # 完整保护的生产版本
```

#### **版本管理**
```bash
# 为不同环境创建不同的构建配置
# 开发版本：无保护，快速迭代
# 测试版本：完整保护，验证功能
# 生产版本：完整保护，最大安全性
```

#### **监控和维护**
```bash
# 定期检查：
# 1. 构建时间是否在可接受范围内
# 2. 发布包大小是否合理
# 3. 用户反馈中的启动时间问题
# 4. 安全事件和异常日志
```

---

**最后更新**: 2025-12-31
**维护者**: VeilBrowser Team
**状态**: ✅ 完整防盗版保护体系实现完成，可用于生产环境
