-- Production Database Initialization Script - PostgreSQL Version
-- Create production database (In PostgreSQL, you need to create the database first, then connect)
-- Note: In PostgreSQL, you need to manually create the database first, then execute this script
-- Database creation command: CREATE DATABASE prod_expense_system;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('system_admin', 'admin', 'room_owner', 'payer', 'user')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rooms table
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

-- User-room relations table
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

-- Expense types table
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    calculation_method VARCHAR(20) NOT NULL CHECK (calculation_method IN ('amount', 'reading', 'custom')),
    unit VARCHAR(20),
    is_system_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses table
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

-- Expense splits table
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

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    period_start DATE,
    period_end DATE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bill-expenses relation table
CREATE TABLE IF NOT EXISTS bill_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(expense_id)
);

-- User QR codes table
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

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) DEFAULT 'qr_code' CHECK (payment_method IN ('qr_code')),
    qr_code_type VARCHAR(20) CHECK (qr_code_type IN ('wechat', 'alipay')),
    payment_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_payer_not_payee CHECK (user_id != payer_id)
);

-- Invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(4) UNIQUE NOT NULL,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invitation usage records table
CREATE TABLE IF NOT EXISTS invitation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
    used_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMP DEFAULT NOW()
);

-- Split rules table
CREATE TABLE IF NOT EXISTS split_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    expense_type_id UUID REFERENCES expense_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    algorithm VARCHAR(20) NOT NULL CHECK (algorithm IN ('equal', 'by_days', 'custom', 'by_area')),
    parameters JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Recommendation configs table
CREATE TABLE IF NOT EXISTS recommendation_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('expense_type', 'split_algorithm', 'amount_range')),
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(room_id, config_type, config_key)
);

-- Expense reviews table
CREATE TABLE IF NOT EXISTS expense_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    current_level VARCHAR(20) NOT NULL CHECK (current_level IN ('room_owner', 'payer', 'system_auto_review')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Review chain records table
CREATE TABLE IF NOT EXISTS review_chain_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES expense_reviews(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL CHECK (level IN ('room_owner', 'payer', 'system_auto_review')),
    reviewer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    reviewer_name VARCHAR(100) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'escalated')),
    comments TEXT,
    reviewed_at TIMESTAMP DEFAULT NOW()
);

-- Expense disputes table
CREATE TABLE IF NOT EXISTS expense_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    submitter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dispute_type VARCHAR(20) NOT NULL CHECK (dispute_type IN ('amount', 'split', 'attribution', 'period')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved', 'escalated')),
    level VARCHAR(20) DEFAULT 'room' CHECK (level IN ('room', 'system')),
    escalation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'login', 'logout', 'payment')),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('user', 'room', 'expense', 'bill', 'payment', 'system_config')),
    resource_id UUID,
    operation_details JSONB,
    ip_address INET,
    user_agent TEXT,
    operation_time TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- System operation logs table
CREATE TABLE IF NOT EXISTS system_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('config_update', 'user_management', 'system_maintenance', 'data_export')),
    target_resource VARCHAR(100),
    operation_details JSONB,
    result VARCHAR(20) CHECK (result IN ('success', 'failure')),
    error_message TEXT,
    ip_address INET,
    operation_time TIMESTAMP DEFAULT NOW()
);

-- System configs table
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('string', 'number', 'boolean', 'array', 'object')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification configs table
CREATE TABLE IF NOT EXISTS notification_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'in_app')),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('expense_created', 'bill_due', 'payment_received', 'dispute_submitted')),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_type, event_type)
);

-- Insert system default expense types
INSERT INTO expense_types (id, name, description, calculation_method, unit, is_system_default, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Water Fee', 'Living water expenses', 'reading', 'ton', TRUE, 1),
('22222222-2222-2222-2222-222222222222', 'Electricity Fee', 'Living electricity expenses', 'reading', 'kwh', TRUE, 2),
('33333333-3333-3333-3333-333333333333', 'Rent', 'Housing rent', 'amount', 'yuan', TRUE, 3),
('44444444-4444-4444-4444-444444444444', 'Internet Fee', 'Broadband internet expenses', 'amount', 'yuan', TRUE, 4),
('55555555-5555-5555-5555-555555555555', 'Gas Fee', 'Kitchen gas expenses', 'reading', 'cubic meter', TRUE, 5);

-- Insert system default configurations
INSERT INTO system_configs (id, config_key, config_value, config_type, description, is_public, created_by) VALUES
('11111111-1111-1111-1111-111111111111', 'system.name', '"Expense Sharing System"', 'string', 'System name', TRUE, '11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222', 'system.version', '"1.0.0"', 'string', 'System version', TRUE, '11111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333333', 'payment.timeout', '1800', 'number', 'Payment timeout (seconds)', FALSE, '11111111-1111-1111-1111-111111111111');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

CREATE INDEX IF NOT EXISTS idx_user_room_relations_user_id ON user_room_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_relations_room_id ON user_room_relations(room_id);
CREATE INDEX IF NOT EXISTS idx_user_room_relations_is_active ON user_room_relations(is_active);
CREATE INDEX IF NOT EXISTS idx_user_room_relations_relation_type ON user_room_relations(relation_type);

CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type_id ON expenses(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_split_type ON expense_splits(split_type);

CREATE INDEX IF NOT EXISTS idx_bills_room_id ON bills(room_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);

CREATE INDEX IF NOT EXISTS idx_bill_expenses_bill_id ON bill_expenses(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_expenses_expense_id ON bill_expenses(expense_id);

CREATE INDEX IF NOT EXISTS idx_user_qr_codes_user_id ON user_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qr_codes_qr_type ON user_qr_codes(qr_type);
CREATE INDEX IF NOT EXISTS idx_user_qr_codes_is_active ON user_qr_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_time ON payments(payment_time);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_room_id ON invitation_codes(room_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_active ON invitation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires_at ON invitation_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_invitation_usage_invitation_code_id ON invitation_usage(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_usage_used_by ON invitation_usage(used_by);

CREATE INDEX IF NOT EXISTS idx_split_rules_room_id ON split_rules(room_id);
CREATE INDEX IF NOT EXISTS idx_split_rules_expense_type_id ON split_rules(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_split_rules_is_active ON split_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_split_rules_algorithm ON split_rules(algorithm);

CREATE INDEX IF NOT EXISTS idx_recommendation_configs_room_id ON recommendation_configs(room_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_configs_config_type ON recommendation_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_configs_is_active ON recommendation_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_expense_reviews_expense_id ON expense_reviews(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_reviews_submitted_by ON expense_reviews(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expense_reviews_status ON expense_reviews(status);

CREATE INDEX IF NOT EXISTS idx_review_chain_records_review_id ON review_chain_records(review_id);
CREATE INDEX IF NOT EXISTS idx_review_chain_records_reviewer_id ON review_chain_records(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_chain_records_level ON review_chain_records(level);

CREATE INDEX IF NOT EXISTS idx_expense_disputes_expense_id ON expense_disputes(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_disputes_submitter_id ON expense_disputes(submitter_id);
CREATE INDEX IF NOT EXISTS idx_expense_disputes_status ON expense_disputes(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_time ON audit_logs(operation_time);

CREATE INDEX IF NOT EXISTS idx_system_operation_logs_operator_id ON system_operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_system_operation_logs_operation_type ON system_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_system_operation_logs_operation_time ON system_operation_logs(operation_time);

CREATE INDEX IF NOT EXISTS idx_system_configs_config_key ON system_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configs_config_type ON system_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_is_public ON system_configs(is_public);

CREATE INDEX IF NOT EXISTS idx_notification_configs_user_id ON notification_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_event_type ON notification_configs(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_configs_is_enabled ON notification_configs(is_enabled);

-- System administrator data access restrictions
-- System administrators can only access anonymized statistical data and system management information
-- Strictly prohibited from accessing any real business data and user personal information