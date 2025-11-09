-- 记账系统统一数据库初始化脚本
-- 版本: 1.0
-- 创建日期: 2025-11-09

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. 统一用户认证和权限管理系统
-- ========================================

-- 用户表（整合前端users表和管理端需求）
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户配置文件表
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    full_name VARCHAR(100),
    nickname VARCHAR(50),
    gender VARCHAR(10),
    birth_date DATE,
    location VARCHAR(100),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户设置表
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    currency VARCHAR(10) DEFAULT 'CNY',
    notification_email BOOLEAN DEFAULT true,
    notification_push BOOLEAN DEFAULT true,
    privacy_level VARCHAR(20) DEFAULT 'friends',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表（从管理端admins表扩展）
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) UNIQUE, -- 关联到用户表，实现统一认证
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色表（整合前端和管理端角色系统）
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    role_type VARCHAR(20) NOT NULL, -- 'user', 'admin'
    is_system BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 权限表（整合前端和管理端权限系统）
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 用户角色关联表
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(user_id, role_id)
);

-- 管理员角色关联表
CREATE TABLE admin_roles (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    role_id INTEGER REFERENCES roles(id),
    assigned_by INTEGER REFERENCES admins(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, role_id)
);

-- 令牌表（整合前端user_tokens和管理端admin_tokens）
CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员令牌表
CREATE TABLE admin_tokens (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 第三方账户关联表
CREATE TABLE third_party_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- ========================================
-- 2. 房间管理相关表
-- ========================================

-- 房间表
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    creator_id INTEGER REFERENCES users(id),
    invite_code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 房间成员表
CREATE TABLE room_members (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin', 'leader'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- 房间邀请表
CREATE TABLE room_invitations (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    inviter_id INTEGER REFERENCES users(id),
    invitee_email VARCHAR(100),
    invitee_id INTEGER REFERENCES users(id),
    token VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 房间负责人表（从管理端room_leaders表）
CREATE TABLE room_leaders (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES admins(id),
    appointment_date DATE,
    end_date DATE,
    appointment_reason TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(room_id)
);

-- 房间设置表
CREATE TABLE room_expense_settings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    allowed_categories JSONB, -- 允许的费用类别ID数组
    default_split_method VARCHAR(20) DEFAULT 'equal',
    require_receipt BOOLEAN DEFAULT false,
    max_monthly_expense DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id)
);

-- ========================================
-- 3. 账单管理相关表
-- ========================================

-- 账单类别表
CREATE TABLE bill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单表
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    category_id INTEGER REFERENCES bill_categories(id),
    creator_id INTEGER REFERENCES users(id),
    room_id INTEGER REFERENCES rooms(id),
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    settled_at TIMESTAMP,
    version INTEGER DEFAULT 1, -- 版本号，用于乐观锁
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单评论表
CREATE TABLE bill_comments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单分摊表
CREATE TABLE bill_splits (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    percentage DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending',
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单结算状态表
CREATE TABLE bill_settlement_status (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    settlement_date DATE,
    total_amount DECIMAL(15,2),
    settled_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单统计表
CREATE TABLE bill_statistics (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    month DATE NOT NULL, -- 年月
    total_amount DECIMAL(15,2),
    paid_amount DECIMAL(15,2),
    pending_amount DECIMAL(15,2),
    count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id, month)
);

-- ========================================
-- 4. 费用管理相关表
-- ========================================

-- 费用类别表
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES expense_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用表
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    category_id INTEGER REFERENCES expense_categories(id),
    payer_id INTEGER REFERENCES users(id),
    room_id INTEGER REFERENCES rooms(id),
    expense_date DATE NOT NULL,
    calculation_method VARCHAR(20) DEFAULT 'amount', -- 'amount' 或 'reading'
    meter_type VARCHAR(50), -- 电表、水表等
    current_reading DECIMAL(10,2), -- 本次读数
    previous_reading DECIMAL(10,2), -- 上次读数
    unit_price DECIMAL(10,2), -- 单价
    split_method VARCHAR(20) DEFAULT 'equal', -- 'equal' 或 'custom'
    split_members JSONB, -- 分摊成员ID数组
    split_ratios JSONB, -- 分摊比例
    receipt_url VARCHAR(255), -- 凭证URL
    version INTEGER DEFAULT 1, -- 版本号，用于乐观锁
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用分摊表
CREATE TABLE expense_splits (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    percentage DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending',
    settled_at TIMESTAMP,
    version INTEGER DEFAULT 1, -- 版本号，用于乐观锁
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用凭证表
CREATE TABLE expense_receipts (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用审核状态表
CREATE TABLE expense_approval_status (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用限制表
CREATE TABLE expense_limits (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    category_id INTEGER REFERENCES expense_categories(id),
    max_amount DECIMAL(15,2),
    min_amount DECIMAL(15,2),
    warning_amount DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 历史费用数据表
CREATE TABLE historical_expense_stats (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    category_id INTEGER REFERENCES expense_categories(id),
    month DATE NOT NULL, -- 年月
    avg_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    min_amount DECIMAL(15,2),
    count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, category_id, month)
);

-- 历史读数数据表
CREATE TABLE historical_reading_stats (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    meter_type VARCHAR(50),
    month DATE NOT NULL, -- 年月
    avg_usage DECIMAL(10,2),
    avg_unit_price DECIMAL(10,2),
    count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, meter_type, month)
);

-- 费用争议状态表
CREATE TABLE expense_dispute_status (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    status VARCHAR(20) NOT NULL, -- 'open', 'investigating', 'resolved'
    assigned_to INTEGER REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用统计表
CREATE TABLE expense_statistics (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES expense_categories(id),
    month DATE NOT NULL, -- 年月
    total_amount DECIMAL(15,2),
    count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id, category_id, month)
);

-- 费用标签表
CREATE TABLE expense_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    room_id INTEGER REFERENCES rooms(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, room_id)
);

-- 费用标签关联表
CREATE TABLE expense_tag_relations (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    tag_id INTEGER REFERENCES expense_tags(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_id, tag_id)
);

-- ========================================
-- 5. 支付管理相关表
-- ========================================

-- 支付表
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    bill_id INTEGER REFERENCES bills(id),
    expense_id INTEGER REFERENCES expenses(id),
    payer_id INTEGER REFERENCES users(id),
    payee_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    payment_method VARCHAR(50),
    payment_details JSONB, -- 支付详情
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    version INTEGER DEFAULT 1, -- 版本号，用于乐观锁
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 支付转账表
CREATE TABLE payment_transfers (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 二维码管理表
CREATE TABLE qr_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    image_url VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50),
    is_default BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 支付码扫描记录表
CREATE TABLE qr_payment_records (
    id SERIAL PRIMARY KEY,
    qr_code_id INTEGER REFERENCES qr_codes(id),
    payer_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 用户支付偏好表
CREATE TABLE user_payment_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    preferred_payment_method VARCHAR(50),
    default_qr_code_id INTEGER REFERENCES qr_codes(id),
    auto_settle_bills BOOLEAN DEFAULT false,
    notification_threshold DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ========================================
-- 6. 争议管理相关表
-- ========================================

-- 争议表
CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    bill_id INTEGER REFERENCES bills(id),
    expense_id INTEGER REFERENCES expenses(id),
    creator_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open',
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 争议参与者表
CREATE TABLE dispute_participants (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dispute_id, user_id)
);

-- 争议证据表
CREATE TABLE dispute_evidence (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 争议分配表
CREATE TABLE dispute_assignments (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    assigned_to INTEGER REFERENCES admins(id),
    assigned_by INTEGER REFERENCES admins(id),
    handling_details JSONB,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 争议处理日志表
CREATE TABLE dispute_handling_logs (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    handled_by INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    notes TEXT,
    log_details JSONB,
    handled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. 评论管理相关表
-- ========================================

-- 评论表
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    bill_id INTEGER REFERENCES bills(id),
    room_id INTEGER REFERENCES rooms(id),
    reviewer_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评论图片表
CREATE TABLE review_images (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES reviews(id),
    image_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 8. 邀请码管理相关表
-- ========================================

-- 邀请码表
CREATE TABLE invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    room_id INTEGER REFERENCES rooms(id),
    creator_id INTEGER REFERENCES users(id),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 邀请码使用记录表
CREATE TABLE invite_code_usage (
    id SERIAL PRIMARY KEY,
    invite_code_id INTEGER REFERENCES invite_codes(id),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 9. 活动管理相关表
-- ========================================

-- 活动表
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    location VARCHAR(255),
    creator_id INTEGER REFERENCES users(id),
    room_id INTEGER REFERENCES rooms(id),
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 活动参与者表
CREATE TABLE activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'invited',
    responded_at TIMESTAMP,
    UNIQUE(activity_id, user_id)
);

-- ========================================
-- 10. 特殊支付规则相关表
-- ========================================

-- 费用类型表
CREATE TABLE expense_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 特殊支付规则表
CREATE TABLE special_payment_rules (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    condition_type VARCHAR(50) NOT NULL,
    condition_value JSONB,
    payment_type VARCHAR(50) NOT NULL,
    payment_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 房间支付规则表
CREATE TABLE room_payment_rules (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 11. 系统管理相关表
-- ========================================

-- 系统配置表
CREATE TABLE system_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 功能开关表
CREATE TABLE feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    target_scope VARCHAR(20) DEFAULT 'global',
    target_value JSONB,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 维护窗口表
CREATE TABLE maintenance_windows (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    affected_services JSONB,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 公告表
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 12. 日志和审计相关表
-- ========================================

-- 用户活动日志表
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户状态变更日志表
CREATE TABLE user_status_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason TEXT,
    changed_by INTEGER REFERENCES admins(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员操作日志表
CREATE TABLE admin_operation_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_params JSONB,
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    response_time INTEGER,
    operation_result VARCHAR(20), -- 'success', 'failure', 'partial'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据变更审计表
CREATE TABLE data_change_audits (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by INTEGER REFERENCES admins(id),
    ip_address INET,
    user_agent TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统错误日志表
CREATE TABLE system_error_logs (
    id SERIAL PRIMARY KEY,
    error_level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warning', 'error', 'critical'
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_details JSONB,
    stack_trace TEXT,
    module VARCHAR(100),
    function_name VARCHAR(100),
    line_number INTEGER,
    admin_id INTEGER REFERENCES admins(id),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统审计日志表
CREATE TABLE system_audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50),
    event_description TEXT,
    event_data JSONB,
    admin_id INTEGER REFERENCES admins(id),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 13. 通知管理相关表
-- ========================================

-- 通知表
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账单支付提醒表
CREATE TABLE bill_payment_reminders (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    user_id INTEGER REFERENCES users(id),
    reminder_type VARCHAR(20) NOT NULL, -- 'email', 'push', 'sms'
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 14. 批量任务与报表相关表
-- ========================================

-- 批量任务表
CREATE TABLE batch_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL,
    job_name VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    admin_id INTEGER REFERENCES admins(id),
    execution_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 报表定义表
CREATE TABLE report_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(100) NOT NULL,
    query_sql TEXT,
    parameters_schema JSONB,
    schedule_cron VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 报表快照表
CREATE TABLE report_snapshots (
    id SERIAL PRIMARY KEY,
    report_definition_id INTEGER REFERENCES report_definitions(id),
    snapshot_data JSONB NOT NULL,
    parameters_used JSONB,
    admin_id INTEGER REFERENCES admins(id),
    generation_details JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 导出任务表
CREATE TABLE export_tasks (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_format VARCHAR(20) NOT NULL,
    filters JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    file_url VARCHAR(500),
    file_size INTEGER,
    admin_id INTEGER REFERENCES admins(id),
    export_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- ========================================
-- 15. 内容审核与工单相关表
-- ========================================

-- 审核队列表
CREATE TABLE moderation_queue (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_id INTEGER NOT NULL,
    content_preview TEXT,
    reason TEXT,
    reported_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to INTEGER REFERENCES admins(id),
    decision VARCHAR(20),
    decision_notes TEXT,
    review_details JSONB,
    decided_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 支持工单表
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES admins(id),
    handling_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 工单评论表
CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id),
    author_id INTEGER, -- 可以是用户或管理员
    author_type VARCHAR(20) NOT NULL, -- 'user' 或 'admin'
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    comment_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- ========================================
-- 16. 集成与回调相关表
-- ========================================

-- Webhooks表
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    secret_token VARCHAR(100),
    events JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Webhook事件表
CREATE TABLE webhook_events (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES webhooks(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    processing_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- ========================================
-- 17. 文档管理相关表
-- ========================================

-- 文档表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    admin_id INTEGER REFERENCES admins(id),
    created_by INTEGER REFERENCES admins(id),
    updated_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档历史表
CREATE TABLE document_histories (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    version INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    admin_id INTEGER REFERENCES admins(id),
    history_details JSONB,
    changed_by INTEGER REFERENCES admins(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, version)
);

-- 文档类型表
CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档统计表
CREATE TABLE document_statistics (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    last_downloaded_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档访问日志表
CREATE TABLE document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) NOT NULL, -- 'view', 'download', etc.
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 18. 系统维护相关表
-- ========================================

-- 数据备份记录表
CREATE TABLE data_backup_records (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_size BIGINT,
    backup_path VARCHAR(500),
    backup_status VARCHAR(20) NOT NULL, -- 'started', 'running', 'completed', 'failed'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    backup_details JSONB,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据恢复记录表
CREATE TABLE data_restore_records (
    id SERIAL PRIMARY KEY,
    restore_name VARCHAR(255) NOT NULL,
    backup_id INTEGER REFERENCES data_backup_records(id),
    restore_type VARCHAR(20) NOT NULL, -- 'full', 'partial', 'table'
    restore_status VARCHAR(20) NOT NULL, -- 'started', 'running', 'completed', 'failed'
    restore_tables JSONB,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    restore_details JSONB,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统维护计划表
CREATE TABLE system_maintenance_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(20) NOT NULL, -- 'scheduled', 'emergency', 'routine'
    plan_description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    affected_modules JSONB,
    maintenance_tasks JSONB,
    status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
    notification_sent BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统维护执行记录表
CREATE TABLE system_maintenance_executions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES system_maintenance_plans(id),
    task_name VARCHAR(255) NOT NULL,
    task_status VARCHAR(20) DEFAULT 'pending',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    execution_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 19. 其他辅助表
-- ========================================

-- 密码重置令牌表
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户活动统计表
CREATE TABLE user_activity_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_date DATE NOT NULL,
    login_count INTEGER DEFAULT 0,
    expense_created_count INTEGER DEFAULT 0,
    bill_created_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, activity_date)
);

-- 费用分摊历史表
CREATE TABLE expense_split_history (
    id SERIAL PRIMARY KEY,
    expense_split_id INTEGER REFERENCES expense_splits(id),
    old_amount DECIMAL(15,2),
    new_amount DECIMAL(15,2),
    old_percentage DECIMAL(5,2),
    new_percentage DECIMAL(5,2),
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用线路表
CREATE TABLE expense_lines (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    name VARCHAR(100) NOT NULL,
    calculation_method VARCHAR(20) NOT NULL, -- 'amount' 或 'reading'
    amount DECIMAL(15,2),
    current_reading DECIMAL(10,2),
    previous_reading DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 费用审核表
CREATE TABLE expense_reviews (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    reviewer_id INTEGER REFERENCES admins(id),
    status VARCHAR(20) NOT NULL,
    review_notes TEXT,
    review_details JSONB,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 异常费用表
CREATE TABLE abnormal_expenses (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    reason TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    detected_by INTEGER REFERENCES admins(id),
    resolved_by INTEGER REFERENCES admins(id),
    handling_details JSONB,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- 异常费用统计表
CREATE TABLE abnormal_expense_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    high_severity_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stat_date)
);

-- 管理员会话表
CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- 管理员权限变更历史表
CREATE TABLE admin_permission_history (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    role_id INTEGER REFERENCES admin_roles(id),
    permission_id INTEGER REFERENCES admin_permissions(id),
    action VARCHAR(20) NOT NULL, -- 'grant', 'revoke'
    granted_by INTEGER REFERENCES admins(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 管理员操作限制表
CREATE TABLE admin_operation_restrictions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_type VARCHAR(50) NOT NULL,
    restriction_type VARCHAR(20) NOT NULL, -- 'time_based', 'count_based', 'ip_based'
    restriction_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员操作统计表
CREATE TABLE admin_operation_statistics (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    operation_date DATE NOT NULL,
    operation_type VARCHAR(50),
    operation_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, operation_date, operation_type)
);

-- 系统性能监控表
CREATE TABLE system_performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSONB
);

-- 系统资源使用表
CREATE TABLE system_resource_usage (
    id SERIAL PRIMARY KEY,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_in DECIMAL(15,2),
    network_out DECIMAL(15,2),
    active_connections INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 20. 请假记录表
-- ========================================

-- 创建请假类型枚举
CREATE TYPE IF NOT EXISTS leave_type AS ENUM ('leave', 'checkout');
CREATE TYPE IF NOT EXISTS leave_status AS ENUM ('pending', 'approved', 'verified', 'settled', 'cancelled');

-- 请假记录表
CREATE TABLE IF NOT EXISTS leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- 可以为NULL，表示未结束的请假
    reason TEXT,
    status leave_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- ========================================
-- 创建索引
-- ========================================

-- 用户相关索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_status ON admins(status);
CREATE INDEX idx_admins_user_id ON admins(user_id);

-- 角色权限相关索引
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_type ON roles(role_type);
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_admin_roles_admin_id ON admin_roles(admin_id);
CREATE INDEX idx_admin_roles_role_id ON admin_roles(role_id);

-- 令牌相关索引
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_expires_at ON user_tokens(expires_at);
CREATE INDEX idx_admin_tokens_admin_id ON admin_tokens(admin_id);
CREATE INDEX idx_admin_tokens_expires_at ON admin_tokens(expires_at);

-- 房间相关索引
CREATE INDEX idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX idx_rooms_invite_code ON rooms(invite_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_room_invitations_room_id ON room_invitations(room_id);
CREATE INDEX idx_room_invitations_token ON room_invitations(token);
CREATE INDEX idx_room_leaders_room_id ON room_leaders(room_id);
CREATE INDEX idx_room_leaders_user_id ON room_leaders(user_id);
CREATE INDEX idx_room_expense_settings_room_id ON room_expense_settings(room_id);

-- 账单相关索引
CREATE INDEX idx_bills_creator_id ON bills(creator_id);
CREATE INDEX idx_bills_room_id ON bills(room_id);
CREATE INDEX idx_bills_category_id ON bills(category_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bill_comments_bill_id ON bill_comments(bill_id);
CREATE INDEX idx_bill_comments_user_id ON bill_comments(user_id);
CREATE INDEX idx_bill_splits_bill_id ON bill_splits(bill_id);
CREATE INDEX idx_bill_splits_user_id ON bill_splits(user_id);
CREATE INDEX idx_bill_settlement_status_bill_id ON bill_settlement_status(bill_id);
CREATE INDEX idx_bill_statistics_room_id ON bill_statistics(room_id);
CREATE INDEX idx_bill_statistics_user_id ON bill_statistics(user_id);
CREATE INDEX idx_bill_statistics_month ON bill_statistics(month);

-- 费用相关索引
CREATE INDEX idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX idx_expenses_room_id ON expenses(room_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_expense_receipts_expense_id ON expense_receipts(expense_id);
CREATE INDEX idx_expense_approval_status_expense_id ON expense_approval_status(expense_id);
CREATE INDEX idx_expense_limits_room_id ON expense_limits(room_id);
CREATE INDEX idx_expense_limits_category_id ON expense_limits(category_id);
CREATE INDEX idx_historical_expense_stats_room_id ON historical_expense_stats(room_id);
CREATE INDEX idx_historical_expense_stats_category_id ON historical_expense_stats(category_id);
CREATE INDEX idx_historical_expense_stats_month ON historical_expense_stats(month);
CREATE INDEX idx_historical_reading_stats_room_id ON historical_reading_stats(room_id);
CREATE INDEX idx_historical_reading_stats_meter_type ON historical_reading_stats(meter_type);
CREATE INDEX idx_historical_reading_stats_month ON historical_reading_stats(month);
CREATE INDEX idx_expense_dispute_status_expense_id ON expense_dispute_status(expense_id);
CREATE INDEX idx_expense_statistics_room_id ON expense_statistics(room_id);
CREATE INDEX idx_expense_statistics_user_id ON expense_statistics(user_id);
CREATE INDEX idx_expense_statistics_category_id ON expense_statistics(category_id);
CREATE INDEX idx_expense_statistics_month ON expense_statistics(month);
CREATE INDEX idx_expense_tags_room_id ON expense_tags(room_id);
CREATE INDEX idx_expense_tag_relations_expense_id ON expense_tag_relations(expense_id);
CREATE INDEX idx_expense_tag_relations_tag_id ON expense_tag_relations(tag_id);

-- 支付相关索引
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_expense_id ON payments(expense_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payment_transfers_from_user_id ON payment_transfers(from_user_id);
CREATE INDEX idx_payment_transfers_to_user_id ON payment_transfers(to_user_id);
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_payment_records_qr_code_id ON qr_payment_records(qr_code_id);
CREATE INDEX idx_qr_payment_records_payer_id ON qr_payment_records(payer_id);
CREATE INDEX idx_user_payment_preferences_user_id ON user_payment_preferences(user_id);

-- 争议相关索引
CREATE INDEX idx_disputes_creator_id ON disputes(creator_id);
CREATE INDEX idx_disputes_bill_id ON disputes(bill_id);
CREATE INDEX idx_disputes_expense_id ON disputes(expense_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_participants_dispute_id ON dispute_participants(dispute_id);
CREATE INDEX idx_dispute_participants_user_id ON dispute_participants(user_id);
CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX idx_dispute_assignments_dispute_id ON dispute_assignments(dispute_id);
CREATE INDEX idx_dispute_assignments_assigned_to ON dispute_assignments(assigned_to);
CREATE INDEX idx_dispute_handling_logs_dispute_id ON dispute_handling_logs(dispute_id);

-- 评论相关索引
CREATE INDEX idx_reviews_bill_id ON reviews(bill_id);
CREATE INDEX idx_reviews_room_id ON reviews(room_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_review_images_review_id ON review_images(review_id);

-- 邀请码相关索引
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_room_id ON invite_codes(room_id);
CREATE INDEX idx_invite_code_usage_invite_code_id ON invite_code_usage(invite_code_id);
CREATE INDEX idx_invite_code_usage_user_id ON invite_code_usage(user_id);

-- 活动相关索引
CREATE INDEX idx_activities_creator_id ON activities(creator_id);
CREATE INDEX idx_activities_room_id ON activities(room_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_start_time ON activities(start_time);
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);

-- 特殊支付规则相关索引
CREATE INDEX idx_special_payment_rules_room_id ON special_payment_rules(room_id);
CREATE INDEX idx_room_payment_rules_room_id ON room_payment_rules(room_id);

-- 系统管理相关索引
CREATE INDEX idx_system_configs_config_key ON system_configs(config_key);
CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_maintenance_windows_status ON maintenance_windows(status);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_start_at ON announcements(start_at);
CREATE INDEX idx_announcements_end_at ON announcements(end_at);

-- 日志和审计相关索引
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX idx_user_status_logs_user_id ON user_status_logs(user_id);
CREATE INDEX idx_user_status_logs_changed_at ON user_status_logs(changed_at);
CREATE INDEX idx_admin_operation_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX idx_admin_operation_logs_operation_type ON admin_operation_logs(operation_type);
CREATE INDEX idx_admin_operation_logs_created_at ON admin_operation_logs(created_at);
CREATE INDEX idx_data_change_audits_table_name ON data_change_audits(table_name);
CREATE INDEX idx_data_change_audits_record_id ON data_change_audits(record_id);
CREATE INDEX idx_data_change_audits_changed_at ON data_change_audits(changed_at);
CREATE INDEX idx_system_error_logs_error_level ON system_error_logs(error_level);
CREATE INDEX idx_system_error_logs_occurred_at ON system_error_logs(occurred_at);
CREATE INDEX idx_system_audit_logs_event_type ON system_audit_logs(event_type);
CREATE INDEX idx_system_audit_logs_occurred_at ON system_audit_logs(occurred_at);

-- 通知相关索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_bill_payment_reminders_bill_id ON bill_payment_reminders(bill_id);
CREATE INDEX idx_bill_payment_reminders_user_id ON bill_payment_reminders(user_id);
CREATE INDEX idx_bill_payment_reminders_scheduled_at ON bill_payment_reminders(scheduled_at);

-- 批量任务与报表相关索引
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at);
CREATE INDEX idx_report_definitions_is_active ON report_definitions(is_active);
CREATE INDEX idx_report_snapshots_report_definition_id ON report_snapshots(report_definition_id);
CREATE INDEX idx_export_tasks_status ON export_tasks(status);
CREATE INDEX idx_export_tasks_created_at ON export_tasks(created_at);

-- 内容审核与工单相关索引
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_content_type ON moderation_queue(content_type);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_ticket_type ON support_tickets(ticket_type);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- 集成与回调相关索引
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);

-- 文档管理相关索引
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_document_histories_document_id ON document_histories(document_id);
CREATE INDEX idx_document_statistics_document_id ON document_statistics(document_id);
CREATE INDEX idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user_id ON document_access_logs(user_id);

-- 系统维护相关索引
CREATE INDEX idx_data_backup_records_backup_status ON data_backup_records(backup_status);
CREATE INDEX idx_data_backup_records_created_at ON data_backup_records(created_at);
CREATE INDEX idx_data_restore_records_restore_status ON data_restore_records(restore_status);
CREATE INDEX idx_data_restore_records_created_at ON data_restore_records(created_at);
CREATE INDEX idx_system_maintenance_plans_status ON system_maintenance_plans(status);
CREATE INDEX idx_system_maintenance_executions_plan_id ON system_maintenance_executions(plan_id);

-- 其他辅助表索引
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_user_activity_statistics_user_id ON user_activity_statistics(user_id);
CREATE INDEX idx_user_activity_statistics_activity_date ON user_activity_statistics(activity_date);
CREATE INDEX idx_expense_split_history_expense_split_id ON expense_split_history(expense_split_id);
CREATE INDEX idx_expense_lines_expense_id ON expense_lines(expense_id);
CREATE INDEX idx_expense_reviews_expense_id ON expense_reviews(expense_id);
CREATE INDEX idx_abnormal_expenses_expense_id ON abnormal_expenses(expense_id);
CREATE INDEX idx_abnormal_expenses_status ON abnormal_expenses(status);
CREATE INDEX idx_abnormal_expense_stats_stat_date ON abnormal_expense_stats(stat_date);
CREATE INDEX idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_permission_history_admin_id ON admin_permission_history(admin_id);
CREATE INDEX idx_admin_operation_restrictions_admin_id ON admin_operation_restrictions(admin_id);
CREATE INDEX idx_admin_operation_statistics_admin_id ON admin_operation_statistics(admin_id);
CREATE INDEX idx_system_performance_metrics_metric_name ON system_performance_metrics(metric_name);
CREATE INDEX idx_system_performance_metrics_recorded_at ON system_performance_metrics(recorded_at);
CREATE INDEX idx_system_resource_usage_recorded_at ON system_resource_usage(recorded_at);

-- 请假记录相关索引
CREATE INDEX idx_leave_records_user_id ON leave_records(user_id);
CREATE INDEX idx_leave_records_room_id ON leave_records(room_id);
CREATE INDEX idx_leave_records_dates ON leave_records(start_date, end_date);
CREATE INDEX idx_leave_records_status ON leave_records(status);
CREATE INDEX idx_leave_records_type ON leave_records(leave_type);

-- ========================================
-- 创建触发器和函数
-- ========================================

-- 更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加updated_at字段的触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_expense_settings_updated_at BEFORE UPDATE ON room_expense_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_comments_updated_at BEFORE UPDATE ON bill_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_settlement_status_updated_at BEFORE UPDATE ON bill_settlement_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_statistics_updated_at BEFORE UPDATE ON bill_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_limits_updated_at BEFORE UPDATE ON expense_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_statistics_updated_at BEFORE UPDATE ON expense_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_payment_preferences_updated_at BEFORE UPDATE ON user_payment_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_windows_updated_at BEFORE UPDATE ON maintenance_windows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_statistics_updated_at BEFORE UPDATE ON document_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_maintenance_plans_updated_at BEFORE UPDATE ON system_maintenance_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_operation_restrictions_updated_at BEFORE UPDATE ON admin_operation_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_records_updated_at BEFORE UPDATE ON leave_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 创建视图
-- ========================================

-- 用户详细信息视图
CREATE VIEW user_details AS
SELECT 
    u.id,
    u.uuid,
    u.username,
    u.email,
    u.avatar_url,
    u.phone,
    u.status,
    u.email_verified,
    u.last_login_at,
    u.login_count,
    u.created_at,
    u.updated_at,
    up.full_name,
    up.nickname,
    up.gender,
    up.birth_date,
    up.location,
    up.bio,
    us.language,
    us.timezone,
    us.currency,
    us.notification_email,
    us.notification_push,
    us.privacy_level
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_settings us ON u.id = us.user_id;

-- 管理员详细信息视图
CREATE VIEW admin_details AS
SELECT 
    a.id,
    a.uuid,
    a.user_id,
    a.username,
    a.email,
    a.full_name,
    a.phone,
    a.status,
    a.last_login_at,
    a.login_count,
    a.created_at,
    a.updated_at,
    u.username as user_username,
    u.email as user_email
FROM admins a
LEFT JOIN users u ON a.user_id = u.id;

-- 房间详细信息视图
CREATE VIEW room_details AS
SELECT 
    r.id,
    r.uuid,
    r.name,
    r.description,
    r.cover_image,
    r.creator_id,
    r.invite_code,
    r.status,
    r.created_at,
    r.updated_at,
    u.username as creator_username,
    u.full_name as creator_full_name,
    COUNT(rm.user_id) as member_count
FROM rooms r
LEFT JOIN users u ON r.creator_id = u.id
LEFT JOIN room_members rm ON r.id = rm.room_id
GROUP BY r.id, r.uuid, r.name, r.description, r.cover_image, r.creator_id, r.invite_code, r.status, r.created_at, r.updated_at, u.username, u.full_name;

-- 账单详细信息视图
CREATE VIEW bill_details AS
SELECT 
    b.id,
    b.uuid,
    b.title,
    b.description,
    b.amount,
    b.currency,
    b.category_id,
    bc.name as category_name,
    b.creator_id,
    u.username as creator_username,
    u.full_name as creator_full_name,
    b.room_id,
    r.name as room_name,
    b.status,
    b.due_date,
    b.settled_at,
    b.version,
    b.created_at,
    b.updated_at,
    COUNT(bs.user_id) as split_count,
    COALESCE(SUM(bs.amount), 0) as total_split_amount
FROM bills b
LEFT JOIN bill_categories bc ON b.category_id = bc.id
LEFT JOIN users u ON b.creator_id = u.id
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN bill_splits bs ON b.id = bs.bill_id
GROUP BY b.id, b.uuid, b.title, b.description, b.amount, b.currency, b.category_id, bc.name, b.creator_id, u.username, u.full_name, b.room_id, r.name, b.status, b.due_date, b.settled_at, b.version, b.created_at, b.updated_at;

-- 费用详细信息视图
CREATE VIEW expense_details AS
SELECT 
    e.id,
    e.uuid,
    e.title,
    e.description,
    e.amount,
    e.currency,
    e.category_id,
    ec.name as category_name,
    e.payer_id,
    u.username as payer_username,
    u.full_name as payer_full_name,
    e.room_id,
    r.name as room_name,
    e.expense_date,
    e.calculation_method,
    e.meter_type,
    e.current_reading,
    e.previous_reading,
    e.unit_price,
    e.split_method,
    e.split_members,
    e.split_ratios,
    e.receipt_url,
    e.version,
    e.created_at,
    e.updated_at,
    COUNT(es.user_id) as split_count,
    COALESCE(SUM(es.amount), 0) as total_split_amount
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
LEFT JOIN users u ON e.payer_id = u.id
LEFT JOIN rooms r ON e.room_id = r.id
LEFT JOIN expense_splits es ON e.id = es.expense_id
GROUP BY e.id, e.uuid, e.title, e.description, e.amount, e.currency, e.category_id, ec.name, e.payer_id, u.username, u.full_name, e.room_id, r.name, e.expense_date, e.calculation_method, e.meter_type, e.current_reading, e.previous_reading, e.unit_price, e.split_method, e.split_members, e.split_ratios, e.receipt_url, e.version, e.created_at, e.updated_at;

-- ========================================
-- 插入初始数据
-- ========================================

-- 插入账单类别初始数据
INSERT INTO bill_categories (name, description, icon, color) VALUES 
('餐饮', '餐饮相关账单', 'restaurant', '#FF6B6B'),
('购物', '购物相关账单', 'shopping-cart', '#4ECDC4'),
('交通', '交通相关账单', 'car', '#45B7D1'),
('娱乐', '娱乐相关账单', 'gamepad', '#96CEB4'),
('居住', '居住相关账单', 'home', '#FFEAA7'),
('医疗', '医疗相关账单', 'heart', '#DDA0DD'),
('教育', '教育相关账单', 'book', '#98D8C8'),
('其他', '其他账单', 'more-horizontal', '#BDC3C7');

-- 插入费用类别初始数据
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

-- 插入系统角色初始数据
INSERT INTO roles (name, description, role_type, is_system) VALUES 
('系统管理员', '系统内置账号，用于系统维护和全局管理', 'admin', true),
('管理员', '具有角色分配、权限管理和角色申请审批权限', 'admin', true),
('寝室长', '具有本寝室相关功能的完全控制权限', 'user', true),
('缴费人', '具有本寝室费用记录的完全控制权限', 'user', true),
('普通用户', '具有基础查看权限', 'user', true);

-- 插入系统权限初始数据
INSERT INTO permissions (code, name, description, module) VALUES 
-- 用户基础权限
('user.register', '用户注册', '新用户注册', 'user'),
('user.login', '用户登录', '用户登录系统', 'user'),
('user.logout', '用户登出', '用户登出系统', 'user'),
('user.profile.view', '查看个人资料', '查看个人资料信息', 'user'),
('user.profile.edit', '编辑个人资料', '编辑个人资料信息', 'user'),
('user.password.change', '修改密码', '修改登录密码', 'user'),

-- 寝室管理权限
('room.create', '创建寝室', '创建新的寝室', 'room'),
('room.join', '加入寝室', '加入现有寝室', 'room'),
('room.view', '查看寝室', '查看寝室信息', 'room'),
('room.edit', '编辑寝室', '编辑寝室信息', 'room'),
('room.members.manage', '成员管理', '管理寝室成员', 'room'),

-- 费用记录权限
('expense.view', '查看费用', '查看费用信息', 'expense'),
('expense.add', '添加费用', '添加新的费用', 'expense'),
('expense.edit', '编辑费用', '编辑费用信息', 'expense'),
('expense.delete', '删除费用', '删除费用', 'expense'),

-- 费用分类权限
('category.view', '查看费用分类', '查看费用分类信息', 'category'),
('category.manage', '管理费用分类', '管理费用分类', 'category'),

-- 分摊规则权限
('split.view', '查看分摊规则', '查看分摊规则', 'split'),
('split.set', '设置分摊规则', '设置分摊规则', 'split'),

-- 账单管理权限
('bill.view', '查看账单', '查看账单信息', 'bill'),
('bill.settle', '费用结算', '进行费用结算操作', 'bill'),

-- 数据导出权限
('data.export', '数据导出', '导出数据', 'data'),

-- 通知管理权限
('notification.view', '查看通知', '查看通知信息', 'notification'),
('notification.manage', '通知管理', '管理通知', 'notification'),

-- 费用图片权限
('expense.image.upload', '上传费用图片', '上传费用相关图片', 'expense'),

-- 费用评论权限
('expense.comment', '费用评论', '对费用进行评论', 'expense'),

-- 角色分配权限
('role.assign', '角色分配', '分配用户角色', 'role'),

-- 权限管理权限
('permission.manage', '权限管理', '管理用户权限', 'permission'),

-- 角色申请审批权限
('role.approve', '角色申请审批', '审批用户角色申请', 'role'),

-- 支付管理权限
('payment.view', '查看支付', '查看支付信息', 'payment'),
('payment.confirm', '确认支付', '确认支付操作', 'payment'),

-- 统计分析权限
('statistics.view', '查看统计', '查看统计分析', 'statistics'),

-- 系统设置权限
('system.config', '系统设置', '配置系统参数', 'system'),

-- 日志查看权限
('system.logs', '查看日志', '查看系统日志', 'system'),

-- 个人信息权限
('personal.info.view', '查看个人信息', '查看个人信息', 'personal'),
('personal.info.edit', '编辑个人信息', '编辑个人信息', 'personal'),

-- 缴费人角色管理权限
('payer.role.manage', '缴费人角色管理', '管理缴费人角色', 'role');

-- 为系统管理员分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '系统管理员';

-- 为管理员分配除系统设置外的所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = '管理员'
AND p.code NOT IN ('system.config', 'system.logs');

-- 为寝室长分配寝室管理相关权限
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

-- 为缴费人分配支付相关权限
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

-- 为普通用户分配基础权限
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

-- 插入系统配置初始数据
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

-- 插入功能开关初始数据
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

-- 插入默认公告数据
INSERT INTO announcements (title, content, announcement_type, priority, is_active, created_by) VALUES 
('欢迎使用记账系统', '欢迎使用多人记账系统！本系统可以帮助您和室友、朋友一起管理账单和费用，让记账变得更加简单和透明。', 'info', 'normal', true, 1),
('系统更新通知', '系统已完成更新，新增了费用管理和支付功能，欢迎大家体验并提供反馈意见。', 'info', 'normal', true, 1);

-- 插入默认文档类型数据
INSERT INTO document_types (name, description, icon) VALUES 
('用户指南', '用户使用指南', 'book-open'),
('管理员指南', '管理员使用指南', 'shield'),
('API文档', 'API接口文档', 'code'),
('常见问题', '常见问题解答', 'help-circle'),
('更新日志', '系统更新日志', 'git-branch');

-- ========================================
-- 数据库初始化脚本完成
-- ========================================