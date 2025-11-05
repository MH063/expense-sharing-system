# 记账系统API接口设计文档

本文档依据最新接口定义整理，确保与实现保持一致。

> 说明：本文件已与当前代码实现对齐；若接口发生变更，请同步更新《API路由索引.md》，并在 PR 中注明对齐状态。

## 1. 用户认证与账户管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 用户登录 | POST | /api/auth/login | users | 用户身份验证 |
| 用户注册 | POST | /api/auth/register | users | 新用户注册 |
| 刷新Token | POST | /api/auth/refresh-token | users | 刷新访问令牌 |
| 用户登出 | POST | /api/auth/logout | users | 用户退出登录 |
| 获取用户信息 | GET | /api/users/profile | users, user_settings | 获取当前用户详细信息 |
| 更新用户信息 | PUT | /api/users/profile | users, user_settings | 更新用户基本信息和设置 |
| 修改密码 | PUT | /api/users/password | users | 修改用户密码 |
| 忘记密码 | POST | /api/auth/forgot-password | users | 发送密码重置邮件 |
| 重置密码 | POST | /api/auth/reset-password | users | 重置用户密码 |

## 2. 房间管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取房间列表 | GET | /api/rooms | rooms, room_members | 获取用户加入的房间列表 |
| 创建房间 | POST | /api/rooms | rooms, room_members | 创建新房间并设置创建者为寝室长 |
| 获取房间详情 | GET | /api/rooms/:id | rooms, room_members | 获取房间详细信息及成员列表 |
| 更新房间信息 | PUT | /api/rooms/:id | rooms | 更新房间基本信息 |
| 删除房间 | DELETE | /api/rooms/:id | rooms, room_members | 删除房间（仅寝室长可操作） |
| 加入房间 | POST | /api/rooms/join | rooms, room_members, invite_codes | 通过邀请码加入房间 |
| 离开房间 | DELETE | /api/rooms/:id/members/:userId | room_members | 成员离开房间 |
| 移除成员 | DELETE | /api/rooms/:id/members/:userId | room_members | 寝室长移除成员 |
| 转让寝室长 | PUT | /api/rooms/:id/transfer-ownership | rooms, room_members | 寝室长转让权限 |

## 3. 邀请码管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 生成邀请码 | POST | /api/invite-codes | invite_codes | 生成房间邀请码 |
| 获取邀请码列表 | GET | /api/rooms/:id/invite-codes | invite_codes | 获取房间邀请码列表 |
| 验证邀请码 | POST | /api/invite-codes/validate | invite_codes | 验证邀请码有效性 |
| 撤销邀请码 | PUT | /api/invite-codes/:id/revoke | invite_codes | 撤销邀请码 |
| 删除邀请码 | DELETE | /api/invite-codes/:id | invite_codes | 删除邀请码 |

## 4. 账单管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取账单列表 | GET | /api/bills | bills, bill_participants | 获取房间账单列表 |
| 创建账单 | POST | /api/bills | bills, bill_participants | 创建新账单 |
| 获取账单详情 | GET | /api/bills/:id | bills, bill_participants, bill_comments | 获取账单详细信息 |
| 更新账单 | PUT | /api/bills/:id | bills, bill_participants | 更新账单信息 |
| 删除账单 | DELETE | /api/bills/:id | bills, bill_participants | 删除账单 |
| 添加账单评论 | POST | /api/bills/:id/comments | bill_comments | 添加账单评论 |
| 结算账单 | POST | /api/bills/:id/settle | bills, bill_settlements, payment_transfers | 结算账单 |
| 确认支付 | PUT | /api/bills/:id/participants/:userId/pay | bill_participants, payments | 确认成员支付 |
| 生成分享链接 | POST | /api/bills/:id/share | bills | 生成账单分享链接 |
| 通过分享链接查看 | GET | /api/bills/shared/:code | bills, bill_participants | 通过分享码查看账单 |

## 5. 支出管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取支出列表 | GET | /api/expenses | expenses, expense_splits | 获取房间支出列表 |
| 创建支出 | POST | /api/expenses | expenses, expense_splits | 创建新支出 |
| 获取支出详情 | GET | /api/expenses/:id | expenses, expense_splits, expense_receipts | 获取支出详细信息 |
| 更新支出 | PUT | /api/expenses/:id | expenses, expense_splits | 更新支出信息 |
| 删除支出 | DELETE | /api/expenses/:id | expenses, expense_splits | 删除支出 |
| 上传支出凭证 | POST | /api/expenses/:id/receipts | expense_receipts | 上传支出凭证图片 |
| 删除支出凭证 | DELETE | /api/expenses/:id/receipts/:receiptId | expense_receipts | 删除支出凭证 |
| 获取支出类别 | GET | /api/expense-categories | expense_categories | 获取房间支出类别 |
| 创建支出类别 | POST | /api/expense-categories | expense_categories | 创建新支出类别 |
| 更新支出类别 | PUT | /api/expense-categories/:id | expense_categories | 更新支出类别 |
| 删除支出类别 | DELETE | /api/expense-categories/:id | expense_categories | 删除支出类别 |

## 6. 收款码管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取收款码列表 | GET | /api/qr-codes | qr_codes | 获取用户收款码列表 |
| 上传收款码 | POST | /api/qr-codes | qr_codes | 上传用户收款码 |
| 获取收款码详情 | GET | /api/qr-codes/:id | qr_codes | 获取收款码详细信息 |
| 更新收款码 | PUT | /api/qr-codes/:id | qr_codes | 更新收款码信息 |
| 删除收款码 | DELETE | /api/qr-codes/:id | qr_codes | 删除收款码 |
| 设置默认收款码 | PUT | /api/qr-codes/:id/set-default | qr_codes | 设置默认收款码 |
| 激活/停用收款码 | PUT | /api/qr-codes/:id/status | qr_codes | 激活或停用收款码 |
| 获取指定用户收款码 | GET | /api/users/:userId/qr-codes | qr_codes | 获取指定用户的收款码 |

## 7. 支付与转账接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 创建支付记录 | POST | /api/payments | payments | 创建支付记录 |
| 确认支付 | PUT | /api/payments/:id/confirm | payments | 确认支付状态 |
| 获取支付历史 | GET | /api/payments/history | payments | 获取用户支付历史 |
| 创建转账记录 | POST | /api/payment-transfers | payment_transfers | 创建成员间转账记录 |
| 确认转账 | PUT | /api/payment-transfers/:id/confirm | payment_transfers | 确认转账状态 |
| 取消转账 | PUT | /api/payment-transfers/:id/cancel | payment_transfers | 取消转账 |
| 获取转账历史 | GET | /api/payment-transfers/history | payment_transfers | 获取转账历史记录 |

## 8. 特殊支付规则接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取特殊支付规则列表 | GET | /api/special-payment-rules | special_payment_rules | 获取房间特殊支付规则 |
| 创建特殊支付规则 | POST | /api/special-payment-rules | special_payment_rules | 创建特殊支付规则 |
| 获取特殊支付规则详情 | GET | /api/special-payment-rules/:id | special_payment_rules | 获取特殊支付规则详情 |
| 更新特殊支付规则 | PUT | /api/special-payment-rules/:id | special_payment_rules | 更新特殊支付规则 |
| 删除特殊支付规则 | DELETE | /api/special-payment-rules/:id | special_payment_rules | 删除特殊支付规则 |
| 激活/停用特殊支付规则 | PUT | /api/special-payment-rules/:id/status | special_payment_rules | 激活或停用特殊支付规则 |

## 9. 通知管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取通知列表 | GET | /api/notifications | notifications | 获取用户通知列表 |
| 标记通知已读 | PUT | /api/notifications/:id/read | notifications | 标记通知为已读 |
| 批量标记已读 | PUT | /api/notifications/mark-all-read | notifications | 批量标记通知为已读 |
| 删除通知 | DELETE | /api/notifications/:id | notifications | 删除通知 |
| 获取未读通知数量 | GET | /api/notifications/unread-count | notifications | 获取未读通知数量 |
| 更新通知设置 | PUT | /api/user-settings/notifications | user_settings | 更新用户通知设置 |

## 10. 争议处理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取争议列表 | GET | /api/disputes | disputes, dispute_participants | 获取争议列表 |
| 创建争议 | POST | /api/disputes | disputes, dispute_participants | 创建新争议 |
| 获取争议详情 | GET | /api/disputes/:id | disputes, dispute_participants, dispute_evidence | 获取争议详细信息 |
| 添加争议证据 | POST | /api/disputes/:id/evidence | dispute_evidence | 添加争议证据 |
| 更新争议状态 | PUT | /api/disputes/:id/status | disputes | 更新争议状态 |
| 解决争议 | POST | /api/disputes/:id/resolve | disputes, dispute_resolutions | 解决争议 |

## 11. 评价管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取评价列表 | GET | /api/reviews | reviews, review_images | 获取房间评价列表 |
| 创建评价 | POST | /api/reviews | reviews, review_images | 创建新评价 |
| 获取评价详情 | GET | /api/reviews/:id | reviews, review_images | 获取评价详细信息 |
| 上传评价图片 | POST | /api/reviews/:id/images | review_images | 上传评价图片 |
| 删除评价图片 | DELETE | /api/reviews/:id/images/:imageId | review_images | 删除评价图片 |
| 更新评价状态 | PUT | /api/reviews/:id/status | reviews | 更新评价状态 |

## 12. 数据统计与分析接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取系统概览统计 | GET | /api/analytics/overview | users, rooms, bills, expenses | 获取系统整体统计数据 |
| 获取费用统计 | GET | /api/analytics/expenses | expenses, expense_splits | 获取费用统计数据 |
| 获取账单统计 | GET | /api/analytics/bills | bills, bill_participants | 获取账单统计数据 |
| 获取趋势分析 | GET | /api/analytics/trends | bills, expenses | 获取费用和账单趋势分析 |
| 获取成员比较数据 | GET | /api/analytics/member-comparison | bills, expenses, bill_participants, expense_splits | 获取成员支出比较数据 |
| 获取房间活动统计 | GET | /api/analytics/room-activity | rooms, bills, expenses | 获取房间活动统计数据 |
| 获取用户增长统计 | GET | /api/analytics/user-growth | users, user_activity_logs | 获取用户增长统计数据 |

## 13. 文件管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 上传文件 | POST | /api/files/upload | 无直接关联表 | 上传各类文件（头像、凭证等） |
| 获取文件 | GET | /api/files/:id | 无直接关联表 | 获取已上传文件 |
| 删除文件 | DELETE | /api/files/:id | 无直接关联表 | 删除已上传文件 |

## 14. 系统管理接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 系统健康检查 | GET | /api/system/health | 无直接关联表 | 检查系统健康状态 |
| 获取系统配置 | GET | /api/system/config | 无直接关联表 | 获取系统配置信息 |
| 数据导出 | POST | /api/export | 多个表 | 导出各类数据 |

## 15. WebSocket事件接口

| 事件名称 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- |
| 支付确认事件 | ws://localhost:4000/ws | payments, bill_participants | 实时推送支付确认状态 |
| 费用创建事件 | ws://localhost:4000/ws | expenses | 实时推送新费用创建通知 |
| 账单生成事件 | ws://localhost:4000/ws | bills | 实时推送新账单生成通知 |
| 通知事件 | ws://localhost:4000/ws | notifications | 实时推送系统通知 |

## 管理端专用接口

### 1. 管理员认证与权限接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 管理员登录 | POST | /api/admin/auth/login | admin_users | 管理员身份验证 |
| 获取管理员列表 | GET | /api/admin/users | admin_users, admin_user_roles, roles | 获取管理员列表 |
| 创建管理员 | POST | /api/admin/users | admin_users | 创建新管理员 |
| 更新管理员信息 | PUT | /api/admin/users/:id | admin_users | 更新管理员信息 |
| 删除管理员 | DELETE | /api/admin/users/:id | admin_users, admin_user_roles | 删除管理员 |
| 分配角色 | POST | /api/admin/users/:id/roles | admin_user_roles | 为管理员分配角色 |
| 获取权限列表 | GET | /api/admin/permissions | permissions | 获取系统权限列表 |
| 获取角色列表 | GET | /api/admin/roles | roles, role_permissions | 获取系统角色列表 |
| 创建角色 | POST | /api/admin/roles | roles | 创建新角色 |
| 更新角色 | PUT | /api/admin/roles/:id | roles | 更新角色信息 |
| 删除角色 | DELETE | /api/admin/roles/:id | roles, role_permissions | 删除角色 |

### 2. 审计日志接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取操作日志 | GET | /api/admin/operation-logs | admin_operation_logs | 获取管理员操作日志 |
| 获取数据变更日志 | GET | /api/admin/data-change-audits | data_change_audits | 获取数据变更审计日志 |

### 3. 批量任务与报表接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取批量任务列表 | GET | /api/admin/batch-jobs | batch_jobs, batch_job_runs | 获取批量任务列表 |
| 创建批量任务 | POST | /api/admin/batch-jobs | batch_jobs | 创建新批量任务 |
| 获取任务详情 | GET | /api/admin/batch-jobs/:id | batch_jobs, batch_job_runs | 获取批量任务详情 |
| 获取报表定义列表 | GET | /api/admin/reports | report_definitions | 获取报表定义列表 |
| 创建报表定义 | POST | /api/admin/reports | report_definitions | 创建新报表定义 |
| 获取报表快照 | GET | /api/admin/reports/:id/snapshots | report_snapshots | 获取报表快照列表 |
| 生成报表 | POST | /api/admin/reports/:id/generate | report_definitions, report_snapshots | 生成报表快照 |
| 获取导出任务列表 | GET | /api/admin/exports | data_exports | 获取数据导出任务列表 |
| 创建导出任务 | POST | /api/admin/exports | data_exports | 创建新数据导出任务 |

### 4. 内容审核与工单接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取审核队列 | GET | /api/admin/moderation-queue | moderation_queue | 获取待审核内容列表 |
| 处理审核 | POST | /api/admin/moderation/:id/process | moderation_queue, moderation_actions | 处理审核项目 |
| 获取工单列表 | GET | /api/admin/tickets | tickets | 获取工单列表 |
| 获取工单详情 | GET | /api/admin/tickets/:id | tickets, ticket_comments | 获取工单详细信息 |
| 更新工单状态 | PUT | /api/admin/tickets/:id/status | tickets | 更新工单状态 |
| 添加工单备注 | POST | /api/admin/tickets/:id/comments | ticket_comments | 添加工单处理备注 |

### 5. 系统配置与维护接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取功能开关 | GET | /api/admin/feature-flags | feature_flags | 获取系统功能开关列表 |
| 更新功能开关 | PUT | /api/admin/feature-flags/:id | feature_flags | 更新功能开关状态 |
| 获取维护窗口 | GET | /api/admin/maintenance-windows | maintenance_windows | 获取系统维护窗口列表 |
| 创建维护窗口 | POST | /api/admin/maintenance-windows | maintenance_windows | 创建新维护窗口 |
| 获取公告列表 | GET | /api/admin/announcements | admin_announcements | 获取系统公告列表 |
| 创建公告 | POST | /api/admin/announcements | admin_announcements | 创建新系统公告 |

### 6. 集成与回调接口

| 接口名称 | HTTP方法 | 路径 | 关联数据库表 | 功能说明 |
| --- | --- | --- | --- | --- |
| 获取Webhook列表 | GET | /api/admin/webhooks | webhooks | 获取Webhook列表 |
| 创建Webhook | POST | /api/admin/webhooks | webhooks | 创建新Webhook |
| 获取Webhook事件 | GET | /api/admin/webhooks/:id/events | webhook_events | 获取Webhook事件记录 |
