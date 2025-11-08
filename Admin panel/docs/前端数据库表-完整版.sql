-- 前端数据库表 - 完整版本（包含原始表结构和补充内容）

-- 用户认证与账户管理相关表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 账单管理相关表
CREATE TABLE bill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    category_id INTEGER REFERENCES bill_categories(id),
    creator_id INTEGER REFERENCES users(id),
    room_id INTEGER, -- 将在后面创建rooms表后添加外键
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    settled_at TIMESTAMP,
    version INTEGER DEFAULT 1, -- 版本号，用于乐观锁
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_comments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 费用管理相关表
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES expense_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    category_id INTEGER REFERENCES expense_categories(id),
    payer_id INTEGER REFERENCES users(id),
    room_id INTEGER, -- 将在后面创建rooms表后添加外键
    expense_date DATE NOT NULL,
    -- 补充字段
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

CREATE TABLE expense_receipts (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 房间管理相关表
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE room_members (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin', 'leader'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

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

-- 支付管理相关表
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
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

-- 邀请码管理相关表
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

CREATE TABLE invite_code_usage (
    id SERIAL PRIMARY KEY,
    invite_code_id INTEGER REFERENCES invite_codes(id),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 二维码管理相关表
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

-- 争议管理相关表
CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE dispute_participants (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'participant',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dispute_id, user_id)
);

CREATE TABLE dispute_evidence (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评论管理相关表
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

CREATE TABLE review_images (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES reviews(id),
    image_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 特殊支付规则相关表
CREATE TABLE expense_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE room_payment_rules (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 活动管理相关表
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE activity_participants (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'invited',
    responded_at TIMESTAMP,
    UNIQUE(activity_id, user_id)
);

-- 权限管理相关表
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    permission_id INTEGER REFERENCES permissions(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, permission_id)
);

-- 密码重置相关表
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 补充表结构

-- 1. 多线路费用计算相关表
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

-- 2. 费用审核状态表
CREATE TABLE expense_approval_status (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 费用限制表
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

-- 4. 历史费用数据表，用于对比验证
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

-- 5. 历史读数数据表，用于对比验证
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

-- 6. 费用争议状态表
CREATE TABLE expense_dispute_status (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    status VARCHAR(20) NOT NULL, -- 'open', 'investigating', 'resolved'
    assigned_to INTEGER REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 账单结算状态表
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

-- 8. 支付码扫描记录表
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

-- 9. 房间费用设置表
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

-- 10. 用户支付偏好表
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

-- 11. 费用分摊历史表
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

-- 12. 账单支付提醒表
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

-- 13. 费用标签表
CREATE TABLE expense_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    room_id INTEGER REFERENCES rooms(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, room_id)
);

-- 14. 费用标签关联表
CREATE TABLE expense_tag_relations (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    tag_id INTEGER REFERENCES expense_tags(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_id, tag_id)
);

-- 15. 费用统计表
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

-- 16. 账单统计表
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

-- 17. 用户活动统计表
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

-- 18. 房间活动统计表
CREATE TABLE room_activity_statistics (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    activity_date DATE NOT NULL,
    expense_count INTEGER DEFAULT 0,
    bill_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    new_user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, activity_date)
);

-- 19. 系统通知模板表
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. 用户通知偏好表
CREATE TABLE user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type)
);

-- 21. 费用验证规则表
CREATE TABLE expense_validation_rules (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'amount_range', 'required_fields', 'custom'
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. 费用验证结果表
CREATE TABLE expense_validation_results (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    rule_id INTEGER REFERENCES expense_validation_rules(id),
    validation_status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'warning'
    validation_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. 费用导入记录表
CREATE TABLE expense_import_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    room_id INTEGER REFERENCES rooms(id),
    file_name VARCHAR(255),
    file_size INTEGER,
    total_records INTEGER,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 24. 费用导入错误表
CREATE TABLE expense_import_errors (
    id SERIAL PRIMARY KEY,
    import_record_id INTEGER REFERENCES expense_import_records(id),
    row_number INTEGER,
    error_message TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. 费用导出记录表
CREATE TABLE expense_export_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    room_id INTEGER REFERENCES rooms(id),
    export_type VARCHAR(50) NOT NULL, -- 'csv', 'excel', 'pdf'
    filters JSONB,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 26. 费用分享记录表
CREATE TABLE expense_shares (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    shared_by INTEGER REFERENCES users(id),
    share_token VARCHAR(100) UNIQUE NOT NULL,
    share_type VARCHAR(20) DEFAULT 'public', -- 'public', 'password', 'limited'
    share_password VARCHAR(100),
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. 费用分享访问记录表
CREATE TABLE expense_share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id INTEGER REFERENCES expense_shares(id),
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. 费用评论表
CREATE TABLE expense_comments (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES expense_comments(id), -- 支持回复
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. 费用评论点赞表
CREATE TABLE expense_comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES expense_comments(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);

-- 30. 费用附件表
CREATE TABLE expense_attachments (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. 费用版本历史表
CREATE TABLE expense_version_history (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    version INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,
    amount DECIMAL(15,2),
    category_id INTEGER REFERENCES expense_categories(id),
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_id, version)
);

-- 32. 账单版本历史表
CREATE TABLE bill_version_history (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    version INTEGER NOT NULL,
    title VARCHAR(255),
    description TEXT,
    amount DECIMAL(15,2),
    status VARCHAR(20),
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bill_id, version)
);

-- 33. 费用分摊版本历史表
CREATE TABLE expense_split_version_history (
    id SERIAL PRIMARY KEY,
    expense_split_id INTEGER REFERENCES expense_splits(id),
    version INTEGER NOT NULL,
    amount DECIMAL(15,2),
    percentage DECIMAL(5,2),
    status VARCHAR(20),
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(expense_split_id, version)
);

-- 34. 支付版本历史表
CREATE TABLE payment_version_history (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    version INTEGER NOT NULL,
    amount DECIMAL(15,2),
    status VARCHAR(20),
    payment_method VARCHAR(50),
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_id, version)
);

-- 35. 房间成员变更历史表
CREATE TABLE room_member_history (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(20) NOT NULL, -- 'joined', 'left', 'role_changed'
    old_role VARCHAR(20),
    new_role VARCHAR(20),
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 36. 用户登录历史表
CREATE TABLE user_login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    login_type VARCHAR(20) DEFAULT 'password', -- 'password', 'oauth', 'qr'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 37. 用户设备表
CREATE TABLE user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    platform VARCHAR(20), -- 'ios', 'android', 'windows', 'macos'
    push_token VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- 38. 费用提醒表
CREATE TABLE expense_reminders (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    user_id INTEGER REFERENCES users(id),
    reminder_type VARCHAR(20) NOT NULL, -- 'payment', 'review', 'custom'
    reminder_time TIMESTAMP NOT NULL,
    message TEXT,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 39. 账单提醒表
CREATE TABLE bill_reminders (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    user_id INTEGER REFERENCES users(id),
    reminder_type VARCHAR(20) NOT NULL, -- 'payment', 'review', 'custom'
    reminder_time TIMESTAMP NOT NULL,
    message TEXT,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 40. 费用预算表
CREATE TABLE expense_budgets (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES expense_categories(id),
    budget_type VARCHAR(20) NOT NULL, -- 'monthly', 'yearly', 'custom'
    budget_amount DECIMAL(15,2) NOT NULL,
    budget_period_start DATE NOT NULL,
    budget_period_end DATE NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 41. 费用预算警告表
CREATE TABLE expense_budget_warnings (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES expense_budgets(id),
    warning_type VARCHAR(20) NOT NULL, -- 'threshold', 'exceeded'
    warning_percentage DECIMAL(5,2),
    current_spent DECIMAL(15,2),
    budget_amount DECIMAL(15,2),
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 42. 费用定期支付表
CREATE TABLE recurring_expenses (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    category_id INTEGER REFERENCES expense_categories(id),
    payer_id INTEGER REFERENCES users(id),
    split_method VARCHAR(20) DEFAULT 'equal',
    split_members JSONB,
    split_ratios JSONB,
    recurrence_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,
    next_due_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 43. 费用定期支付实例表
CREATE TABLE recurring_expense_instances (
    id SERIAL PRIMARY KEY,
    recurring_expense_id INTEGER REFERENCES recurring_expenses(id),
    expense_id INTEGER REFERENCES expenses(id),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generated', 'skipped', 'cancelled'
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 现在添加之前未完成的外键约束
ALTER TABLE bills ADD CONSTRAINT fk_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id);
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_room FOREIGN KEY (room_id) REFERENCES rooms(id);

-- 创建索引以提高查询性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_refresh_token ON user_tokens(refresh_token);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_bills_room_id ON bills(room_id);
CREATE INDEX idx_bills_creator_id ON bills(creator_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_expenses_room_id ON expenses(room_id);
CREATE INDEX idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_room_id ON invite_codes(room_id);
CREATE INDEX idx_disputes_bill_id ON disputes(bill_id);
CREATE INDEX idx_disputes_creator_id ON disputes(creator_id);
CREATE INDEX idx_reviews_room_id ON reviews(room_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);

-- 新增索引
CREATE INDEX idx_expenses_calculation_method ON expenses(calculation_method);
CREATE INDEX idx_expenses_meter_type ON expenses(meter_type);
CREATE INDEX idx_expenses_split_method ON expenses(split_method);
CREATE INDEX idx_expenses_version ON expenses(version);
CREATE INDEX idx_bills_version ON bills(version);
CREATE INDEX idx_expense_splits_version ON expense_splits(version);
CREATE INDEX idx_payments_version ON payments(version);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_room_members_role ON room_members(role);
CREATE INDEX idx_expense_lines_expense_id ON expense_lines(expense_id);
CREATE INDEX idx_expense_approval_status_expense_id ON expense_approval_status(expense_id);
CREATE INDEX idx_expense_limits_room_category ON expense_limits(room_id, category_id);
CREATE INDEX idx_historical_expense_stats_room_category_month ON historical_expense_stats(room_id, category_id, month);
CREATE INDEX idx_historical_reading_stats_room_meter_month ON historical_reading_stats(room_id, meter_type, month);
CREATE INDEX idx_expense_dispute_status_expense_id ON expense_dispute_status(expense_id);
CREATE INDEX idx_bill_settlement_status_bill_id ON bill_settlement_status(bill_id);
CREATE INDEX idx_qr_payment_records_qr_code_id ON qr_payment_records(qr_code_id);
CREATE INDEX idx_invite_code_usage_ip_address ON invite_code_usage(ip_address);
CREATE INDEX idx_room_expense_settings_room_id ON room_expense_settings(room_id);
CREATE INDEX idx_user_payment_preferences_user_id ON user_payment_preferences(user_id);
CREATE INDEX idx_expense_split_history_expense_split_id ON expense_split_history(expense_split_id);
CREATE INDEX idx_bill_payment_reminders_bill_id ON bill_payment_reminders(bill_id);
CREATE INDEX idx_expense_tags_room_id ON expense_tags(room_id);
CREATE INDEX idx_expense_tag_relations_expense_id ON expense_tag_relations(expense_id);
CREATE INDEX idx_expense_tag_relations_tag_id ON expense_tag_relations(tag_id);
CREATE INDEX idx_expense_statistics_room_user_category_month ON expense_statistics(room_id, user_id, category_id, month);
CREATE INDEX idx_bill_statistics_room_user_month ON bill_statistics(room_id, user_id, month);
CREATE INDEX idx_user_activity_statistics_user_date ON user_activity_statistics(user_id, activity_date);
CREATE INDEX idx_room_activity_statistics_room_date ON room_activity_statistics(room_id, activity_date);
CREATE INDEX idx_user_notification_preferences_user_type ON user_notification_preferences(user_id, notification_type);
CREATE INDEX idx_expense_validation_rules_room_id ON expense_validation_rules(room_id);
CREATE INDEX idx_expense_validation_results_expense_id ON expense_validation_results(expense_id);
CREATE INDEX idx_expense_import_records_user_id ON expense_import_records(user_id);
CREATE INDEX idx_expense_import_errors_import_record_id ON expense_import_errors(import_record_id);
CREATE INDEX idx_expense_export_records_user_id ON expense_export_records(user_id);
CREATE INDEX idx_expense_shares_expense_id ON expense_shares(expense_id);
CREATE INDEX idx_expense_shares_share_token ON expense_shares(share_token);
CREATE INDEX idx_expense_share_access_logs_share_id ON expense_share_access_logs(share_id);
CREATE INDEX idx_expense_comments_expense_id ON expense_comments(expense_id);
CREATE INDEX idx_expense_comments_parent_id ON expense_comments(parent_id);
CREATE INDEX idx_expense_comment_likes_comment_id ON expense_comment_likes(comment_id);
CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id);
CREATE INDEX idx_expense_version_history_expense_id ON expense_version_history(expense_id);
CREATE INDEX idx_bill_version_history_bill_id ON bill_version_history(bill_id);
CREATE INDEX idx_expense_split_version_history_expense_split_id ON expense_split_version_history(expense_split_id);
CREATE INDEX idx_payment_version_history_payment_id ON payment_version_history(payment_id);
CREATE INDEX idx_room_member_history_room_user ON room_member_history(room_id, user_id);
CREATE INDEX idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX idx_expense_reminders_expense_id ON expense_reminders(expense_id);
CREATE INDEX idx_bill_reminders_bill_id ON bill_reminders(bill_id);
CREATE INDEX idx_expense_budgets_room_user_category ON expense_budgets(room_id, user_id, category_id);
CREATE INDEX idx_expense_budget_warnings_budget_id ON expense_budget_warnings(budget_id);
CREATE INDEX idx_recurring_expenses_room_id ON recurring_expenses(room_id);
CREATE INDEX idx_recurring_expense_instances_recurring_expense_id ON recurring_expense_instances(recurring_expense_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要updated_at字段的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_comments_updated_at BEFORE UPDATE ON bill_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为新增的包含updated_at字段的表创建触发器
CREATE TRIGGER update_expense_limits_updated_at BEFORE UPDATE ON expense_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_settlement_status_updated_at BEFORE UPDATE ON bill_settlement_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_expense_settings_updated_at BEFORE UPDATE ON room_expense_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_payment_preferences_updated_at BEFORE UPDATE ON user_payment_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_statistics_updated_at BEFORE UPDATE ON expense_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bill_statistics_updated_at BEFORE UPDATE ON bill_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_validation_rules_updated_at BEFORE UPDATE ON expense_validation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_comments_updated_at BEFORE UPDATE ON expense_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_budgets_updated_at BEFORE UPDATE ON expense_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始数据
INSERT INTO bill_categories (name, description, icon, color) VALUES
('餐饮', '食品、饮料等相关消费', 'restaurant', '#FF6B6B'),
('购物', '商品购买消费', 'shopping_cart', '#4ECDC4'),
('交通', '出行交通费用', 'directions_car', '#45B7D1'),
('娱乐', '休闲娱乐消费', 'entertainment', '#96CEB4'),
('医疗', '医疗健康相关', 'local_hospital', '#FECA57'),
('教育', '学习培训费用', 'school', '#FF9FF3'),
('住房', '房租、房贷等', 'home', '#54A0FF'),
('水电', '水电燃气费用', 'flash_on', '#5F27CD'),
('通讯', '电话、网络费用', 'phone', '#00D2D3'),
('其他', '其他未分类消费', 'more', '#C8D6E5');

INSERT INTO expense_categories (name, description) VALUES
('日常开销', '日常生活必需的开销'),
('娱乐活动', '娱乐休闲相关开销'),
('学习发展', '个人学习成长开销'),
('医疗健康', '医疗保健相关开销'),
('交通出行', '交通相关费用'),
('住房相关', '房租、物业等费用'),
('通讯网络', '通讯和网络费用'),
('其他', '其他未分类开销');

-- 插入通知模板初始数据
INSERT INTO notification_templates (name, title_template, content_template, notification_type) VALUES
('expense_created', '新费用创建', '{user} 创建了一笔新费用：{title}，金额 {amount}', 'expense'),
('bill_created', '新账单创建', '{user} 创建了一笔新账单：{title}，金额 {amount}', 'bill'),
('payment_reminder', '付款提醒', '您的账单 {title} 将于 {due_date} 到期，请及时付款', 'payment'),
('expense_approved', '费用已批准', '您提交的费用 {title} 已被批准', 'expense_approval'),
('expense_rejected', '费用已拒绝', '您提交的费用 {title} 已被拒绝，原因：{reason}', 'expense_approval'),
('budget_warning', '预算警告', '您的 {category} 类别支出已达到预算的 {percentage}%', 'budget'),
('room_invitation', '房间邀请', '{user} 邀请您加入房间：{room_name}', 'room');