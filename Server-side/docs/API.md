# API 文档

## 概述

这是寝室费用分摊记账系统的后端API文档。系统提供了用户管理、寝室管理、费用管理、账单管理、统计分析和实时通信等功能。

## 基础信息

- **基础URL**: `http://localhost:4000/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 认证

大部分API需要认证。在请求头中添加以下字段：

```
Authorization: Bearer <token>
```

## 通用响应格式

所有API响应都遵循以下格式：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

错误响应格式：

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

## 用户管理 API

### 用户注册

**POST** `/auth/register`

注册新用户。

**请求体**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "测试用户",
    "role": "user",
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "用户注册成功"
}
```

### 用户登录

**POST** `/auth/login`

用户登录获取访问令牌。

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_string",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "full_name": "测试用户",
      "role": "user"
    }
  },
  "message": "登录成功"
}
```

### 获取当前用户信息

**GET** `/users/me`

获取当前登录用户的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "测试用户",
    "role": "user",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### 更新用户信息

**PUT** `/users/me`

更新当前登录用户的信息。

**请求体**:
```json
{
  "email": "string",
  "full_name": "string",
  "avatar": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "updated@example.com",
    "full_name": "更新后的用户名",
    "role": "user",
    "avatar": "avatar_url",
    "updated_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "用户信息更新成功"
}
```

## 寝室管理 API

### 获取寝室列表

**GET** `/rooms`

获取用户所属的寝室列表。

**查询参数**:
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为10

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "101寝室",
      "description": "这是一个测试寝室",
      "creator_id": 1,
      "created_at": "2023-01-01T00:00:00.000Z",
      "members": [
        {
          "user_id": 1,
          "username": "testuser",
          "full_name": "测试用户",
          "role": "admin"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 创建寝室

**POST** `/rooms`

创建新寝室。

**请求体**:
```json
{
  "name": "string",
  "description": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "101寝室",
    "description": "这是一个测试寝室",
    "creator_id": 1,
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "寝室创建成功"
}
```

### 获取寝室详情

**GET** `/rooms/:id`

获取指定寝室的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "101寝室",
    "description": "这是一个测试寝室",
    "creator_id": 1,
    "created_at": "2023-01-01T00:00:00.000Z",
    "members": [
      {
        "user_id": 1,
        "username": "testuser",
        "full_name": "测试用户",
        "role": "admin",
        "joined_at": "2023-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 更新寝室信息

**PUT** `/rooms/:id`

更新指定寝室的信息。

**请求体**:
```json
{
  "name": "string",
  "description": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "更新后的寝室名称",
    "description": "更新后的寝室描述",
    "updated_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "寝室信息更新成功"
}
```

### 添加寝室成员

**POST** `/rooms/:id/members`

向指定寝室添加成员。

**请求体**:
```json
{
  "user_id": 2,
  "role": "member"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "user_id": 2,
    "role": "member",
    "joined_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "成员添加成功"
}
```

### 移除寝室成员

**DELETE** `/rooms/:id/members/:userId`

从指定寝室移除成员。

**响应**:
```json
{
  "success": true,
  "message": "成员移除成功"
}
```

## 费用管理 API

### 创建费用记录

**POST** `/expenses`

创建新的费用记录。

**请求体**:
```json
{
  "title": "string",
  "amount": "number",
  "category": "string",
  "description": "string",
  "date": "string",
  "room_id": "number",
  "split_type": "equal|custom|percentage",
  "paid_by": "number",
  "splits": [
    {
      "user_id": "number",
      "amount": "number",
      "percentage": "number"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "测试费用",
    "amount": 100.50,
    "category": "food",
    "description": "这是一个测试费用",
    "date": "2023-01-01",
    "room_id": 1,
    "split_type": "equal",
    "paid_by": 1,
    "created_by": 1,
    "created_at": "2023-01-01T00:00:00.000Z",
    "splits": [
      {
        "id": 1,
        "user_id": 1,
        "amount": 50.25,
        "is_paid": false
      }
    ]
  },
  "message": "费用创建成功"
}
```

### 获取费用列表

**GET** `/expenses`

获取费用列表。

**查询参数**:
- `room_id` (可选): 寝室ID
- `category` (可选): 费用类别
- `paid_by` (可选): 支付人ID
- `is_paid` (可选): 是否已支付
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为10

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "测试费用",
      "amount": 100.50,
      "category": "food",
      "date": "2023-01-01",
      "room_id": 1,
      "paid_by": 1,
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 获取费用详情

**GET** `/expenses/:id`

获取指定费用的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "测试费用",
    "amount": 100.50,
    "category": "food",
    "description": "这是一个测试费用",
    "date": "2023-01-01",
    "room_id": 1,
    "split_type": "equal",
    "paid_by": 1,
    "created_by": 1,
    "created_at": "2023-01-01T00:00:00.000Z",
    "splits": [
      {
        "id": 1,
        "user_id": 1,
        "amount": 50.25,
        "is_paid": false,
        "user": {
          "id": 1,
          "username": "testuser",
          "full_name": "测试用户"
        }
      }
    ]
  }
}
```

### 更新费用记录

**PUT** `/expenses/:id`

更新指定费用的信息。

**请求体**:
```json
{
  "title": "string",
  "amount": "number",
  "category": "string",
  "description": "string",
  "date": "string",
  "split_type": "equal|custom|percentage",
  "splits": [
    {
      "user_id": "number",
      "amount": "number",
      "percentage": "number"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "更新后的费用",
    "amount": 150.75,
    "updated_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "费用更新成功"
}
```

### 确认分摊支付

**POST** `/expenses/:id/confirm-split`

确认费用分摊的支付。

**请求体**:
```json
{
  "split_id": "number"
}
```

**响应**:
```json
{
  "success": true,
  "message": "分摊支付确认成功"
}
```

### 删除费用记录

**DELETE** `/expenses/:id`

删除指定的费用记录。

**响应**:
```json
{
  "success": true,
  "message": "费用删除成功"
}
```

## 账单管理 API

### 创建账单

**POST** `/bills`

创建新账单。

**请求体**:
```json
{
  "title": "string",
  "description": "string",
  "due_date": "string",
  "room_id": "number",
  "items": [
    {
      "expense_id": "number",
      "amount": "number"
    }
  ],
  "split_type": "equal|custom|percentage"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "测试账单",
    "description": "这是一个测试账单",
    "due_date": "2023-12-31",
    "room_id": 1,
    "status": "pending",
    "total_amount": 100.50,
    "created_by": 1,
    "created_at": "2023-01-01T00:00:00.000Z",
    "splits": [
      {
        "id": 1,
        "user_id": 1,
        "amount": 50.25,
        "is_paid": false
      }
    ]
  },
  "message": "账单创建成功"
}
```

### 获取账单列表

**GET** `/bills`

获取账单列表。

**查询参数**:
- `room_id` (可选): 寝室ID
- `status` (可选): 账单状态 (pending, approved, rejected)
- `created_by` (可选): 创建人ID
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为10

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "测试账单",
      "due_date": "2023-12-31",
      "room_id": 1,
      "status": "pending",
      "total_amount": 100.50,
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 获取账单详情

**GET** `/bills/:id`

获取指定账单的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "测试账单",
    "description": "这是一个测试账单",
    "due_date": "2023-12-31",
    "room_id": 1,
    "status": "pending",
    "total_amount": 100.50,
    "created_by": 1,
    "created_at": "2023-01-01T00:00:00.000Z",
    "items": [
      {
        "expense_id": 1,
        "amount": 100.50,
        "expense": {
          "id": 1,
          "title": "测试费用",
          "category": "food"
        }
      }
    ],
    "splits": [
      {
        "id": 1,
        "user_id": 1,
        "amount": 50.25,
        "is_paid": false,
        "user": {
          "id": 1,
          "username": "testuser",
          "full_name": "测试用户"
        }
      }
    ]
  }
}
```

### 审核账单

**POST** `/bills/:id/review`

审核账单。

**请求体**:
```json
{
  "status": "approved|rejected",
  "review_comment": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "review_comment": "审核通过",
    "reviewed_by": 1,
    "reviewed_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "账单审核成功"
}
```

### 确认账单支付

**POST** `/bills/:id/confirm-payment`

确认账单分摊的支付。

**请求体**:
```json
{
  "split_id": "number"
}
```

**响应**:
```json
{
  "success": true,
  "message": "账单支付确认成功"
}
```

### 获取用户账单统计

**GET** `/bills/user-stats`

获取当前用户的账单统计信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "total_bills": 5,
    "total_amount": 500.00,
    "paid_amount": 300.00,
    "unpaid_amount": 200.00,
    "pending_bills": 2,
    "approved_bills": 3
  }
}
```

## 统计分析 API

### 获取用户统计信息

**GET** `/stats/user`

获取当前用户的统计信息。

**查询参数**:
- `room_id` (可选): 寝室ID
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应**:
```json
{
  "success": true,
  "data": {
    "total_expenses": 10,
    "total_amount": 1000.00,
    "paid_amount": 600.00,
    "owed_amount": 400.00,
    "expense_by_category": [
      {
        "category": "food",
        "amount": 500.00,
        "count": 5
      },
      {
        "category": "utilities",
        "amount": 300.00,
        "count": 3
      }
    ],
    "monthly_trend": [
      {
        "month": "2023-01",
        "amount": 200.00
      },
      {
        "month": "2023-02",
        "amount": 300.00
      }
    ]
  }
}
```

### 获取寝室统计信息

**GET** `/stats/room/:id`

获取指定寝室的统计信息。

**查询参数**:
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应**:
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "room_name": "101寝室",
    "total_expenses": 20,
    "total_amount": 2000.00,
    "member_balance": [
      {
        "user_id": 1,
        "username": "testuser",
        "full_name": "测试用户",
        "paid": 1200.00,
        "owed": 800.00,
        "balance": 400.00
      }
    ],
    "expense_by_category": [
      {
        "category": "food",
        "amount": 1000.00,
        "count": 10
      }
    ]
  }
}
```

### 获取系统统计信息

**GET** `/stats/system`

获取系统统计信息（仅管理员可访问）。

**响应**:
```json
{
  "success": true,
  "data": {
    "total_users": 100,
    "total_rooms": 20,
    "total_expenses": 500,
    "total_amount": 50000.00,
    "user_growth": [
      {
        "month": "2023-01",
        "count": 10
      },
      {
        "month": "2023-02",
        "count": 15
      }
    ],
    "room_growth": [
      {
        "month": "2023-01",
        "count": 2
      },
      {
        "month": "2023-02",
        "count": 3
      }
    ]
  }
}
```

## 支付优化 API

### 获取离线支付记录

**GET** `/payments/offline`

获取当前用户的离线支付记录。

**查询参数**:
- `room_id` (可选): 寝室ID
- `status` (可选): 支付状态 (pending, synced, failed)
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为10

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "bill_id": 1,
      "amount": 100.50,
      "payment_method": "alipay",
      "payment_time": "2023-01-01T12:00:00.000Z",
      "transaction_id": "202301011200123456789",
      "status": "pending",
      "sync_status": "pending",
      "created_at": "2023-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 创建离线支付记录

**POST** `/payments/offline`

创建新的离线支付记录。

**请求体**:
```json
{
  "bill_id": "number",
  "amount": "number",
  "payment_method": "string",
  "payment_time": "string",
  "transaction_id": "string",
  "note": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "bill_id": 1,
    "amount": 100.50,
    "payment_method": "alipay",
    "payment_time": "2023-01-01T12:00:00.000Z",
    "transaction_id": "202301011200123456789",
    "status": "pending",
    "sync_status": "pending",
    "note": "线下支付",
    "created_at": "2023-01-01T12:00:00.000Z"
  },
  "message": "离线支付记录创建成功"
}
```

### 同步离线支付记录

**POST** `/payments/:paymentId/sync`

同步指定的离线支付记录。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "synced",
    "sync_status": "success",
    "synced_at": "2023-01-01T12:05:00.000Z"
  },
  "message": "离线支付记录同步成功"
}
```

### 获取待同步的支付记录

**GET** `/payments/offline/pending-sync`

获取当前用户待同步的支付记录。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "bill_id": 1,
      "amount": 100.50,
      "payment_method": "alipay",
      "payment_time": "2023-01-01T12:00:00.000Z",
      "transaction_id": "202301011200123456789",
      "status": "pending",
      "sync_status": "pending",
      "created_at": "2023-01-01T12:00:00.000Z"
    }
  ]
}
```

### 标记支付记录同步失败

**POST** `/payments/:paymentId/sync-failed`

标记指定支付记录同步失败。

**请求体**:
```json
{
  "error_message": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sync_status": "failed",
    "error_message": "网络连接失败",
    "failed_at": "2023-01-01T12:05:00.000Z"
  },
  "message": "支付记录同步失败标记成功"
}
```

### 重试同步失败的支付记录

**POST** `/payments/:paymentId/retry-sync`

重试同步失败的支付记录。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "synced",
    "sync_status": "success",
    "synced_at": "2023-01-01T12:05:00.000Z",
    "retry_count": 1
  },
  "message": "支付记录重试同步成功"
}
```

### 获取支付记录详情

**GET** `/payments/records/:id`

获取指定支付记录的详细信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "bill_id": 1,
    "amount": 100.50,
    "payment_method": "alipay",
    "payment_time": "2023-01-01T12:00:00.000Z",
    "transaction_id": "202301011200123456789",
    "status": "synced",
    "sync_status": "success",
    "note": "线下支付",
    "created_at": "2023-01-01T12:00:00.000Z",
    "updated_at": "2023-01-01T12:05:00.000Z",
    "user": {
      "id": 1,
      "username": "testuser",
      "full_name": "测试用户"
    },
    "bill": {
      "id": 1,
      "title": "测试账单",
      "total_amount": 100.50
    }
  }
}
```

### 获取用户支付统计

**GET** `/payments/stats/user`

获取当前用户的支付统计信息。

**查询参数**:
- `room_id` (可选): 寝室ID
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应**:
```json
{
  "success": true,
  "data": {
    "total_payments": 10,
    "total_amount": 1000.00,
    "offline_payments": 3,
    "offline_amount": 300.00,
    "online_payments": 7,
    "online_amount": 700.00,
    "pending_sync": 1,
    "failed_sync": 0,
    "payment_methods": [
      {
        "method": "alipay",
        "count": 5,
        "amount": 500.00
      },
      {
        "method": "wechat",
        "count": 5,
        "amount": 500.00
      }
    ]
  }
}
```

### 获取房间支付统计

**GET** `/payments/stats/room/:id`

获取指定房间的支付统计信息。

**查询参数**:
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应**:
```json
{
  "success": true,
  "data": {
    "room_id": 1,
    "room_name": "101寝室",
    "total_payments": 20,
    "total_amount": 2000.00,
    "offline_payments": 5,
    "offline_amount": 500.00,
    "online_payments": 15,
    "online_amount": 1500.00,
    "pending_sync": 2,
    "failed_sync": 1,
    "member_stats": [
      {
        "user_id": 1,
        "username": "testuser",
        "full_name": "测试用户",
        "total_payments": 5,
        "total_amount": 500.00
      }
    ]
  }
}
```

## 定时任务 API

### 手动触发定时任务

**POST** `/payment-optimization/trigger-task`

手动触发支付优化相关的定时任务。

**请求体**:
```json
{
  "task_type": "payment_reminder|payment_sync|payment_cleanup"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "task_123456789",
    "task_type": "payment_reminder",
    "status": "running",
    "started_at": "2023-01-01T12:00:00.000Z"
  },
  "message": "定时任务触发成功"
}
```

### 获取定时任务状态

**GET** `/payment-optimization/task-status`

获取支付优化相关定时任务的状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "payment_reminder": {
      "status": "running",
      "last_run": "2023-01-01T12:00:00.000Z",
      "next_run": "2023-01-02T12:00:00.000Z",
      "success_count": 10,
      "failure_count": 0
    },
    "payment_sync": {
      "status": "idle",
      "last_run": "2023-01-01T11:00:00.000Z",
      "next_run": "2023-01-01T13:00:00.000Z",
      "success_count": 8,
      "failure_count": 2
    },
    "payment_cleanup": {
      "status": "idle",
      "last_run": "2023-01-01T00:00:00.000Z",
      "next_run": "2023-01-02T00:00:00.000Z",
      "success_count": 5,
      "failure_count": 0
    }
  }
}
```

## WebSocket 实时通信

系统支持WebSocket实时通信，用于推送费用、账单和支付相关的实时通知。

### 连接WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function() {
  // 连接成功后发送认证信息
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_jwt_token'
  }));
};
```

### 订阅事件

```javascript
// 订阅费用事件
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['expenses']
}));

// 订阅账单事件
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['bills']
}));

// 订阅支付事件
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['payments']
}));
```

### 事件类型

- `expense_created`: 费用创建事件
- `expense_updated`: 费用更新事件
- `bill_created`: 账单创建事件
- `bill_reviewed`: 账单审核事件
- `bill_payment_confirmed`: 账单支付确认事件
- `payment_created`: 支付记录创建事件
- `payment_synced`: 支付记录同步成功事件
- `payment_sync_failed`: 支付记录同步失败事件
- `payment_reminder_sent`: 支付提醒发送事件
- `split_payment_confirmed`: 分摊支付确认事件
- `review_status_updated`: 审核状态更新事件
- `dispute_processed`: 争议处理事件
- `room_member_changed`: 寝室成员变更事件
- `notification`: 通知事件
- `system_status_updated`: 系统状态更新事件

### 事件数据格式

```json
{
  "type": "payment_synced",
  "data": {
    "id": 1,
    "user_id": 1,
    "bill_id": 1,
    "amount": 100.50,
    "status": "synced",
    "synced_at": "2023-01-01T12:05:00.000Z"
  },
  "timestamp": "2023-01-01T12:05:00.000Z"
}
```

## 错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| AUTH_REQUIRED | 401 | 需要认证 |
| AUTH_INVALID | 401 | 认证无效 |
| AUTH_EXPIRED | 401 | 认证已过期 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| DUPLICATE_ENTRY | 409 | 重复条目 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| DATABASE_ERROR | 500 | 数据库错误 |

## 限制

- API请求频率限制：每分钟100次
- 文件上传大小限制：5MB
- 批量操作限制：每次最多100条记录

## 版本历史

- v1.0.0: 初始版本，包含基本的用户、寝室、费用和账单管理功能
- v1.1.0: 添加支付优化功能，包括离线支付记录管理、支付同步机制和定时任务支持
  - 新增离线支付记录创建、查询、同步和重试功能
  - 新增支付统计功能，支持用户和房间维度的支付数据分析
  - 新增定时任务管理，支持支付提醒、同步和清理任务
  - 扩展WebSocket事件，支持支付相关实时通知