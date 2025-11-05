# API 路由索引（当前实现）

说明：本索引从 `Server-side/routes` 自动提取，涵盖方法、路径、鉴权、验证规则。用于与《API接口设计文档》对齐联调。

- 基础前缀：所有模块均在 `server.js` 下挂载到 `/api/*` 对应前缀。
- 全局中间件：`standardResponseMiddleware`、`verifyRequestSignature`（可灰度）、`ipWhitelist`（可灰度）、`defaultRateLimiter`（按配置生效）、`checkRequestBodySize`、`checkTokenLength`、`httpLogger`。

## 认证与用户
- POST `/api/auth/login`（限流+校验+防暴力）：`loginValidationRules`、`devLoginRateLimiter`、`loginBruteProtector`
- POST `/api/auth/register`（限流+校验）：`registerRateLimiter`、`userValidationRules.register`
- POST `/api/auth/logout`（鉴权）
- POST `/api/auth/refresh-token`
- POST `/api/auth/forgot-password`（校验）
- POST `/api/auth/reset-password`（校验）
- GET `/api/users/profile`（鉴权）
- PUT `/api/users/profile`（鉴权+校验）：`userValidationRules.updateProfile`
- PUT `/api/users/password`（鉴权+校验）：`userValidationRules.changePassword`
- GET `/api/users`（鉴权）
- GET `/api/users/:id`（鉴权）
- PUT `/api/users/:id`（鉴权）
- POST `/api/users/:id/roles`（鉴权）
- PUT `/api/users/:id/roles`（鉴权）
- GET `/api/users/:id/roles`（鉴权）

## 管理员认证
- POST `/api/admin/auth/login`（限流+校验）：`adminValidationRules.login`

## 寝室
- POST `/api/rooms`（鉴权+校验）：`roomValidationRules.createRoom`
- GET `/api/rooms`（鉴权）
- GET `/api/rooms/my-rooms`（鉴权）
- GET `/api/rooms/:id`（鉴权）
- POST `/api/rooms/join`（鉴权+校验）：`roomValidationRules.joinRoom`
- POST `/api/rooms/:id/leave`（鉴权）
- GET `/api/rooms/:id/members`（鉴权）
- DELETE `/api/rooms/:id/members/:userId`（鉴权）
- PUT `/api/rooms/:id/transfer-ownership`（鉴权+校验）：`roomValidationRules.transferOwnership`
- PUT `/api/rooms/:id`（鉴权+校验）：`roomValidationRules.updateRoom`
- DELETE `/api/rooms/:id`（鉴权）
- GET `/api/rooms/:id/invite-codes`（鉴权）
- POST `/api/rooms/:id/generate-invite-code`（鉴权）
- POST `/api/rooms/verify-invite-code`（鉴权+校验）：`roomValidationRules.verifyInviteCode`
- PUT `/api/rooms/:id/revoke-invite-code`（鉴权）
- DELETE `/api/rooms/:id/invite-codes/:codeId`（鉴权）

## 邀请码
- POST `/api/invite-codes`（鉴权）
- POST `/api/invite-codes/verify`（鉴权）
- POST `/api/invite-codes/use`（鉴权）
- GET `/api/invite-codes/room/:roomId`（鉴权）
- DELETE `/api/invite-codes/:id`（鉴权）

## 账单
- POST `/api/bills`（鉴权+校验）：`billValidationRules.create`
- POST `/api/bills/receipt`（鉴权+文件上传）
- GET `/api/bills`（鉴权）
- GET `/api/bills/:id`（鉴权）
- PUT `/api/bills/:id`（鉴权+校验）：`billValidationRules.update`
- DELETE `/api/bills/:id`（鉴权）
- POST `/api/bills/:id/review`（鉴权+校验）：`billValidationRules.review`
- POST `/api/bills/:id/payment`（鉴权）
- PUT `/api/bills/:id/split`（鉴权）
- POST `/api/bills/:bill_id/settlements`（鉴权）
- GET `/api/bills/:bill_id/settlements`（鉴权）
- GET `/api/bills/stats/user`（鉴权）
- GET `/api/bills/stats/room`（鉴权）
- GET `/api/bills/stats/date-range`（鉴权）

## 支出
- POST `/api/expenses`（鉴权+校验）：`expenseValidationRules.createExpense`
- GET `/api/expenses`（鉴权）
- GET `/api/expenses/:id`（鉴权）
- PUT `/api/expenses/:id`（鉴权+校验）：`expenseValidationRules.updateExpense`
- DELETE `/api/expenses/:id`（鉴权）
- POST `/api/expenses/splits/:id/confirm`（鉴权+校验）：`expenseValidationRules.confirmSplitPayment`
- POST `/api/expenses/calculate-split`（鉴权+校验）：`expenseValidationRules.calculateSmartSplit`
- GET `/api/expenses/:expenseId/qr-code`（鉴权）
- POST `/api/expenses/:expenseId/payments/confirm`（鉴权+校验）：`expenseValidationRules.confirmExpensePayment`
- GET `/api/expenses/:expenseId/payment-status`（鉴权）
- GET `/api/expenses/payments/user`（鉴权）
- GET `/api/expenses/stats/room/:roomId`（鉴权）

## 费用类型
- POST `/api/expense-types`（鉴权）
- GET `/api/expense-types`
- GET `/api/expense-types/default`（鉴权）
- GET `/api/expense-types/:id`（鉴权）
- PUT `/api/expense-types/:id`（鉴权）
- DELETE `/api/expense-types/:id`（鉴权）

## 收款码
- POST `/api/qr-codes/upload`（鉴权+文件上传）
- GET `/api/qr-codes`（鉴权）
- PATCH `/api/qr-codes/:id/status`（鉴权）
- PATCH `/api/qr-codes/:id/default`（鉴权）
- DELETE `/api/qr-codes/:id`（鉴权）
- GET `/api/qr-codes/default`（鉴权）

## 支付
- GET `/api/payments/bills/:billId/qr-code`（鉴权）
- POST `/api/payments/bills/:billId/confirm`（鉴权+校验）：`paymentValidationRules.confirmPayment`
- GET `/api/payments/bills/:billId/status`（鉴权）
- GET `/api/payments/user`（鉴权）

## 支付转移
- GET `/api/payment-transfers`（鉴权+校验）：`paymentTransferValidationRules.getPaymentTransfers`
- POST `/api/payment-transfers`（鉴权+校验）：`paymentTransferValidationRules.createPaymentTransfer`
- GET `/api/payment-transfers/:id`（鉴权+校验）：`paymentTransferValidationRules.getPaymentTransferById`
- PUT `/api/payment-transfers/:id/confirm`（鉴权+校验）：`paymentTransferValidationRules.confirmPaymentTransfer`
- PUT `/api/payment-transfers/:id/cancel`（鉴权+校验）：`paymentTransferValidationRules.cancelPaymentTransfer`

## 支付优化/离线支付
- 所有路由前缀 `/api/payment-optimization/*`（鉴权）
- POST `/api/payment-optimization/offline-payments`
- PUT `/api/payment-optimization/offline-payments/:paymentId/sync`
- GET `/api/payment-optimization/offline-payments/user/:userId`
- GET `/api/payment-optimization/offline-payments/pending`
- POST `/api/payment-optimization/reminders`
- GET `/api/payment-optimization/reminders/user/:userId`
- GET `/api/payment-optimization/records`
- GET `/api/payment-optimization/records/:paymentId`
- GET `/api/payment-optimization/stats/user/:userId`
- GET `/api/payment-optimization/stats/room/:roomId`
- POST `/api/payment-optimization/tasks/trigger/:taskName`
- GET `/api/payment-optimization/tasks/status`

## 特殊支付规则
- GET `/api/special-payments/rooms/:roomId/rules`（鉴权）
- POST `/api/special-payments/rooms/:roomId/rules`（鉴权+权限）
- PUT `/api/special-payments/rules/:ruleId`（鉴权）
- DELETE `/api/special-payments/rules/:ruleId`（鉴权）
- GET `/api/special-payments/bills/:billId/applicable-rules`（鉴权）
- POST `/api/special-payments/bills/:billId/rules/:ruleId/apply`（鉴权+权限）
- POST `/api/special-payments/bills/:billId/transfers`（鉴权）
- GET `/api/special-payments/bills/:billId/transfers`（鉴权）

## 通知
- GET `/api/notifications`（鉴权）
- GET `/api/notifications/unread-count`（鉴权）
- PUT `/api/notifications/:id/read`（鉴权）
- PUT `/api/notifications/mark-all-read`（鉴权+校验）：`notificationValidationRules.markAllRead`
- DELETE `/api/notifications/:id`（鉴权）
- POST `/api/notifications`（鉴权+校验）：`notificationValidationRules.create`
- GET `/api/notifications/bill-due-reminders`（鉴权）
- GET `/api/notifications/payment-status-changes`（鉴权）

## 通知设置
- GET `/api/notification-settings`（鉴权）
- PUT `/api/notification-settings`（鉴权）
- GET `/api/notification-settings/check`（鉴权）

## 用户偏好
- GET `/api/user-preferences`（鉴权）
- GET `/api/user-preferences/:category/:key`（鉴权）
- PUT `/api/user-preferences/:category/:key`（鉴权）
- PUT `/api/user-preferences/:category`（鉴权）
- DELETE `/api/user-preferences/:category/:key`（鉴权）

## 统计
- GET `/api/stats/user`（鉴权+校验）：`statsValidationRules.userStats`
- GET `/api/stats/room`（鉴权+校验）：`statsValidationRules.roomStats`
- GET `/api/stats/system`（鉴权+校验+管理员）
- GET `/api/stats/forecast`（鉴权+校验）：`statsValidationRules.forecast`

## 异常支出
- POST `/api/abnormal-expenses/detect`（鉴权+管理员）
- GET `/api/abnormal-expenses`（鉴权+管理员）
- GET `/api/abnormal-expenses/stats`（鉴权+管理员）
- PUT `/api/abnormal-expenses/:id/status`（鉴权+管理员）

## MFA
- GET `/api/mfa/status`（鉴权）
- POST `/api/mfa/setup`（鉴权）
- POST `/api/mfa/verify`（鉴权）
- POST `/api/mfa/disable`（鉴权）

注：如需变更路由或验证规则，请同步更新本索引与《API接口设计文档》并在 PR 中标注。
