# 用户角色与页面权限映射关系

## 角色定义

| 角色代码 | 角色名称 | 描述 |
|---------|---------|------|
| sysadmin | 系统管理员 | 拥有系统最高权限，可以管理所有资源和用户 |
| admin | 管理员 | 管理系统中的用户、寝室和费用等资源 |
| room_leader | 寝室长 | 管理特定寝室的成员和费用 |
| payer | 缴费人 | 寝室成员，可以查看和支付账单 |
| user | 普通用户 | 基本权限，可以查看个人信息和参与寝室活动 |
| guest | 访客 | 未登录用户，只能访问公开页面 |

## 权限定义

### 系统级权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| admin.access | 访问管理端 | 可以访问管理员界面 |
| admin.roles.assign | 分配角色 | 可以分配用户角色 |
| admin.users.read | 查看管理员 | 可以查看管理员信息 |
| system.admin | 系统管理员权限 | 系统管理员专属权限 |

### 寝室级权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| room:create | 创建寝室 | 可以创建新的寝室 |
| room:view | 查看寝室信息 | 可以查看寝室详情 |
| room:edit | 编辑寝室信息 | 可以修改寝室信息 |
| room:delete | 删除寝室 | 可以删除寝室 |
| room:invite | 邀请成员 | 可以邀请新成员加入寝室 |
| room:manage | 管理寝室 | 可以管理寝室设置 |
| room:join | 加入寝室 | 可以申请加入寝室 |

### 成员管理权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| member:manage | 管理成员 | 可以管理寝室成员 |
| member:invite | 邀请成员 | 可以邀请新成员 |
| member:remove | 移除成员 | 可以移除寝室成员 |
| member:role.change | 更改成员角色 | 可以修改成员在寝室中的角色 |

### 费用相关权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| expense:create | 创建费用记录 | 可以创建新的费用记录 |
| expense:view | 查看费用记录 | 可以查看费用记录 |
| expense:edit | 编辑费用记录 | 可以修改费用记录 |
| expense:delete | 删除费用记录 | 可以删除费用记录 |

### 账单相关权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| bill:create | 创建账单 | 可以创建新账单 |
| bill:view | 查看账单 | 可以查看账单详情 |
| bill:edit | 编辑账单 | 可以修改账单信息 |
| bill:delete | 删除账单 | 可以删除账单 |
| bill:pay | 支付账单 | 可以支付账单 |

### 个人信息权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| profile:view | 查看个人资料 | 可以查看个人资料 |
| profile:edit | 编辑个人资料 | 可以修改个人资料 |

### 请假记录权限
| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| leave_record:create | 创建请假记录 | 可以创建请假记录 |
| leave_record:view | 查看请假记录 | 可以查看请假记录 |
| leave_record:edit | 编辑请假记录 | 可以修改请假记录 |
| leave_record:delete | 删除请假记录 | 可以删除请假记录 |
| leave_record:approve | 审批请假记录 | 可以审批请假记录 |

## 角色与权限映射表

### 系统管理员 (sysadmin)
拥有所有权限，包括：
- 所有系统级权限
- 所有寝室级权限
- 所有成员管理权限
- 所有费用相关权限
- 所有账单相关权限
- 所有个人信息权限
- 所有请假记录权限

### 管理员 (admin)
拥有以下权限：
- 系统级权限：admin.access, admin.roles.assign, admin.users.read
- 寝室级权限：room:create, room:view, room:edit, room:invite
- 费用相关权限：expense:create, expense:view, expense:edit, expense:delete
- 账单相关权限：bill:create, bill:view, bill:edit, bill:delete, bill:pay
- 个人信息权限：profile:view, profile:edit

### 寝室长 (room_leader)
拥有以下权限：
- 寝室级权限：room:view, room:edit, room:invite
- 费用相关权限：expense:create, expense:view, expense:edit, expense:delete
- 账单相关权限：bill:create, bill:view, bill:edit, bill:delete, bill:pay
- 个人信息权限：profile:view, profile:edit

### 缴费人 (payer)
拥有以下权限：
- 寝室级权限：room:view
- 费用相关权限：expense:view, expense:create, expense:edit, expense:delete
- 账单相关权限：bill:view, bill:create, bill:edit, bill:delete, bill:pay
- 个人信息权限：profile:view, profile:edit

### 普通用户 (user)
拥有以下权限：
- 寝室级权限：room:view
- 费用相关权限：expense:view, expense:create
- 账单相关权限：bill:view, bill:create, bill:pay
- 个人信息权限：profile:view, profile:edit

### 访客 (guest)
拥有以下权限：
- 个人信息权限：profile:view

## 页面与权限映射

### 认证页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /auth/login | 登录页 | 无 | 仅未登录用户 |
| /auth/register | 注册页 | 无 | 仅未登录用户 |
| /auth/forgot-password | 忘记密码 | 无 | 仅未登录用户 |
| /profile | 个人资料 | profile:view | 需要登录 |

### 仪表盘页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /dashboard | 仪表盘 | 无 | 需要登录 |
| /user-guide | 使用指南 | 无 | 公开访问 |

### 寝室管理页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /rooms | 寝室列表 | room:view | 需要登录 |
| /rooms/create | 创建寝室 | room:create | 需要登录 |
| /rooms/:roomId | 寝室详情 | room:view | 需要登录和寝室权限 |
| /rooms/:roomId/invitations | 寝室邀请 | room:invite | 需要登录和寝室权限 |

### 费用管理页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /expenses | 费用列表 | expense:view | 需要登录 |
| /expenses/create | 创建费用 | expense:create | 需要登录 |
| /expenses/:expenseId | 费用详情 | expense:view | 需要登录 |

### 账单管理页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /bills | 账单列表 | bill:view | 需要登录 |
| /bills/create | 创建账单 | bill:create | 需要登录 |
| /bills/:billId | 账单详情 | bill:view | 需要登录 |
| /bills/:billId/edit | 编辑账单 | bill:edit | 需要登录 |
| /bills/:billId/payment | 支付账单 | bill:pay | 需要登录 |

### 支付相关页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /qr-codes | 二维码管理 | bill:pay | 需要登录 |
| /payments/:billId/scan | 扫码支付 | bill:pay | 需要登录 |
| /payments/history | 支付历史 | bill:pay | 需要登录 |

### 管理功能页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /invite-codes | 邀请码管理 | room:invite | 需要登录 |
| /join-room | 加入寝室 | 无 | 需要登录 |
| /reviews | 审核中心 | room:edit | 需要登录 |
| /disputes | 争议管理 | expense:view | 需要登录 |
| /analytics | 数据分析 | expense:view | 需要登录 |
| /activities | 活动列表 | expense:view | 需要登录 |
| /settings | 系统设置 | 无 | 需要登录 |

### 管理员页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /admin/permissions | 权限测试 | admin.access | 需要登录和管理员权限 |

### 错误页面
| 页面路径 | 页面名称 | 所需权限 | 访问限制 |
|---------|---------|---------|---------|
| /403 | 访问被拒绝 | 无 | 公开访问 |
| /404 | 页面未找到 | 无 | 公开访问 |

## 权限验证机制

### 路由守卫
系统实现了两种路由守卫：
1. **认证守卫 (createAuthGuard)**：检查用户是否已登录
2. **权限守卫 (createPermissionGuard)**：检查用户是否具有访问特定页面所需的权限

### 权限检查函数
- `hasPermission(user, permission, resource)`：检查用户是否具有特定权限
- `hasAnyPermission(user, permissions, resource)`：检查用户是否具有任一权限
- `hasAllPermissions(user, permissions, resource)`：检查用户是否具有所有权限
- `getUserRoleInRoom(user, roomId)`：获取用户在特定寝室的角色
- `canAccessRoom(user, roomId, permission)`：检查用户是否可以访问特定寝室

### 权限指令
- `v-permission`：Vue指令，根据权限控制元素显示/隐藏

## 特殊权限处理

### 资源所有者权限
对于某些操作（如编辑、删除），只有资源创建者才能执行，即使其他用户有相同的角色权限。

### 寝室特定权限
用户在不同寝室中可能有不同的角色和权限。系统会根据用户在特定寝室中的角色来确定其权限。

### 动态权限
系统支持动态权限更新，当用户角色或权限发生变化时，界面会自动更新以反映新的权限状态。