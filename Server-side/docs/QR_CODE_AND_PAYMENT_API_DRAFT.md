# 收款码管理与支付流程补充 API 设计草案（规划中）

状态：规划中（尚未在生产接口中启用）  
最后更新：2025-11-03

## 1. 背景
为支持更顺畅的线下扫码支付与支付确认闭环，需要补充“用户收款码管理”与“支付流程补充”相关接口，并在 WebSocket 中推送支付状态事件。

## 2. 接口概览（草案）

### 2.1 收款码管理 API
1) POST /api/user-qr-codes  
- 描述：上传用户的收款码图片。
- 鉴权：需要登录（用户角色）。
- 请求：multipart/form-data
  - qr_type: string (enum: wechat|alipay)
  - qr_image: file (png/jpg/jpeg, ≤ 2MB)
- 响应：201
  - { id, user_id, qr_type, file_url, is_active, created_at }

2) GET /api/user-qr-codes  
- 描述：获取当前用户的收款码列表。
- 鉴权：需要登录。
- 响应：200
  - [{ id, qr_type, file_url, is_active, created_at }]

3) PUT /api/user-qr-codes/{id}/status  
- 描述：激活/停用指定收款码。
- 鉴权：需要登录（本人资源）。
- 请求：application/json
  - { is_active: boolean }
- 响应：200
  - { id, is_active }

4) DELETE /api/user-qr-codes/{id}  
- 描述：删除指定收款码。
- 鉴权：需要登录（本人资源）。
- 响应：204

### 2.2 支付流程补充 API
1) POST /api/bills/{id}/pay  
- 描述：对账单发起支付确认流程（记录付款人与渠道）。
- 鉴权：需要登录（账单相关成员）。
- 请求：application/json
  - { payer_id: uuid, qr_code_type: "wechat" | "alipay" }
- 响应：201
  - { payment_id, bill_id, payer_id, method: qr_code_type, status: "pending" }

2) POST /api/payments/{id}/confirm  
- 描述：收款人确认该支付已到账。
- 鉴权：需要登录（收款人/账单责任人）。
- 请求：无或 { note?: string }
- 响应：200
  - { id, status: "confirmed" }

## 3. WebSocket 事件（草案）
- payment_confirmed：支付被确认
- qr_code_uploaded：用户上传/更新了收款码
- payment_status_changed：支付状态变化（pending→confirmed/failed）

事件负载建议：
```
{
  type: "payment_confirmed",
  payload: {
    payment_id: string,
    bill_id: string,
    confirmer_id: string,
    confirmed_at: string
  }
}
```

## 4. 数据模型与存储（草案）
- 表：user_qr_codes(id, user_id, qr_type, file_path, is_active, created_at)
- 复用：payments / bills 现有表结构，新增必要字段满足手动确认链路
- 文件存储：本地 uploads/qr-codes/ 或对象存储（生产）

## 5. 安全与合规
- 文件校验：类型/大小/扫描（必要时）
- 访问控制：仅本人可管理自己的收款码
- 日志与审计：上传、删除、状态变更需审计记录

## 6. 开发与联调计划
- 后端：routes + controller + service + 存储与校验
- 前端：
  - 用户中心新增“我的收款码”页面（上传/列表/启停/删除）
  - 账单支付流程支持选择二维码方式并记录 payer_id、qr_code_type
- 管理端：
  - 文档页同步接口说明
  - 支付状态监控看板（增量）

## 7. TODO（待落地）
- [ ] 完成路由与控制器实现
- [ ] 上传限流/防重与文件清理策略
- [ ] WebSocket 事件触发与前端订阅
- [ ] 集成测试用例（正/反向用例）

> 说明：本文件为草案，功能上线前会同步更新 README 的“API 文档”与管理端文档链接。