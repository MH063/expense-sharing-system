-- 统一数据库初始数据脚本
-- 包含基础角色、权限、系统配置等初始数据

-- ========================================
-- 1. 基础角色数据
-- ========================================

-- 用户角色（根据需求文档定义的5个角色）
INSERT INTO roles (name, description, role_type, is_system) VALUES 
('系统管理员', '系统内置账号，用于系统维护和全局管理', 'admin', true),
('管理员', '具有角色分配、权限管理和角色申请审批权限', 'admin', true),
('寝室长', '具有本寝室相关功能的完全控制权限', 'user', true),
('缴费人', '具有本寝室费用记录的完全控制权限', 'user', true),
('普通用户', '具有基础查看权限', 'user', true);

-- ========================================
-- 2. 基础权限数据
-- ========================================

-- 用户基础权限
INSERT INTO permissions (code, name, description, module) VALUES 
('user.register', '用户注册', '新用户注册', 'user'),
('user.login', '用户登录', '用户登录系统', 'user'),
('user.logout', '用户登出', '用户登出系统', 'user'),
('user.profile.view', '查看个人资料', '查看个人资料信息', 'user'),
('user.profile.edit', '编辑个人资料', '编辑个人资料信息', 'user'),
('user.password.change', '修改密码', '修改登录密码', 'user');

-- 寝室管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('room.create', '创建寝室', '创建新的寝室', 'room'),
('room.join', '加入寝室', '加入现有寝室', 'room'),
('room.view', '查看寝室', '查看寝室信息', 'room'),
('room.edit', '编辑寝室', '编辑寝室信息', 'room'),
('room.members.manage', '成员管理', '管理寝室成员', 'room');

-- 费用记录权限
INSERT INTO permissions (code, name, description, module) VALUES 
('expense.view', '查看费用', '查看费用信息', 'expense'),
('expense.add', '添加费用', '添加新的费用', 'expense'),
('expense.edit', '编辑费用', '编辑费用信息', 'expense'),
('expense.delete', '删除费用', '删除费用', 'expense');

-- 费用分类权限
INSERT INTO permissions (code, name, description, module) VALUES 
('category.view', '查看费用分类', '查看费用分类信息', 'category'),
('category.manage', '管理费用分类', '管理费用分类', 'category');

-- 分摊规则权限
INSERT INTO permissions (code, name, description, module) VALUES 
('split.view', '查看分摊规则', '查看分摊规则', 'split'),
('split.set', '设置分摊规则', '设置分摊规则', 'split');

-- 账单管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('bill.view', '查看账单', '查看账单信息', 'bill'),
('bill.settle', '费用结算', '进行费用结算操作', 'bill');

-- 数据导出权限
INSERT INTO permissions (code, name, description, module) VALUES 
('data.export', '数据导出', '导出数据', 'data');

-- 通知管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('notification.view', '查看通知', '查看通知信息', 'notification'),
('notification.manage', '通知管理', '管理通知', 'notification');

-- 费用图片权限
INSERT INTO permissions (code, name, description, module) VALUES 
('expense.image.upload', '上传费用图片', '上传费用相关图片', 'expense');

-- 费用评论权限
INSERT INTO permissions (code, name, description, module) VALUES 
('expense.comment', '费用评论', '对费用进行评论', 'expense');

-- 角色分配权限
INSERT INTO permissions (code, name, description, module) VALUES 
('role.assign', '角色分配', '分配用户角色', 'role');

-- 权限管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('permission.manage', '权限管理', '管理用户权限', 'permission');

-- 角色申请审批权限
INSERT INTO permissions (code, name, description, module) VALUES 
('role.approve', '角色申请审批', '审批用户角色申请', 'role');

-- 支付管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('payment.view', '查看支付', '查看支付信息', 'payment'),
('payment.confirm', '确认支付', '确认支付操作', 'payment');

-- 统计分析权限
INSERT INTO permissions (code, name, description, module) VALUES 
('statistics.view', '查看统计', '查看统计分析', 'statistics');

-- 系统设置权限
INSERT INTO permissions (code, name, description, module) VALUES 
('system.config', '系统设置', '配置系统参数', 'system');

-- 日志查看权限
INSERT INTO permissions (code, name, description, module) VALUES 
('system.logs', '查看日志', '查看系统日志', 'system');

-- 个人信息权限
INSERT INTO permissions (code, name, description, module) VALUES 
('personal.info.view', '查看个人信息', '查看个人信息', 'personal'),
('personal.info.edit', '编辑个人信息', '编辑个人信息', 'personal');

-- 缴费人角色管理权限
INSERT INTO permissions (code, name, description, module) VALUES 
('payer.role.manage', '缴费人角色管理', '管理缴费人角色', 'role');

-- ========================================
-- 3. 角色权限关联
-- ========================================

-- 系统管理员权限（所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '系统管理员';

-- 管理员权限（除系统设置外的所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '管理员'
AND p.code NOT IN ('system.config', 'system.logs');

-- 寝室长权限（寝室管理、费用管理、账单管理、分摊规则、数据导出、通知管理、统计分析）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '寝室长'
AND p.code IN (
  -- 用户基础权限
  'user.login', 'user.logout', 'user.profile.view', 'user.profile.edit', 'user.password.change',
  -- 寝室管理权限
  'room.create', 'room.join', 'room.view', 'room.edit', 'room.members.manage',
  -- 费用记录权限
  'expense.view', 'expense.add', 'expense.edit', 'expense.delete',
  -- 费用分类权限
  'category.view', 'category.manage',
  -- 分摊规则权限
  'split.view', 'split.set',
  -- 账单管理权限
  'bill.view', 'bill.settle',
  -- 数据导出权限
  'data.export',
  -- 通知管理权限
  'notification.view', 'notification.manage',
  -- 费用图片权限
  'expense.image.upload',
  -- 费用评论权限
  'expense.comment',
  -- 支付管理权限
  'payment.view', 'payment.confirm',
  -- 统计分析权限
  'statistics.view',
  -- 个人信息权限
  'personal.info.view', 'personal.info.edit'
);

-- 缴费人权限（查看费用、账单、支付、个人信息）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '缴费人'
AND p.code IN (
  -- 用户基础权限
  'user.login', 'user.logout', 'user.profile.view', 'user.profile.edit', 'user.password.change',
  -- 寝室管理权限
  'room.view',
  -- 费用记录权限
  'expense.view',
  -- 费用分类权限
  'category.view',
  -- 分摊规则权限
  'split.view',
  -- 账单管理权限
  'bill.view',
  -- 通知管理权限
  'notification.view',
  -- 费用图片权限
  'expense.image.upload',
  -- 费用评论权限
  'expense.comment',
  -- 支付管理权限
  'payment.view', 'payment.confirm',
  -- 个人信息权限
  'personal.info.view', 'personal.info.edit'
);

-- 普通用户权限（查看费用、账单、个人信息）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '普通用户'
AND p.code IN (
  -- 用户基础权限
  'user.login', 'user.logout', 'user.profile.view', 'user.profile.edit', 'user.password.change',
  -- 寝室管理权限
  'room.view',
  -- 费用记录权限
  'expense.view',
  -- 费用分类权限
  'category.view',
  -- 分摊规则权限
  'split.view',
  -- 账单管理权限
  'bill.view',
  -- 通知管理权限
  'notification.view',
  -- 费用图片权限
  'expense.image.upload',
  -- 费用评论权限
  'expense.comment',
  -- 支付管理权限
  'payment.view',
  -- 个人信息权限
  'personal.info.view', 'personal.info.edit'
);

-- ========================================
-- 4. 基础类别数据
-- ========================================

-- 账单类别
INSERT INTO bill_categories (name, description, icon, color) VALUES 
('餐饮', '餐饮相关账单', 'restaurant', '#FF6B6B'),
('购物', '购物相关账单', 'shopping-cart', '#4ECDC4'),
('交通', '交通相关账单', 'car', '#45B7D1'),
('娱乐', '娱乐相关账单', 'gamepad', '#96CEB4'),
('居住', '居住相关账单', 'home', '#FFEAA7'),
('医疗', '医疗相关账单', 'heart', '#DDA0DD'),
('教育', '教育相关账单', 'book', '#98D8C8'),
('其他', '其他账单', 'more-horizontal', '#BDC3C7');

-- 费用类别
INSERT INTO expense_categories (name, description) VALUES 
('房租', '房屋租金'),
('水费', '水费支出'),
('电费', '电费支出'),
('燃气费', '燃气费支出'),
('网费', '网络费用'),
('物业费', '物业管理费'),
('维修费', '维修费用'),
('清洁费', '清洁费用'),
('其他', '其他费用');

-- 费用类型
INSERT INTO expense_types (name, description) VALUES 
('固定费用', '每月固定金额的费用'),
('计量费用', '按使用量计量的费用'),
('一次性费用', '一次性支付的费用'),
('周期性费用', '按周期支付的费用');

-- ========================================
-- 5. 系统配置数据
-- ========================================

-- 系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_public) VALUES 
('system.name', '"记账系统"', 'string', '系统名称', true),
('system.version', '"1.0.0"', 'string', '系统版本', true),
('system.description', '"多人记账系统"', 'string', '系统描述', true),
('system.contact_email', '"support@example.com"', 'string', '系统联系邮箱', true),
('system.max_upload_size', '10485760', 'integer', '最大上传文件大小（字节）', false),
('system.default_currency', '"CNY"', 'string', '默认货币', true),
('system.supported_currencies', '["CNY", "USD", "EUR", "JPY"]', 'json', '支持的货币列表', true),
('system.default_language', '"zh-CN"', 'string', '默认语言', true),
('system.supported_languages', '["zh-CN", "en-US"]', 'json', '支持的语言列表', true),
('system.session_timeout', '86400', 'integer', '会话超时时间（秒）', false),
('system.password_min_length', '8', 'integer', '密码最小长度', false),
('system.password_require_special', 'true', 'boolean', '密码是否需要特殊字符', false),
('system.email_verification_required', 'true', 'boolean', '是否需要邮箱验证', false),
('system.max_room_members', '20', 'integer', '房间最大成员数', false),
('system.max_rooms_per_user', '10', 'integer', '每个用户最大房间数', false),
('system.bill_auto_settlement_days', '7', 'integer', '账单自动结算天数', false),
('system.expense_approval_required', 'false', 'boolean', '费用是否需要审批', false),
('system.payment_timeout_minutes', '30', 'integer', '支付超时时间（分钟）', false),
('system.notification_email_enabled', 'true', 'boolean', '是否启用邮件通知', false),
('system.notification_push_enabled', 'true', 'boolean', '是否启用推送通知', false),
('system.backup_retention_days', '30', 'integer', '备份保留天数', false),
('system.log_retention_days', '90', 'integer', '日志保留天数', false);

-- 功能开关
INSERT INTO feature_flags (name, description, is_enabled, target_scope, target_value) VALUES 
('user_registration', '用户注册功能', true, 'global', '{}'),
('email_verification', '邮箱验证功能', true, 'global', '{}'),
('room_creation', '房间创建功能', true, 'global', '{}'),
('bill_creation', '账单创建功能', true, 'global', '{}'),
('expense_creation', '费用创建功能', true, 'global', '{}'),
('payment_system', '支付系统功能', true, 'global', '{}'),
('dispute_system', '争议系统功能', true, 'global', '{}'),
('review_system', '评论系统功能', true, 'global', '{}'),
('activity_system', '活动系统功能', true, 'global', '{}'),
('data_export', '数据导出功能', true, 'global', '{}'),
('data_import', '数据导入功能', false, 'global', '{}'),
('advanced_analytics', '高级分析功能', false, 'global', '{}'),
('api_access', 'API访问功能', false, 'global', '{}');

-- ========================================
-- 6. 默认公告数据
-- ========================================

INSERT INTO announcements (title, content, announcement_type, priority, is_active, created_by) VALUES 
('欢迎使用记账系统', '欢迎使用多人记账系统！本系统可以帮助您和室友、朋友一起管理账单和费用，让记账变得更加简单和透明。', 'info', 'normal', true, 1),
('系统更新通知', '系统已完成更新，新增了费用管理和支付功能，欢迎大家体验并提供反馈意见。', 'info', 'normal', true, 1);

-- ========================================
-- 7. 默认文档类型数据
-- ========================================

INSERT INTO document_types (name, description, icon) VALUES 
('用户指南', '用户使用指南', 'book-open'),
('管理员指南', '管理员使用指南', 'shield'),
('API文档', 'API接口文档', 'code'),
('常见问题', '常见问题解答', 'help-circle'),
('更新日志', '系统更新日志', 'git-branch');

-- ========================================
-- 8. 初始数据脚本完成
-- ========================================