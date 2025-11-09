-- 记账系统数据库表结构定义 (PostgreSQL)
-- 版本: v18
-- 创建日期: 2023-12-01

-- 创建枚举类型
CREATE TYPE IF NOT EXISTS user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE IF NOT EXISTS room_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE IF NOT EXISTS bill_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled');
CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE IF NOT EXISTS payment_method AS ENUM ('cash', 'alipay', 'wechat', 'bank_transfer', 'credit_card');
CREATE TYPE IF NOT EXISTS notification_type AS ENUM ('payment_reminder', 'new_bill', 'payment_confirmed', 'room_invitation', 'system_announcement');
CREATE TYPE IF NOT EXISTS notification_channel AS ENUM ('app', 'email', 'sms', 'wechat');
CREATE TYPE IF NOT EXISTS dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
CREATE TYPE IF NOT EXISTS expense_category AS ENUM ('food', 'transport', 'entertainment', 'shopping', 'utilities', 'rent', 'healthcare', 'education', 'other');
CREATE TYPE IF NOT EXISTS role_type AS ENUM ('system', 'room', 'custom');
CREATE TYPE IF NOT EXISTS leave_type AS ENUM ('leave', 'checkout');
CREATE TYPE IF NOT EXISTS leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'active', 'completed');

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    status user_status DEFAULT 'active',
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    type role_type DEFAULT 'custom',
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id, COALESCE(room_id, 0))
);

-- 房间表
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    status room_status DEFAULT 'active',
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 房间成员表
CREATE TABLE IF NOT EXISTS room_members (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(room_id, user_id)
);

-- 请假记录表
CREATE TABLE IF NOT EXISTS leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status leave_status NOT NULL DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    category expense_category DEFAULT 'other',
    payer_id INTEGER NOT NULL REFERENCES users(id),
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    status bill_status DEFAULT 'pending',
    due_date DATE,
    -- 添加与按在寝天数分摊相关的字段
    calculation_method VARCHAR(20) DEFAULT 'amount', -- 'amount' 或 'reading'
    last_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    billing_start_date DATE,
    billing_end_date DATE,
    precision_version INTEGER DEFAULT 1,
    rounding_method VARCHAR(20) DEFAULT 'bankers', -- 'bankers' 或 'standard'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 账单分摊表
CREATE TABLE IF NOT EXISTS bill_splits (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    present_days INTEGER DEFAULT 0,
    split_ratio DECIMAL(10,4) DEFAULT 0.0000,
    rounding_adjustment DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE(bill_id, user_id)
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    bill_split_id INTEGER NOT NULL REFERENCES bill_splits(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    method payment_method DEFAULT 'cash',
    status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 线下支付表
CREATE TABLE IF NOT EXISTS offline_payments (
    id SERIAL PRIMARY KEY,
    bill_split_id INTEGER NOT NULL REFERENCES bill_splits(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    method payment_method DEFAULT 'cash',
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 支付转账表
CREATE TABLE IF NOT EXISTS payment_transfers (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    method payment_method DEFAULT 'cash',
    status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    type notification_type DEFAULT 'system_announcement',
    channel notification_channel DEFAULT 'app',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- 通知设置表
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, channel)
);

-- 争议表
CREATE TABLE IF NOT EXISTS disputes (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    raised_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    resolution TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户偏好设置表
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    currency VARCHAR(10) DEFAULT 'CNY',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 支付提醒表
CREATE TABLE IF NOT EXISTS payment_reminders (
    id SERIAL PRIMARY KEY,
    bill_split_id INTEGER NOT NULL REFERENCES bill_splits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bill_split_id, user_id, reminder_date)
);

-- 特殊支付规则表
CREATE TABLE IF NOT EXISTS special_payment_rules (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 二维码表
CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_data VARCHAR(500) NOT NULL,
    code_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_user_id ON leave_records(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_room_id ON leave_records(room_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_status ON leave_records(status);
CREATE INDEX IF NOT EXISTS idx_leave_records_dates ON leave_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bills_room_id ON bills(room_id);
CREATE INDEX IF NOT EXISTS idx_bills_payer_id ON bills(payer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_splits_bill_id ON bill_splits(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_user_id ON bill_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_split_id ON payments(bill_split_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 插入默认数据

-- 插入系统角色
INSERT INTO roles (name, description, type, is_system, is_active) VALUES 
('超级管理员', '拥有系统所有权限的超级管理员', 'system', TRUE, TRUE),
('管理员', '拥有大部分管理权限的管理员', 'system', TRUE, TRUE),
('用户', '普通用户，拥有基本权限', 'system', TRUE, TRUE),
('房主', '房间的创建者，拥有房间的所有权限', 'room', TRUE, TRUE),
('管理员', '房间管理员，拥有房间的管理权限', 'room', TRUE, TRUE),
('成员', '房间普通成员', 'room', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- 插入系统权限
INSERT INTO permissions (name, description, resource, action) VALUES 
('用户管理', '管理系统用户', 'user', 'manage'),
('角色管理', '管理系统角色', 'role', 'manage'),
('权限管理', '管理系统权限', 'permission', 'manage'),
('房间管理', '管理所有房间', 'room', 'manage'),
('账单管理', '管理所有账单', 'bill', 'manage'),
('支付管理', '管理所有支付', 'payment', 'manage'),
('系统配置', '管理系统配置', 'system', 'config'),
('审计日志', '查看审计日志', 'audit', 'view'),
('请假管理', '管理所有请假记录', 'leave', 'manage'),
('请假审批', '审批请假申请', 'leave', 'approve'),
('请假查看', '查看请假记录', 'leave', 'view'),
('请假统计', '查看请假统计数据', 'leave', 'stats'),
('创建房间', '创建房间', 'room', 'create'),
('加入房间', '加入房间', 'room', 'join'),
('离开房间', '离开房间', 'room', 'leave'),
('创建账单', '创建账单', 'bill', 'create'),
('查看账单', '查看账单', 'bill', 'view'),
('编辑账单', '编辑账单', 'bill', 'edit'),
('删除账单', '删除账单', 'bill', 'delete'),
('支付账单', '支付账单', 'bill', 'pay'),
('查看支付', '查看支付记录', 'payment', 'view'),
('创建争议', '创建争议', 'dispute', 'create'),
('查看争议', '查看争议', 'dispute', 'view'),
('解决争议', '解决争议', 'dispute', 'resolve')
ON CONFLICT DO NOTHING;

-- 插入角色权限关联
-- 超级管理员拥有所有权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = '超级管理员'
ON CONFLICT DO NOTHING;

-- 管理员拥有除系统配置外的所有权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = '管理员' AND p.name NOT IN ('系统配置', '审计日志')
ON CONFLICT DO NOTHING;

-- 普通用户拥有基本权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = '用户' AND p.name IN (
    '创建房间', '加入房间', '离开房间', 
    '创建账单', '查看账单', '编辑账单', '删除账单', 
    '支付账单', '查看支付', 
    '创建争议', '查看争议',
    '请假查看'
)
ON CONFLICT DO NOTHING;

-- 房主拥有房间的所有权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = '房主' AND p.name IN (
    '创建房间', '加入房间', '离开房间', 
    '创建账单', '查看账单', '编辑账单', '删除账单', 
    '支付账单', '查看支付', 
    '创建争议', '查看争议', '解决争议',
    '请假审批', '请假查看', '请假统计'
)
ON CONFLICT DO NOTHING;

-- 房间管理员拥有房间的管理权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = '管理员' AND p.name IN (
    '创建账单', '查看账单', '编辑账单', '删除账单', 
    '支付账单', '查看支付', 
    '创建争议', '查看争议', '解决争议',
    '请假审批', '请假查看'
)
ON CONFLICT DO NOTHING;

-- 房间成员拥有基本权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = '成员' AND p.name IN (
    '查看账单', '支付账单', '查看支付', 
    '创建争议', '查看争议',
    '请假查看'
)
ON CONFLICT DO NOTHING;

-- 插入系统配置
INSERT INTO system_configs (key, value, description, is_public) VALUES 
('app_name', '记账系统', '应用名称', TRUE),
('app_version', '1.0.0', '应用版本', TRUE),
('max_room_members', '50', '每个房间最大成员数', FALSE),
('default_currency', 'CNY', '默认货币', TRUE),
('password_min_length', '8', '密码最小长度', FALSE),
('session_timeout', '24h', '会话超时时间', FALSE),
('upload_max_size', '5MB', '文件上传最大大小', FALSE)
ON CONFLICT DO NOTHING;

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳的触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_records_updated_at BEFORE UPDATE ON leave_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transfers_updated_at BEFORE UPDATE ON payment_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_special_payment_rules_updated_at BEFORE UPDATE ON special_payment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加bills表字段注释
COMMENT ON COLUMN bills.calculation_method IS '费用计算方式：amount-固定金额，reading-读数计算';
COMMENT ON COLUMN bills.last_reading IS '上次读数，用于读数计算方式';
COMMENT ON COLUMN bills.current_reading IS '当前读数，用于读数计算方式';
COMMENT ON COLUMN bills.unit_price IS '单价，用于读数计算方式';
COMMENT ON COLUMN bills.billing_start_date IS '计费周期开始日期，用于按天数分摊';
COMMENT ON COLUMN bills.billing_end_date IS '计费周期结束日期，用于按天数分摊';
COMMENT ON COLUMN bills.precision_version IS '精度计算版本，用于兼容不同精度算法';
COMMENT ON COLUMN bills.rounding_method IS '舍入方法：bankers-银行家舍入法，standard-标准四舍五入';

-- 添加bill_splits表字段注释
COMMENT ON COLUMN bill_splits.present_days IS '在寝天数，用于按天数分摊计算';
COMMENT ON COLUMN bill_splits.split_ratio IS '分摊比例，用于精确分摊计算';
COMMENT ON COLUMN bill_splits.rounding_adjustment IS '尾差调整，用于处理舍入误差';