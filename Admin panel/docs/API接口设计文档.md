# 记账系统API接口设计文档

## 1. API设计原则

### 1.1 设计规范
- **RESTful API设计**：遵循RESTful设计原则
- **统一响应格式**：所有API返回统一JSON格式
- **错误处理**：标准化的错误码和错误信息
- **版本控制**：API版本管理
- **安全认证**：JWT Token认证机制

### 1.2 通用响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 1.3 错误码说明
| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 200 | 成功 | 200 |
| 400 | 请求参数错误 | 400 |
| 401 | 未授权 | 401 |
| 403 | 权限不足 | 403 |
| 404 | 资源不存在 | 404 |
| 500 | 服务器内部错误 | 500 |

## 2. 认证授权API

### 2.1 用户登录
```
POST /api/auth/login
```
**请求参数：**
```json
{
  "username": "user123",
  "password": "password123"
}
```
**响应数据：**
```json
{
  "token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "username": "user123",
    "name": "张三",
    "role": "普通用户"
  }
}
```

### 2.2 用户注册
```
POST /api/auth/register
```
**请求参数：**
```json
{
  "username": "user123",
  "password": "password123",
  "email": "user@example.com",
  "name": "张三",
  "invitation_code": "1234"
}
```

### 2.3 刷新Token
```
POST /api/auth/refresh-token
```
**请求参数：**
```json
{
  "refresh_token": "refresh_token_here"
}
```

### 2.4 用户登出
```
POST /api/auth/logout
```

## 3. 用户管理API

### 3.1 获取用户列表
```
GET /api/users
```
**查询参数：**
- `page`：页码（默认1）
- `limit`：每页数量（默认20）
- `role`：角色筛选
- `status`：状态筛选

### 3.2 获取用户详情
```
GET /api/users/{id}
```

### 3.3 更新用户信息
```
PUT /api/users/{id}
```
**请求参数：**
```json
{
  "name": "新姓名",
  "email": "new@example.com",
  "phone": "13800138000"
}
```

### 3.4 分配用户角色
```
POST /api/users/{id}/roles
```
**请求参数：**
```json
{
  "role": "寝室长"
}
```

## 4. 寝室管理API

### 4.1 获取寝室列表
```
GET /api/rooms
```
**查询参数：**
- `page`：页码
- `limit`：每页数量
- `status`：状态筛选

### 4.2 创建寝室
```
POST /api/rooms
```
**请求参数：**
```json
{
  "name": "A栋101",
  "description": "这是一个示例寝室",
  "max_members": 4
}
```

### 4.3 获取寝室详情
```
GET /api/rooms/{id}
```

### 4.4 更新寝室信息
```
PUT /api/rooms/{id}
```

### 4.5 删除寝室
```
DELETE /api/rooms/{id}
```

### 4.6 寝室成员管理
```
POST /api/rooms/{id}/members
```
**请求参数：**
```json
{
  "user_id": "uuid",
  "relation_type": "member"
}
```

## 5. 费用管理API

### 5.1 获取费用列表
```
GET /api/expenses
```
**查询参数：**
- `room_id`：寝室ID
- `expense_type_id`：费用类型ID
- `start_date`：开始日期
- `end_date`：结束日期
- `status`：状态筛选

### 5.2 创建费用
```
POST /api/expenses
```
**请求参数：**
```json
{
  "room_id": "uuid",
  "expense_type_id": "uuid",
  "title": "2024年1月电费",
  "amount": 200.00,
  "expense_date": "2024-01-31",
  "split_algorithm": "equal",
  "split_parameters": {}
}
```

### 5.3 获取费用详情
```
GET /api/expenses/{id}
```

### 5.4 更新费用信息
```
PUT /api/expenses/{id}
```

### 5.5 删除费用
```
DELETE /api/expenses/{id}
```

### 5.6 智能分摊计算
```
POST /api/expenses/{id}/calculate-split
```
**响应数据：**
```json
{
  "total_amount": 200.00,
  "splits": [
    {
      "user_id": "uuid",
      "user_name": "张三",
      "amount": 50.00,
      "split_ratio": 0.25
    }
  ]
}
```

## 6. 账单管理API

### 6.1 获取账单列表
```
GET /api/bills
```
**查询参数：**
- `room_id`：寝室ID
- `status`：状态筛选
- `due_date_start`：到期日开始日期
- `due_date_end`：到期日结束日期

### 6.2 创建账单
```
POST /api/bills
```
**请求参数：**
```json
{
  "room_id": "uuid",
  "title": "2024年1月账单",
  "description": "包含水电费等费用",
  "due_date": "2024-02-10",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31"
}
```

### 6.3 获取账单详情
```
GET /api/bills/{id}
```

### 6.4 更新账单信息
```
PUT /api/bills/{id}
```

### 6.5 账单支付确认
```
POST /api/bills/{id}/pay
```
**请求参数：**
```json
{
  "payer_id": "uuid",
  "qr_code_type": "wechat"
}
```

### 6.6 收款人确认支付
```
POST /api/payments/{id}/confirm
```

## 7. 收款码管理API

### 7.1 上传收款码
```
POST /api/user-qr-codes
```
**请求参数（FormData）：**
- `qr_type`：收款码类型（wechat/alipay）
- `qr_image`：收款码图片文件

**响应数据：**
```json
{
  "id": "uuid",
  "qr_type": "wechat",
  "qr_image_url": "https://example.com/qr-codes/wechat_123.jpg",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 7.2 获取用户收款码列表
```
GET /api/user-qr-codes
```
**查询参数：**
- `qr_type`：收款码类型筛选
- `is_active`：激活状态筛选

**响应数据：**
```json
{
  "qr_codes": [
    {
      "id": "uuid",
      "qr_type": "wechat",
      "qr_image_url": "https://example.com/qr-codes/wechat_123.jpg",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### 7.3 激活/停用收款码
```
PUT /api/user-qr-codes/{id}/status
```
**请求参数：**
```json
{
  "is_active": true
}
```

**响应数据：**
```json
{
  "id": "uuid",
  "qr_type": "wechat",
  "is_active": true,
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 7.4 删除收款码
```
DELETE /api/user-qr-codes/{id}
```

**响应数据：**
```json
{
  "message": "收款码删除成功"
}
```

### 7.5 获取收款码详情
```
GET /api/user-qr-codes/{id}
```

**响应数据：**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "qr_type": "wechat",
  "qr_image_url": "https://example.com/qr-codes/wechat_123.jpg",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 7.6 获取指定用户的收款码
```
GET /api/users/{userId}/qr-codes
```

**查询参数：**
- `qr_type`：收款码类型筛选
- `is_active`：激活状态筛选

**响应数据：**
```json
{
  "qr_codes": [
    {
      "id": "uuid",
      "qr_type": "wechat",
      "qr_image_url": "https://example.com/qr-codes/wechat_123.jpg",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 8. 邀请码管理API

### 8.1 生成邀请码
```
POST /api/invitation-codes
```
**请求参数：**
```json
{
  "room_id": "uuid",
  "max_uses": 5,
  "expires_at": "2024-12-31T23:59:59Z"
}
```
**响应数据：**
```json
{
  "code": "1234",
  "expires_at": "2024-12-31T23:59:59Z",
  "max_uses": 5
}
```

### 8.2 验证邀请码
```
POST /api/invitation-codes/validate
```
**请求参数：**
```json
{
  "code": "1234",
  "room_id": "uuid"
}
```

### 8.3 获取邀请码列表
```
GET /api/invitation-codes
```

### 8.4 停用邀请码
```
PUT /api/invitation-codes/{id}/status
```

## 9. 统计分析API

### 9.1 系统概览统计
```
GET /api/analytics/overview
```
**响应数据：**
```json
{
  "total_users": 100,
  "total_rooms": 25,
  "total_expenses": 50000.00,
  "pending_payments": 5000.00
}
```

### 9.2 费用统计
```
GET /api/analytics/expenses
```
**查询参数：**
- `room_id`：寝室ID
- `start_date`：开始日期
- `end_date`：结束日期
- `group_by`：分组方式（month/week/day）

### 9.3 账单统计
```
GET /api/analytics/bills
```

### 9.4 趋势分析
```
GET /api/analytics/trends
```

## 10. 审核与争议API

### 10.1 提交费用审核
```
POST /api/expense-reviews
```
**请求参数：**
```json
{
  "expense_id": "uuid",
  "reason": "费用金额有误",
  "current_level": "寝室长"
}
```

### 10.2 获取审核列表
```
GET /api/expense-reviews
```

### 10.3 处理审核
```
POST /api/expense-reviews/{id}/process
```
**请求参数：**
```json
{
  "decision": "approved",
  "comments": "审核通过"
}
```

### 10.4 提交费用争议
```
POST /api/expense-disputes
```

## 11. 系统功能API

### 11.1 获取通知列表
```
GET /api/notifications
```
**查询参数：**
- `unread_only`：仅获取未读通知
- `type`：通知类型

### 11.2 标记通知已读
```
PUT /api/notifications/{id}/read
```

### 11.3 数据导出
```
POST /api/export
```
**请求参数：**
```json
{
  "export_type": "expenses",
  "format": "excel",
  "filters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

### 11.4 系统健康检查
```
GET /api/system/health
```

## 12. 文件管理API

### 12.1 文件上传
```
POST /api/files/upload
```
**请求参数（FormData）：**
- `file`：文件
- `type`：文件类型

### 12.2 文件删除
```
DELETE /api/files/{id}
```

## 13. WebSocket事件API

### 13.1 连接WebSocket
```
ws://localhost:4000/ws
```

### 13.2 事件类型
- `payment_confirmed`：支付确认事件
- `expense_created`：费用创建事件
- `bill_generated`：账单生成事件
- `notification`：通知事件

## 14. API安全规范

### 14.1 认证机制
- 使用JWT Token进行身份认证
- Token过期时间：2小时
- Refresh Token过期时间：7天

### 14.2 权限验证
- 接口级别权限控制
- 数据级别权限验证
- 操作日志记录

### 14.3 请求限制
- 频率限制：100次/分钟
- 并发限制：10个并发请求
- 数据大小限制：10MB/请求

## 15. 错误码详细说明

### 15.1 认证相关错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 1001 | Token已过期 | 使用Refresh Token刷新 |
| 1002 | Token无效 | 重新登录获取新Token |
| 1003 | 权限不足 | 联系管理员分配权限 |

### 15.2 业务逻辑错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 2001 | 寝室成员已满 | 升级寝室或移除成员 |
| 2002 | 费用已关联账单 | 先解除账单关联 |
| 2003 | 邀请码无效 | 检查邀请码是否正确 |

### 15.3 数据验证错误
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 3001 | 参数格式错误 | 检查请求参数格式 |
| 3002 | 必填参数缺失 | 补充必填参数 |
| 3003 | 数据不存在 | 检查资源ID是否正确 |

这个API接口设计文档完整地覆盖了记账系统的所有功能需求，包括新增的收款码管理和邀请码功能，确保了前后端数据交互的一致性和完整性。