-- 测试数据库初始化脚本 - PostgreSQL版本
-- 创建测试数据库（PostgreSQL中需要先创建数据库，然后连接）
-- 注意：PostgreSQL中需要先手动创建数据库，然后执行此脚本
-- 创建数据库命令：CREATE DATABASE test_expense_system;

-- 启用UUID/加密扩展（gen_random_uuid 需要 pgcrypto）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 清理旧表（避免历史结构不一致导致列缺失）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expense_splits') THEN EXECUTE 'DROP TABLE IF EXISTS expense_splits CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bill_expenses') THEN EXECUTE 'DROP TABLE IF EXISTS bill_expenses CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN EXECUTE 'DROP TABLE IF EXISTS payments CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN EXECUTE 'DROP TABLE IF EXISTS notifications CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_qr_codes') THEN EXECUTE 'DROP TABLE IF EXISTS user_qr_codes CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN EXECUTE 'DROP TABLE IF EXISTS expenses CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='bills') THEN EXECUTE 'DROP TABLE IF EXISTS bills CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_room_relations') THEN EXECUTE 'DROP TABLE IF EXISTS user_room_relations CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='rooms') THEN EXECUTE 'DROP TABLE IF EXISTS rooms CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expense_types') THEN EXECUTE 'DROP TABLE IF EXISTS expense_types CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='system_settings') THEN EXECUTE 'DROP TABLE IF EXISTS system_settings CASCADE'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users') THEN EXECUTE 'DROP TABLE IF EXISTS users CASCADE'; END IF;
END$$;
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT '普通用户' CHECK (role IN ('系统管理员', '管理员', '寝室长', '缴费人', '普通用户')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 寝室表
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(20) UNIQUE NOT NULL,
    max_members INTEGER DEFAULT 6,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户寝室关联表
CREATE TABLE IF NOT EXISTS user_room_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('owner', 'member', 'payer')),
    join_date DATE NOT NULL,
    leave_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, room_id)
);

-- 费用类型表
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    calculation_method VARCHAR(20) NOT NULL DEFAULT 'amount' CHECK (calculation_method IN ('amount', 'reading', 'custom')),
    unit VARCHAR(20),
    is_system_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    -- 为测试所需新增的字段（保持向后兼容）
    icon VARCHAR(100),
    color VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 兼容旧环境：设置默认值
ALTER TABLE expense_types ALTER COLUMN calculation_method SET DEFAULT 'amount';
-- 兼容旧环境：确保新增列存在
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS color VARCHAR(20);
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 费用表
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    unit_price DECIMAL(8,4),
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    split_algorithm VARCHAR(20) DEFAULT 'equal' CHECK (split_algorithm IN ('equal', 'by_days', 'custom', 'by_area')),
    split_parameters JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 费用分摊明细表
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('equal', 'by_days', 'custom', 'by_area')),
    split_ratio DECIMAL(5,4) NOT NULL CHECK (split_ratio >= 0 AND split_ratio <= 1),
    days_in_room INTEGER,
    custom_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expense_id, user_id)
);

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED')),
    period_start DATE,
    period_end DATE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 账单费用关联表
CREATE TABLE IF NOT EXISTS bill_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expense_id)
);

-- 用户收款码表
CREATE TABLE IF NOT EXISTS user_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('wechat', 'alipay')),
    qr_image_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, qr_type)
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL,
    qr_code_type VARCHAR(20) CHECK (qr_code_type IN ('wechat', 'alipay')),
    payment_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'offline_pending')),
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    -- 供离线支付相关测试使用的扩展字段
    is_offline BOOLEAN DEFAULT FALSE,
    sync_status VARCHAR(32),
    device_id VARCHAR(100),
    transaction_id VARCHAR(100),
    receipt TEXT,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 离线支付记录表（供离线支付服务与优化控制器使用）
CREATE TABLE IF NOT EXISTS offline_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL,
    notes TEXT,
    payment_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
    last_sync_attempt TIMESTAMP,
    sync_attempts INTEGER DEFAULT 0,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 兼容旧环境：确保 offline_payments 表存在关键列
ALTER TABLE offline_payments ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE offline_payments ADD COLUMN IF NOT EXISTS bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE;
ALTER TABLE offline_payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed'));

-- 关联索引
CREATE INDEX IF NOT EXISTS idx_offline_payments_user_id ON offline_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_bill_id ON offline_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_status ON offline_payments(status);

-- 系统通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认数据

-- 插入默认费用类型（系统默认，created_by 为 NULL，标记 is_default=true）
INSERT INTO expense_types (name, description, calculation_method, is_system_default, sort_order, icon, color, is_default, created_by) VALUES
('电费', '寝室用电费用', 'reading', TRUE, 1, 'bolt', '#FFC107', TRUE, NULL),
('水费', '寝室用水费用', 'reading', TRUE, 2, 'water', '#03A9F4', TRUE, NULL),
('网费', '寝室网络费用', 'amount', TRUE, 3, 'wifi', '#9C27B0', TRUE, NULL),
('物业费', '寝室物业管理费用', 'amount', TRUE, 4, 'home', '#4CAF50', TRUE, NULL),
('其他费用', '其他杂项费用', 'custom', TRUE, 5, 'more', '#9E9E9E', TRUE, NULL);
-- 兼容：如旧记录存在，仅同步 is_default 与 created_by
UPDATE expense_types SET is_default = TRUE, created_by = NULL WHERE is_system_default = TRUE;

-- 插入系统设置
INSERT INTO system_settings (key, value, description) VALUES
('site_name', '寝室费用分摊记账系统', '网站名称'),
('default_currency', 'CNY', '默认货币'),
('max_room_members', '6', '寝室最大成员数'),
('auto_reminder_days', '3', '自动提醒天数');

-- 账单分摊表（供账单控制器使用）
CREATE TABLE IF NOT EXISTS bill_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PENDING_PAYMENT','PAID')),
    paid_at TIMESTAMP
);

-- 账单审核记录表
CREATE TABLE IF NOT EXISTS bill_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(16) NOT NULL CHECK (action IN ('APPROVE','REJECT')),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 兼容视图：将 user_room_relations 映射为 room_members（供部分控制器/旧代码使用）
-- 先处理可能存在的同名表或视图
DROP TABLE IF EXISTS room_members CASCADE;
DROP VIEW IF EXISTS room_members CASCADE;
CREATE VIEW room_members AS
SELECT 
  room_id, 
  user_id, 
  CASE WHEN relation_type = 'owner' THEN 'admin' ELSE 'member' END AS role
FROM user_room_relations
WHERE is_active = TRUE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_room_id ON bills(room_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);