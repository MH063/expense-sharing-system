# 记账系统 API 接口文档

## 目录
1. [费用管理接口](#费用管理接口)
2. [支付管理接口](#支付管理接口)
3. [争议管理接口](#争议管理接口)
4. [通知管理接口](#通知管理接口)
5. [管理端接口](#管理端接口)

---

## 费用管理接口

### 1. 创建费用记录

**接口地址**: `POST /api/expenses`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "room_id": "寝室ID",
  "user_id": "创建用户ID",
  "amount": 100.50,
  "description": "费用描述",
  "category": "费用类别",
  "date": "2023-01-01",
  "split_type": "equal|custom", // 分摊类型：equal平均分摊，custom自定义分摊
  "split_details": [ // 自定义分摊详情，split_type为custom时必填
    {
      "user_id": "用户ID",
      "amount": 50.25
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "expense_id": "费用ID",
    "room_id": "寝室ID",
    "user_id": "创建用户ID",
    "amount": 100.50,
    "description": "费用描述",
    "category": "费用类别",
    "date": "2023-01-01",
    "split_type": "equal",
    "status": "pending",
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "费用记录创建成功"
}
```

**注意事项**:
- 需要用户认证
- 金额必须大于0
- 分摊类型为equal时，系统自动平均分摊给寝室所有成员
- 分摊类型为custom时，必须提供split_details且总金额必须与费用金额相等

---

### 2. 获取费用列表

**接口地址**: `GET /api/expenses`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
room_id: 寝室ID（可选）
status: 费用状态（可选，pending|paid|cancelled）
category: 费用类别（可选）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "expense_id": "费用ID",
        "room_id": "寝室ID",
        "user_id": "创建用户ID",
        "amount": 100.50,
        "description": "费用描述",
        "category": "费用类别",
        "date": "2023-01-01",
        "split_type": "equal",
        "status": "pending",
        "created_at": "2023-01-01T00:00:00.000Z",
        "updated_at": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

---

### 3. 获取费用详情

**接口地址**: `GET /api/expenses/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "expense": {
      "expense_id": "费用ID",
      "room_id": "寝室ID",
      "user_id": "创建用户ID",
      "amount": 100.50,
      "description": "费用描述",
      "category": "费用类别",
      "date": "2023-01-01",
      "split_type": "equal",
      "status": "pending",
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z"
    },
    "splits": [
      {
        "split_id": "分摊ID",
        "user_id": "用户ID",
        "amount": 25.125,
        "status": "pending",
        "paid_at": null
      }
    ]
  }
}
```

---

### 4. 更新费用记录

**接口地址**: `PUT /api/expenses/:id`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "amount": 100.50,
  "description": "费用描述",
  "category": "费用类别",
  "date": "2023-01-01"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "expense_id": "费用ID",
    "room_id": "寝室ID",
    "user_id": "创建用户ID",
    "amount": 100.50,
    "description": "费用描述",
    "category": "费用类别",
    "date": "2023-01-01",
    "split_type": "equal",
    "status": "pending",
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T01:00:00.000Z"
  },
  "message": "费用记录更新成功"
}
```

**注意事项**:
- 只有费用创建者可以更新费用记录
- 费用状态为paid或cancelled时不能更新

---

### 5. 删除费用记录

**接口地址**: `DELETE /api/expenses/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "费用记录删除成功"
}
```

**注意事项**:
- 只有费用创建者可以删除费用记录
- 费用状态为paid或cancelled时不能删除

---

### 6. 获取费用统计

**接口地址**: `GET /api/expenses/stats`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
room_id: 寝室ID（可选）
user_id: 用户ID（可选）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total_amount": 1000.50,
    "total_count": 20,
    "paid_amount": 800.00,
    "paid_count": 16,
    "pending_amount": 200.50,
    "pending_count": 4,
    "categories": [
      {
        "category": "餐饮",
        "amount": 500.25,
        "count": 10
      },
      {
        "category": "日用品",
        "amount": 300.25,
        "count": 6
      }
    ],
    "monthly_trend": [
      {
        "month": "2023-01",
        "amount": 500.25,
        "count": 10
      },
      {
        "month": "2023-02",
        "amount": 500.25,
        "count": 10
      }
    ]
  }
}
```

---

## 支付管理接口

### 1. 创建支付记录

**接口地址**: `POST /api/payments`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "expense_id": "费用ID",
  "split_id": "分摊ID",
  "amount": 25.125,
  "payment_method": "cash|transfer|alipay|wechat", // 支付方式
  "payment_time": "2023-01-01T12:00:00.000Z", // 支付时间（可选，默认当前时间）
  "note": "支付备注"（可选）
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "payment_id": "支付ID",
    "expense_id": "费用ID",
    "split_id": "分摊ID",
    "user_id": "支付用户ID",
    "amount": 25.125,
    "payment_method": "cash",
    "payment_time": "2023-01-01T12:00:00.000Z",
    "status": "completed",
    "note": "支付备注",
    "created_at": "2023-01-01T12:00:00.000Z"
  },
  "message": "支付记录创建成功"
}
```

**注意事项**:
- 需要用户认证
- 只能为自己的分摊记录创建支付
- 支付金额必须与分摊金额相等
- 分摊状态为paid时不能再次支付

---

### 2. 获取支付记录列表

**接口地址**: `GET /api/payments`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
expense_id: 费用ID（可选）
user_id: 用户ID（可选）
payment_method: 支付方式（可选）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "payment_id": "支付ID",
        "expense_id": "费用ID",
        "split_id": "分摊ID",
        "user_id": "支付用户ID",
        "amount": 25.125,
        "payment_method": "cash",
        "payment_time": "2023-01-01T12:00:00.000Z",
        "status": "completed",
        "note": "支付备注",
        "created_at": "2023-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "total_pages": 2
    }
  }
}
```

---

### 3. 获取支付详情

**接口地址**: `GET /api/payments/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "payment_id": "支付ID",
      "expense_id": "费用ID",
      "split_id": "分摊ID",
      "user_id": "支付用户ID",
      "amount": 25.125,
      "payment_method": "cash",
      "payment_time": "2023-01-01T12:00:00.000Z",
      "status": "completed",
      "note": "支付备注",
      "created_at": "2023-01-01T12:00:00.000Z"
    },
    "expense": {
      "expense_id": "费用ID",
      "description": "费用描述",
      "category": "费用类别",
      "date": "2023-01-01"
    }
  }
}
```

---

### 4. 更新支付记录

**接口地址**: `PUT /api/payments/:id`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "payment_method": "cash|transfer|alipay|wechat",
  "payment_time": "2023-01-01T12:00:00.000Z",
  "note": "支付备注"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "payment_id": "支付ID",
    "expense_id": "费用ID",
    "split_id": "分摊ID",
    "user_id": "支付用户ID",
    "amount": 25.125,
    "payment_method": "transfer",
    "payment_time": "2023-01-01T12:00:00.000Z",
    "status": "completed",
    "note": "更新后的支付备注",
    "created_at": "2023-01-01T12:00:00.000Z",
    "updated_at": "2023-01-01T13:00:00.000Z"
  },
  "message": "支付记录更新成功"
}
```

**注意事项**:
- 只有支付创建者可以更新支付记录
- 支付状态为refunded时不能更新

---

### 5. 删除支付记录

**接口地址**: `DELETE /api/payments/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "支付记录删除成功"
}
```

**注意事项**:
- 只有支付创建者可以删除支付记录
- 支付状态为refunded时不能删除

---

### 6. 获取支付统计

**接口地址**: `GET /api/payments/stats`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
room_id: 寝室ID（可选）
user_id: 用户ID（可选）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total_amount": 800.00,
    "total_count": 16,
    "payment_methods": [
      {
        "method": "cash",
        "amount": 400.00,
        "count": 8
      },
      {
        "method": "transfer",
        "amount": 400.00,
        "count": 8
      }
    ],
    "monthly_trend": [
      {
        "month": "2023-01",
        "amount": 400.00,
        "count": 8
      },
      {
        "month": "2023-02",
        "amount": 400.00,
        "count": 8
      }
    ]
  }
}
```

---

## 争议管理接口

### 1. 创建争议

**接口地址**: `POST /api/disputes`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "expense_id": "费用ID",
  "title": "争议标题",
  "description": "争议描述",
  "type": "amount|description|other" // 争议类型：amount金额争议，description描述争议，other其他争议
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "dispute_id": "争议ID",
    "expense_id": "费用ID",
    "user_id": "创建用户ID",
    "title": "争议标题",
    "description": "争议描述",
    "type": "amount",
    "status": "open",
    "created_at": "2023-01-01T12:00:00.000Z",
    "updated_at": "2023-01-01T12:00:00.000Z"
  },
  "message": "争议创建成功"
}
```

**注意事项**:
- 需要用户认证
- 只能为涉及自己的费用创建争议
- 费用状态为cancelled时不能创建争议
- 同一费用只能有一个未解决的争议

---

### 2. 获取争议列表

**接口地址**: `GET /api/disputes`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
expense_id: 费用ID（可选）
user_id: 用户ID（可选）
status: 争议状态（可选，open|resolved|rejected）
type: 争议类型（可选，amount|description|other）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "disputes": [
      {
        "dispute_id": "争议ID",
        "expense_id": "费用ID",
        "user_id": "创建用户ID",
        "title": "争议标题",
        "description": "争议描述",
        "type": "amount",
        "status": "open",
        "created_at": "2023-01-01T12:00:00.000Z",
        "updated_at": "2023-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

---

### 3. 获取争议详情

**接口地址**: `GET /api/disputes/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "dispute": {
      "dispute_id": "争议ID",
      "expense_id": "费用ID",
      "user_id": "创建用户ID",
      "title": "争议标题",
      "description": "争议描述",
      "type": "amount",
      "status": "open",
      "created_at": "2023-01-01T12:00:00.000Z",
      "updated_at": "2023-01-01T12:00:00.000Z"
    },
    "expense": {
      "expense_id": "费用ID",
      "description": "费用描述",
      "amount": 100.50,
      "category": "费用类别",
      "date": "2023-01-01"
    },
    "messages": [
      {
        "message_id": "消息ID",
        "dispute_id": "争议ID",
        "user_id": "发送者ID",
        "content": "消息内容",
        "created_at": "2023-01-01T12:30:00.000Z"
      }
    ]
  }
}
```

---

### 4. 添加争议消息

**接口地址**: `POST /api/disputes/:id/messages`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "content": "消息内容"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "message_id": "消息ID",
    "dispute_id": "争议ID",
    "user_id": "发送者ID",
    "content": "消息内容",
    "created_at": "2023-01-01T12:30:00.000Z"
  },
  "message": "消息添加成功"
}
```

**注意事项**:
- 需要用户认证
- 只有争议创建者、费用创建者和管理员可以添加消息
- 争议状态为resolved或rejected时不能添加消息

---

### 5. 解决争议

**接口地址**: `PUT /api/disputes/:id/resolve`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "resolution": "解决方案描述",
  "action": "accept|reject|modify" // 处理方式：accept接受争议，reject拒绝争议，modify修改费用
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "dispute_id": "争议ID",
    "status": "resolved",
    "resolution": "解决方案描述",
    "resolved_by": "解决者ID",
    "resolved_at": "2023-01-01T13:00:00.000Z"
  },
  "message": "争议解决成功"
}
```

**注意事项**:
- 需要用户认证
- 只有费用创建者和管理员可以解决争议
- 争议状态为resolved或rejected时不能再次解决
- action为modify时，系统会自动修改费用并通知相关人员

---

## 通知管理接口

### 1. 获取通知列表

**接口地址**: `GET /api/notifications`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
type: 通知类型（可选，expense|payment|dispute|system）
is_read: 是否已读（可选，true|false）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notification_id": "通知ID",
        "user_id": "接收者ID",
        "type": "expense",
        "title": "通知标题",
        "content": "通知内容",
        "related_id": "相关ID",
        "is_read": false,
        "created_at": "2023-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "total_pages": 2
    }
  }
}
```

---

### 2. 获取通知详情

**接口地址**: `GET /api/notifications/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "notification": {
      "notification_id": "通知ID",
      "user_id": "接收者ID",
      "type": "expense",
      "title": "通知标题",
      "content": "通知内容",
      "related_id": "相关ID",
      "is_read": false,
      "created_at": "2023-01-01T12:00:00.000Z"
    },
    "related_data": {
      "expense_id": "费用ID",
      "description": "费用描述",
      "amount": 100.50
    }
  }
}
```

---

### 3. 标记通知为已读

**接口地址**: `PUT /api/notifications/:id/read`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "notification_id": "通知ID",
    "is_read": true,
    "read_at": "2023-01-01T13:00:00.000Z"
  },
  "message": "通知已标记为已读"
}
```

**注意事项**:
- 需要用户认证
- 只能标记自己的通知为已读

---

### 4. 批量标记通知为已读

**接口地址**: `PUT /api/notifications/read-batch`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "notification_ids": ["通知ID1", "通知ID2", "通知ID3"] // 通知ID数组
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "updated_count": 3
  },
  "message": "批量标记通知为已读成功"
}
```

**注意事项**:
- 需要用户认证
- 只能标记自己的通知为已读

---

### 5. 删除通知

**接口地址**: `DELETE /api/notifications/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "message": "通知删除成功"
}
```

**注意事项**:
- 需要用户认证
- 只能删除自己的通知

---

### 6. 获取未读通知数量

**接口地址**: `GET /api/notifications/unread-count`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

## 管理端接口

### 1. 管理员登录

**接口地址**: `POST /api/admin/auth/login`

**请求头**:
```
Content-Type: application/json
```

**请求参数**:
```json
{
  "username": "管理员用户名",
  "password": "管理员密码"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "JWT令牌",
    "user": {
      "user_id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "role": "系统管理员",
      "last_login": "2023-01-01T12:00:00.000Z"
    }
  },
  "message": "登录成功"
}
```

**注意事项**:
- 使用登录频率限制，防止暴力破解
- 登录失败次数过多会临时锁定账户
- 令牌有效期为24小时

---

### 2. 获取系统配置

**接口地址**: `GET /api/system-config`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "system_name": "寝室记账系统",
    "version": "1.0.0",
    "maintenance_mode": false,
    "max_users_per_room": 8,
    "expense_categories": ["餐饮", "日用品", "娱乐", "其他"],
    "payment_methods": ["现金", "转账", "支付宝", "微信"],
    "notification_settings": {
      "email_enabled": true,
      "sms_enabled": false,
      "push_enabled": true
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 3. 更新系统配置

**接口地址**: `PUT /api/system-config`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "system_name": "寝室记账系统",
  "maintenance_mode": false,
  "max_users_per_room": 8,
  "expense_categories": ["餐饮", "日用品", "娱乐", "其他"],
  "payment_methods": ["现金", "转账", "支付宝", "微信"],
  "notification_settings": {
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "updated_config": {
      "system_name": "寝室记账系统",
      "maintenance_mode": false,
      "max_users_per_room": 8,
      "expense_categories": ["餐饮", "日用品", "娱乐", "其他"],
      "payment_methods": ["现金", "转账", "支付宝", "微信"],
      "notification_settings": {
        "email_enabled": true,
        "sms_enabled": false,
        "push_enabled": true
      }
    }
  },
  "message": "系统配置更新成功"
}
```

**注意事项**:
- 需要管理员权限
- 更新系统配置会记录审计日志

---

### 4. 获取用户列表

**接口地址**: `GET /api/admin/users`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
role: 用户角色（可选）
status: 用户状态（可选，active|inactive|suspended）
room_id: 寝室ID（可选）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": "用户ID",
        "username": "用户名",
        "email": "邮箱",
        "role": "普通用户",
        "status": "active",
        "room_id": "寝室ID",
        "room_name": "寝室名称",
        "created_at": "2023-01-01T00:00:00.000Z",
        "last_login": "2023-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 5. 获取用户详情

**接口地址**: `GET /api/admin/users/:id`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "role": "普通用户",
      "status": "active",
      "room_id": "寝室ID",
      "room_name": "寝室名称",
      "created_at": "2023-01-01T00:00:00.000Z",
      "last_login": "2023-01-01T12:00:00.000Z"
    },
    "stats": {
      "total_expenses": 10,
      "total_amount": 500.50,
      "total_payments": 8,
      "total_paid": 400.25,
      "pending_payments": 2,
      "pending_amount": 100.25
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 6. 更新用户角色

**接口地址**: `PUT /api/admin/users/:id/role`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "role": "普通用户|寝室长|系统管理员"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user_id": "用户ID",
    "role": "寝室长",
    "updated_at": "2023-01-01T13:00:00.000Z"
  },
  "message": "用户角色更新成功"
}
```

**注意事项**:
- 需要管理员权限
- 不能修改自己的角色
- 更新用户角色会记录审计日志

---

### 7. 获取系统统计信息

**接口地址**: `GET /api/stats/system`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "active": 95,
      "new_this_month": 10
    },
    "rooms": {
      "total": 25,
      "active": 23
    },
    "expenses": {
      "total": 1000,
      "this_month": 100,
      "total_amount": 10000.50,
      "this_month_amount": 1000.50
    },
    "payments": {
      "total": 800,
      "this_month": 80,
      "total_amount": 8000.00,
      "this_month_amount": 800.00
    },
    "disputes": {
      "total": 50,
      "open": 5,
      "resolved": 40,
      "rejected": 5
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 8. 获取系统性能指标

**接口地址**: `GET /api/monitoring/performance-metrics`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "server": {
      "uptime": 86400,
      "memory_usage": {
        "used": 500000000,
        "total": 1000000000,
        "percentage": 50
      },
      "cpu_usage": {
        "user": 10,
        "system": 5,
        "idle": 85
      }
    },
    "database": {
      "connections": 10,
      "queries_per_second": 50,
      "response_time": 10
    },
    "api": {
      "requests_per_minute": 100,
      "average_response_time": 200,
      "error_rate": 0.01
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 9. 获取用户活动日志

**接口地址**: `GET /api/monitoring/user-activity-logs`

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```
user_id: 用户ID（可选）
action: 操作类型（可选）
start_date: 开始日期（可选，格式：YYYY-MM-DD）
end_date: 结束日期（可选，格式：YYYY-MM-DD）
page: 页码（默认1）
limit: 每页数量（默认10）
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "log_id": "日志ID",
        "user_id": "用户ID",
        "username": "用户名",
        "action": "创建费用",
        "resource": "费用",
        "resource_id": "费用ID",
        "ip_address": "192.168.1.1",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2023-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "total_pages": 10
    }
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 10. 获取角色列表

**接口地址**: `GET /api/roles`

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "role_id": "角色ID",
        "name": "普通用户",
        "description": "普通用户角色",
        "permissions": [
          {
            "permission_id": "权限ID",
            "name": "查看费用",
            "resource": "费用",
            "action": "read"
          }
        ],
        "created_at": "2023-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**注意事项**:
- 需要管理员权限

---

### 11. 创建角色

**接口地址**: `POST /api/roles`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "name": "新角色名称",
  "description": "角色描述",
  "permissions": ["权限ID1", "权限ID2"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "role_id": "角色ID",
    "name": "新角色名称",
    "description": "角色描述",
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "角色创建成功"
}
```

**注意事项**:
- 需要管理员权限
- 创建角色会记录审计日志

---

### 12. 分配权限给角色

**接口地址**: `POST /api/roles/:id/permissions`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求参数**:
```json
{
  "permission_ids": ["权限ID1", "权限ID2"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "role_id": "角色ID",
    "permission_ids": ["权限ID1", "权限ID2"],
    "updated_at": "2023-01-01T00:00:00.000Z"
  },
  "message": "权限分配成功"
}
```

**注意事项**:
- 需要管理员权限
- 分配权限会记录审计日志

---

## 错误响应格式

所有接口在出错时会返回统一的错误响应格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息（可选）"
  }
}
```

常见错误代码：
- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 参数验证失败
- `CONFLICT`: 资源冲突
- `INTERNAL_ERROR`: 服务器内部错误

---

## 认证说明

大部分接口需要在请求头中包含JWT令牌进行认证：

```
Authorization: Bearer <token>
```

令牌可以通过登录接口获取，有效期为24小时。令牌过期后需要重新登录获取新令牌。

---

## 分页说明

列表接口支持分页，使用以下参数：
- `page`: 页码，从1开始
- `limit`: 每页数量，默认10，最大100

分页响应中包含pagination对象：
```json
{
  "page": 1,
  "limit": 10,
  "total": 100,
  "total_pages": 10
}
```

---

## 数据格式说明

### 日期格式
- 日期参数使用 `YYYY-MM-DD` 格式
- 日期时间参数使用 `YYYY-MM-DDTHH:mm:ss.sssZ` 格式（ISO 8601）

### 金额格式
- 金额使用数字类型，保留两位小数
- 例如：100.50

### ID格式
- 所有ID使用字符串类型
- 例如："user_123456789"

---

## 注意事项

1. 所有接口都使用HTTPS协议
2. 请求和响应都使用JSON格式
3. 所有时间都使用UTC时区
4. 删除操作通常是软删除，不会真正从数据库中删除数据
5. 管理员操作会记录审计日志
6. 系统有频率限制，防止恶意请求
7. 敏感操作（如修改角色、系统配置）需要二次确认

---

## 更新日志

- v1.0.0: 初始版本，包含所有基础功能接口