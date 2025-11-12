/**
 * 安全增强功能数据库迁移脚本
 * 创建所需的表和索引
 */

-- ==================== 密码历史表 ====================
CREATE TABLE IF NOT EXISTS password_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_history_user (user_id),
  INDEX idx_password_history_created (created_at)
);

COMMENT ON TABLE password_history IS '密码历史记录表';
COMMENT ON COLUMN password_history.user_id IS '用户ID';
COMMENT ON COLUMN password_history.password_hash IS '密码哈希';
COMMENT ON COLUMN password_history.created_at IS '创建时间';

-- ==================== 密码重置令牌表 ====================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_token_hash (token_hash),
  INDEX idx_reset_token_user (user_id),
  INDEX idx_reset_token_expires (expires_at)
);

COMMENT ON TABLE password_reset_tokens IS '密码重置令牌表';
COMMENT ON COLUMN password_reset_tokens.user_id IS '用户ID';
COMMENT ON COLUMN password_reset_tokens.token_hash IS '令牌哈希值';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '过期时间';
COMMENT ON COLUMN password_reset_tokens.used IS '是否已使用';
COMMENT ON COLUMN password_reset_tokens.attempts IS '使用尝试次数';

-- ==================== 安全审计日志表 ====================
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  event_description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  resource VARCHAR(255),
  action VARCHAR(50),
  result VARCHAR(20) DEFAULT 'success',
  metadata JSONB,
  severity VARCHAR(20) DEFAULT 'info',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_event_type (event_type),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_ip (ip_address),
  INDEX idx_audit_severity (severity)
);

COMMENT ON TABLE security_audit_logs IS '安全审计日志表';
COMMENT ON COLUMN security_audit_logs.event_type IS '事件类型';
COMMENT ON COLUMN security_audit_logs.result IS '结果: success, failure, blocked等';
COMMENT ON COLUMN security_audit_logs.severity IS '严重程度: info, medium, high, critical';
COMMENT ON COLUMN security_audit_logs.metadata IS '附加元数据(JSON格式)';

-- ==================== 确保roles表存在 ====================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  level INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_roles_name (name),
  INDEX idx_roles_level (level)
);

COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.name IS '角色名称';
COMMENT ON COLUMN roles.level IS '角色级别,数字越大权限越高';
COMMENT ON COLUMN roles.is_system IS '是否为系统内置角色';

-- ==================== 确保permissions表存在 ====================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(100),
  action VARCHAR(50),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_permissions_code (code),
  INDEX idx_permissions_resource (resource)
);

COMMENT ON TABLE permissions IS '权限表';
COMMENT ON COLUMN permissions.code IS '权限代码,唯一标识';
COMMENT ON COLUMN permissions.resource IS '资源类型';
COMMENT ON COLUMN permissions.action IS '操作类型';

-- ==================== 确保user_roles表存在 ====================
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role_id),
  INDEX idx_user_roles_user (user_id),
  INDEX idx_user_roles_role (role_id)
);

COMMENT ON TABLE user_roles IS '用户角色关联表';

-- ==================== 确保role_permissions表存在 ====================
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id),
  INDEX idx_role_permissions_role (role_id),
  INDEX idx_role_permissions_permission (permission_id)
);

COMMENT ON TABLE role_permissions IS '角色权限关联表';

-- ==================== 插入默认角色 ====================
INSERT INTO roles (name, description, level, is_system) VALUES
  ('系统管理员', '系统内置账号，用于系统维护和全局管理', 100, true),
  ('管理员', '具有角色分配、权限管理和角色申请审批权限', 90, true),
  ('寝室长', '具有本寝室相关功能的完全控制权限', 50, true),
  ('缴费人', '具有本寝室费用记录的完全控制权限', 40, true),
  ('用户', '具有基础查看权限', 10, true)
ON CONFLICT (name) DO NOTHING;

-- ==================== 插入默认权限 ====================
INSERT INTO permissions (code, name, description, resource, action, is_system) VALUES
  -- 用户基础权限
  ('user.register', '用户注册', '新用户注册', 'user', 'register', true),
  ('user.login', '用户登录', '用户登录系统', 'user', 'login', true),
  ('user.logout', '用户登出', '用户登出系统', 'user', 'logout', true),
  ('user.profile.view', '查看个人资料', '查看个人资料信息', 'user', 'view', true),
  ('user.profile.edit', '编辑个人资料', '编辑个人资料信息', 'user', 'edit', true),
  ('user.password.change', '修改密码', '修改登录密码', 'user', 'change', true),
  
  -- 寝室管理权限
  ('room.create', '创建寝室', '创建新的寝室', 'room', 'create', true),
  ('room.join', '加入寝室', '加入现有寝室', 'room', 'join', true),
  ('room.view', '查看寝室', '查看寝室信息', 'room', 'view', true),
  ('room.edit', '编辑寝室', '编辑寝室信息', 'room', 'edit', true),
  ('room.members.manage', '成员管理', '管理寝室成员', 'room', 'manage', true),
  
  -- 费用记录权限
  ('expense.view', '查看费用', '查看费用信息', 'expense', 'view', true),
  ('expense.add', '添加费用', '添加新的费用', 'expense', 'add', true),
  ('expense.edit', '编辑费用', '编辑费用信息', 'expense', 'edit', true),
  ('expense.delete', '删除费用', '删除费用', 'expense', 'delete', true),
  
  -- 费用分类权限
  ('category.view', '查看费用分类', '查看费用分类信息', 'category', 'view', true),
  ('category.manage', '管理费用分类', '管理费用分类', 'category', 'manage', true),
  
  -- 分摊规则权限
  ('split.view', '查看分摊规则', '查看分摊规则', 'split', 'view', true),
  ('split.set', '设置分摊规则', '设置分摊规则', 'split', 'set', true),
  
  -- 账单管理权限
  ('bill.view', '查看账单', '查看账单信息', 'bill', 'view', true),
  ('bill.settle', '费用结算', '进行费用结算操作', 'bill', 'settle', true),
  
  -- 数据导出权限
  ('data.export', '数据导出', '导出数据', 'data', 'export', true),
  
  -- 通知管理权限
  ('notification.view', '查看通知', '查看通知信息', 'notification', 'view', true),
  ('notification.manage', '通知管理', '管理通知', 'notification', 'manage', true),
  
  -- 费用图片权限
  ('expense.image.upload', '上传费用图片', '上传费用相关图片', 'expense', 'upload', true),
  
  -- 费用评论权限
  ('expense.comment', '费用评论', '对费用进行评论', 'expense', 'comment', true),
  
  -- 角色分配权限
  ('role.assign', '角色分配', '分配用户角色', 'role', 'assign', true),
  
  -- 权限管理权限
  ('permission.manage', '权限管理', '管理用户权限', 'permission', 'manage', true),
  
  -- 角色申请审批权限
  ('role.approve', '角色申请审批', '审批用户角色申请', 'role', 'approve', true),
  
  -- 支付管理权限
  ('payment.view', '查看支付', '查看支付信息', 'payment', 'view', true),
  ('payment.confirm', '确认支付', '确认支付操作', 'payment', 'confirm', true),
  
  -- 统计分析权限
  ('statistics.view', '查看统计', '查看统计分析', 'statistics', 'view', true),
  
  -- 系统设置权限
  ('system.config', '系统设置', '配置系统参数', 'system', 'config', true),
  
  -- 日志查看权限
  ('system.logs', '查看日志', '查看系统日志', 'system', 'logs', true),
  
  -- 个人信息权限
  ('personal.info.view', '查看个人信息', '查看个人信息', 'personal', 'view', true),
  ('personal.info.edit', '编辑个人信息', '编辑个人信息', 'personal', 'edit', true),
  
  -- 缴费人角色管理权限
  ('payer.role.manage', '缴费人角色管理', '管理缴费人角色', 'role', 'manage', true)
ON CONFLICT (code) DO NOTHING;

-- ==================== 为角色分配权限 ====================

-- 系统管理员:仅系统维护相关权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '系统管理员'
AND p.code IN (
  -- 系统设置权限
  'system.config',
  -- 日志查看权限
  'system.logs',
  -- 权限管理权限
  'permission.manage',
  -- 角色分配权限
  'role.assign',
  -- 角色申请审批权限
  'role.approve',
  -- 数据导出权限
  'data.export',
  -- 通知管理权限
  'notification.manage'
)
ON CONFLICT DO NOTHING;

-- 管理员:除系统设置和日志查看外的所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '管理员'
AND p.code NOT IN ('system.config', 'system.logs')
ON CONFLICT DO NOTHING;

-- 寝室长:寝室管理相关权限
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
  'personal.info.view', 'personal.info.edit',
  -- 缴费人角色管理权限
  'payer.role.manage'
)
ON CONFLICT DO NOTHING;

-- 缴费人:支付相关权限
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
  'expense.view', 'expense.add', 'expense.edit', 'expense.delete',
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
  'personal.info.view', 'personal.info.edit',

)
ON CONFLICT DO NOTHING;

-- 用户:基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '用户'
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
)
ON CONFLICT DO NOTHING;

-- ==================== 添加users表的is_active字段(如果不存在) ====================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- ==================== 创建触发器自动更新updated_at ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为roles表创建触发器
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at 
  BEFORE UPDATE ON roles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 为permissions表创建触发器
DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at 
  BEFORE UPDATE ON permissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
