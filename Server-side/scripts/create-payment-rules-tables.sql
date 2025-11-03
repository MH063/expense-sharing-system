-- 创建账单分摊表和特殊支付规则相关表
-- 创建账单分摊表
CREATE TABLE IF NOT EXISTS bill_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_at TIMESTAMP,
    payment_method VARCHAR(20),
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bill_id, user_id)
);

-- 创建特殊支付规则表
CREATE TABLE IF NOT EXISTS special_payment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('self_only', 'multiple_payers', 'payer_to_payer')),
    conditions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建支付规则应用记录表
CREATE TABLE IF NOT EXISTS payment_rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES special_payment_rules(id) ON DELETE CASCADE,
    applied_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    application_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建支付转移记录表（用于缴费人之间支付）
CREATE TABLE IF NOT EXISTS payment_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('wechat', 'alipay', 'cash', 'bank_transfer')),
    transaction_id VARCHAR(100),
    transfer_time TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_different_users CHECK (from_user_id != to_user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_bill_splits_bill_id ON bill_splits(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_user_id ON bill_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_status ON bill_splits(status);

CREATE INDEX IF NOT EXISTS idx_special_payment_rules_room_id ON special_payment_rules(room_id);
CREATE INDEX IF NOT EXISTS idx_special_payment_rules_rule_type ON special_payment_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_special_payment_rules_is_active ON special_payment_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_payment_rule_applications_bill_id ON payment_rule_applications(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_rule_applications_rule_id ON payment_rule_applications(rule_id);

CREATE INDEX IF NOT EXISTS idx_payment_transfers_bill_id ON payment_transfers(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_from_user_id ON payment_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_to_user_id ON payment_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON payment_transfers(status);

-- 插入示例数据
-- 示例特殊支付规则
INSERT INTO special_payment_rules (name, description, room_id, rule_type, conditions, is_active, priority, created_by) VALUES
('仅缴费人本人支付', '限制只能由缴费人本人支付账单', '11111111-1111-1111-1111-111111111111', 'self_only', '{"expense_types": ["水费", "电费"]}', true, 1, '11111111-1111-1111-1111-111111111111'),
('多人支付', '允许多人共同支付同一账单', '11111111-1111-1111-1111-111111111111', 'multiple_payers', '{"max_payers": 3, "min_amount": 50.00}', true, 2, '11111111-1111-1111-1111-111111111111'),
('缴费人之间支付', '允许缴费人之间互相代付', '11111111-1111-1111-1111-111111111111', 'payer_to_payer', '{"require_approval": true}', true, 3, '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;