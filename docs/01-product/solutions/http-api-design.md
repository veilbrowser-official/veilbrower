# VeilBrowser HTTP API 设计文档

**文档版本**: 1.0  
**创建日期**: 2025-01-XX  
**状态**: 设计阶段（未实现）

## 📋 概述

本文档描述了 VeilBrowser 的外部 HTTP API 设计，用于支持 RPA 工具（如影刀）和其他第三方应用通过标准 REST API 控制和管理 VeilBrowser Profile。

### 核心目标

- ✅ 提供标准 RESTful API 接口
- ✅ 支持 Profile 的完整生命周期管理
- ✅ 支持工作流执行和监控
- ✅ 支持批量操作
- ✅ 提供实时状态推送（WebSocket）
- ✅ 安全可靠，仅本地访问

## 🏗️ 系统架构

### 架构图

```
第三方应用（影刀等）
    ↓ HTTP/WebSocket
VeilBrowser HTTP API Server
    ↓ (路由 + 认证 + 限流)
业务服务层
├── Profile Service
├── Workflow Service  
├── Execution Service
├── Extension Service
└── Monitoring Service
    ↓ (数据访问)
SQLite Database
```

### 技术栈

- **HTTP 服务器**: Node.js 原生 `http` 模块（保持简洁，无外部依赖）
- **WebSocket**: `ws` 库（实时状态推送）
- **认证**: API Key（Bearer Token）
- **数据存储**: 现有 SQLite 数据库
- **端口范围**: 8090-8100（固定范围，便于发现）

## 🔐 认证和安全

### API Key 认证（唯一认证方式）

**设计决策**: 仅使用 API Key 认证，不包含 JWT Token

**原因**:
- ✅ **简洁性**: API Key 实现简单，无需复杂的 Token 管理
- ✅ **适用场景**: 本地 API 场景下，API Key 已足够安全
- ✅ **长期有效**: 适合服务端集成和自动化任务
- ✅ **易于管理**: 直接存储和验证，无需 Token 刷新机制
- ⚠️ **未来扩展**: 如需 JWT 支持，可在后续版本添加

**生成方式**:
- 在 VeilBrowser 用户界面生成
- 格式：UUID v4（去除连字符，32 字符）
- 存储：SQLite 数据库 `api_keys` 表
- 有效期：可设置过期时间（可选），默认永久有效

**使用方式**:
```http
Authorization: Bearer YOUR_API_KEY
```

**示例**:
```bash
curl -H "Authorization: Bearer abc123def456..." http://127.0.0.1:8090/api/v1/profiles
```

### 安全措施

1. **本地绑定**: 只绑定 `127.0.0.1`，拒绝外部访问
2. **API Key 认证**: 所有请求必须携带有效 API Key
3. **请求频率限制**: 每个 API Key 限制 100 请求/分钟
4. **输入验证**: 所有输入参数严格验证
5. **HTTPS 支持**: 可选（本地环境通常不需要）

### 安全头设置

```typescript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-API-Version', 'v1');
```

## 📡 API 端点设计

### 基础信息

- **Base URL**: `http://127.0.0.1:{port}/api/v1`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

### 1. Profile 管理

#### 1.1 获取所有 Profile
```http
GET /api/v1/profiles
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile_001",
        "name": "Profile A",
        "status": "running",
        "port": 8080,
        "extensions": ["hofgfmmdolnmimplihglefekekfcfijf"],
        "createdAt": 1640995200000,
        "lastUsedAt": 1640995300000,
        "fingerprint": {
          "score": 95
        }
      }
    ],
    "total": 10,
    "running": 3
  }
}
```

#### 1.2 获取单个 Profile
```http
GET /api/v1/profiles/{profileId}
```

#### 1.3 启动 Profile
```http
POST /api/v1/profiles/{profileId}/start
```

**请求体**:
```json
{
  "windowNumber": 1,
  "options": {
    "headless": false
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "profileId": "profile_001",
    "status": "launching",
    "windowId": 12345
  }
}
```

#### 1.4 停止 Profile
```http
POST /api/v1/profiles/{profileId}/stop
```

#### 1.5 获取 Profile 截图
```http
GET /api/v1/profiles/{profileId}/screenshot
```

**响应**: 返回 base64 编码的 PNG 图片

### 2. 执行操作

#### 2.1 执行单个动作
```http
POST /api/v1/profiles/{profileId}/execute
```

**请求体**:
```json
{
  "actions": [
    {
      "action": "click",
      "selector": "#login-button",
      "timeout": 5000
    },
    {
      "action": "type",
      "selector": "#username",
      "value": "test@example.com",
      "clear": true
    },
    {
      "action": "wait",
      "selector": ".dashboard",
      "timeout": 10000
    }
  ],
  "options": {
    "waitForLoad": true,
    "timeout": 30000
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_123",
    "status": "completed",
    "results": [
      {
        "action": "click",
        "success": true,
        "duration": 1200
      }
    ],
    "totalDuration": 3500
  }
}
```

#### 2.2 执行工作流
```http
POST /api/v1/profiles/{profileId}/workflow/execute
```

**请求体**:
```json
{
  "workflow": {
    "id": "workflow_001",
    "name": "登录并提取数据",
    "steps": [
      {
        "id": "step_1",
        "name": "打开登录页面",
        "type": "action",
        "action": "goto",
        "value": "https://example.com/login",
        "timeout": 30000
      },
      {
        "id": "step_2",
        "name": "输入用户名",
        "type": "action",
        "action": "type",
        "selector": "#username",
        "value": "{{username}}",
        "timeout": 5000
      },
      {
        "id": "step_3",
        "name": "条件判断",
        "type": "if",
        "condition": "{{page.url}} contains 'dashboard'",
        "then": [
          {
            "id": "step_4",
            "name": "提取数据",
            "type": "extract",
            "selector": ".data-table",
            "variables": {
              "result": "extracted_data"
            }
          }
        ],
        "else": [
          {
            "id": "step_error",
            "name": "登录失败",
            "type": "action",
            "action": "stop"
          }
        ]
      }
    ]
  },
  "variables": {
    "username": "test@example.com",
    "password": "password123"
  },
  "options": {
    "timeout": 60000,
    "retryOnError": true
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_456",
    "status": "running",
    "estimatedDuration": 45000
  }
}
```

#### 2.3 获取工作流状态
```http
GET /api/v1/profiles/{profileId}/workflow/status/{taskId}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_456",
    "status": "running",
    "progress": {
      "currentStep": "step_3",
      "completedSteps": 2,
      "totalSteps": 5,
      "percentage": 40
    },
    "currentStep": {
      "id": "step_3",
      "name": "条件判断",
      "startTime": 1640995200000
    },
    "results": {
      "extracted_data": "<table>...</table>"
    },
    "errors": [],
    "startTime": 1640995100000,
    "estimatedEndTime": 1640995150000
  }
}
```

### 3. 批量操作

#### 3.1 批量执行
```http
POST /api/v1/batch/execute
```

**请求体**:
```json
{
  "targets": [
    {
      "profileId": "profile_001",
      "actions": [
        {
          "action": "click",
          "selector": "#button"
        }
      ]
    },
    {
      "profileId": "profile_002",
      "actions": [
        {
          "action": "type",
          "selector": "#input",
          "value": "test"
        }
      ]
    }
  ],
  "options": {
    "parallel": true,
    "maxConcurrency": 3,
    "timeout": 300000
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "batchId": "batch_789",
    "status": "running",
    "tasks": [
      {
        "profileId": "profile_001",
        "taskId": "task_001",
        "status": "completed"
      },
      {
        "profileId": "profile_002",
        "taskId": "task_002",
        "status": "running"
      }
    ]
  }
}
```

#### 3.2 批量工作流执行
```http
POST /api/v1/batch/workflow/execute
```

**请求体**:
```json
{
  "targets": [
    {
      "profileId": "profile_001",
      "workflow": {...},
      "variables": {...}
    }
  ],
  "options": {
    "parallel": true,
    "maxConcurrency": 3
  }
}
```

### 4. 扩展管理

#### 4.1 获取 Profile 的扩展列表
```http
GET /api/v1/profiles/{profileId}/extensions
```

#### 4.2 启用扩展
```http
POST /api/v1/profiles/{profileId}/extensions/{extensionId}/enable
```

#### 4.3 禁用扩展
```http
POST /api/v1/profiles/{profileId}/extensions/{extensionId}/disable
```

### 5. 工作流模板

#### 5.1 获取预置模板
```http
GET /api/v1/workflow/templates
```

#### 5.2 执行模板
```http
POST /api/v1/workflow/templates/{templateId}/execute
```

**请求体**:
```json
{
  "profileId": "profile_001",
  "variables": {
    "url": "https://example.com",
    "username": "test"
  }
}
```

### 6. 系统信息

#### 6.1 健康检查
```http
GET /api/v1/health
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600000,
    "profiles": {
      "total": 10,
      "running": 3
    }
  }
}
```

#### 6.2 获取 API 信息
```http
GET /api/v1/info
```

**响应**:
```json
{
  "success": true,
  "data": {
    "version": "v1",
    "endpoints": [
      "/api/v1/profiles",
      "/api/v1/profiles/{id}/execute",
      ...
    ],
    "websocket": {
      "url": "ws://127.0.0.1:8090/ws",
      "protocols": ["profile-status", "workflow-progress"]
    }
  }
}
```

## 🔄 WebSocket 实时通信

### 连接

```javascript
const ws = new WebSocket('ws://127.0.0.1:8090/ws', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
```

### 消息格式

**订阅消息**:
```json
{
  "type": "subscribe",
  "channels": ["profile_status", "workflow_progress"]
}
```

**状态推送**:
```json
{
  "type": "profile_status",
  "data": {
    "profileId": "profile_001",
    "status": "running",
    "timestamp": 1640995200000
  }
}
```

**工作流进度推送**:
```json
{
  "type": "workflow_progress",
  "data": {
    "taskId": "task_456",
    "profileId": "profile_001",
    "progress": {
      "currentStep": "step_3",
      "percentage": 40
    },
    "timestamp": 1640995200000
  }
}
```

## 📊 数据格式

### 标准请求格式

```json
{
  "jsonrpc": "2.0",
  "method": "execute",
  "params": {
    "profileId": "profile_001",
    "actions": [...]
  },
  "id": 1
}
```

### 标准响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": 1640995200000,
  "requestId": "req_123"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profile profile_001 not found",
    "details": {
      "profileId": "profile_001"
    }
  },
  "timestamp": 1640995200000,
  "requestId": "req_123"
}
```

## ⚠️ 错误处理

### 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效或缺失 |
| `PROFILE_NOT_FOUND` | 404 | Profile 不存在 |
| `PROFILE_NOT_RUNNING` | 400 | Profile 未运行 |
| `PROFILE_START_FAILED` | 500 | Profile 启动失败 |
| `EXECUTION_TIMEOUT` | 408 | 执行超时 |
| `EXECUTION_FAILED` | 500 | 执行失败 |
| `INVALID_SELECTOR` | 400 | 选择器无效 |
| `WORKFLOW_NOT_FOUND` | 404 | 工作流不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 内部服务器错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_RUNNING",
    "message": "Profile profile_001 is not running",
    "details": {
      "profileId": "profile_001",
      "currentStatus": "stopped"
    }
  }
}
```

## 🚀 实施计划

### Phase 1: 基础 API（2周）

**目标**: 实现核心 Profile 管理和基本执行能力

- [ ] HTTP 服务器框架搭建
- [ ] API Key 认证系统
- [ ] Profile CRUD 操作
- [ ] 基本执行 API（单个动作）
- [ ] 错误处理和验证
- [ ] 单元测试

### Phase 2: 工作流 API（3周）

**目标**: 实现完整的工作流执行能力

- [ ] 工作流执行引擎 API
- [ ] 工作流状态查询
- [ ] 工作流模板管理
- [ ] 变量插值和表达式解析
- [ ] 条件分支和循环支持
- [ ] 集成测试

### Phase 3: 批量操作（1周）

**目标**: 支持批量执行和并发控制

- [ ] 批量执行 API
- [ ] 并发控制机制
- [ ] 任务队列管理
- [ ] 批量状态查询

### Phase 4: 实时通信（2周）

**目标**: WebSocket 实时状态推送

- [ ] WebSocket 服务器
- [ ] 订阅/取消订阅机制
- [ ] Profile 状态推送
- [ ] 工作流进度推送
- [ ] 连接管理和心跳

### Phase 5: 完善和优化（1周）

**目标**: 性能优化和文档完善

- [ ] 性能优化
- [ ] API 文档生成
- [ ] 示例代码
- [ ] 集成测试完善

## 📝 数据库设计

### API Keys 表

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER,
  enabled INTEGER DEFAULT 1
);
```

### API 请求日志表（可选）

```sql
CREATE TABLE api_request_logs (
  id TEXT PRIMARY KEY,
  api_key_id TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  duration INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);
```

## 🔒 安全考虑

### 请求频率限制

- 每个 API Key: 100 请求/分钟
- 使用内存计数器（简单实现，无需 Redis）
- 超出限制返回 429 错误

### 输入验证

- 所有输入参数使用 Zod 验证
- 防止 SQL 注入（使用参数化查询）
- 防止 XSS（输出转义）

### 访问控制

- 只绑定本地地址（127.0.0.1）
- API Key 可以设置过期时间
- 支持禁用 API Key

## 📚 参考实现

### 相关代码位置

- `src/main/services/profilePanelServer.ts` - 现有 HTTP 服务器参考
- `src/main/services/profile/profile.service.ts` - Profile 服务
- `src/main/services/workflow/workflowEngine.service.ts` - 工作流引擎
- `src/main/services/execution.service.ts` - 执行服务

### 其他厂商参考

- **AdsPower API**: RESTful 设计，完整的 Profile 和工作流管理
- **Incogniton API**: RESTful + WebSocket，实时状态推送
- **Multilogin API**: 高性能并发处理，企业级功能

## 🎯 总结

本 HTTP API 设计提供了完整的 Profile 管理、工作流执行和实时监控能力，对标主流指纹浏览器厂商的 API 功能。

**关键特性**:
- ✅ RESTful API 设计
- ✅ 完整的工作流执行支持
- ✅ WebSocket 实时通信
- ✅ 批量操作支持
- ✅ 安全可靠，仅本地访问
- ✅ 简洁实现，无外部依赖（除 WebSocket）

---

**文档维护者**: VeilBrowser Team  
**最后更新**: 2025-01-XX
