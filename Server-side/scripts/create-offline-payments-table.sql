-- 创建离线支付表
CREATE TABLE IF NOT EXISTS offline_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_time TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMP,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_offline_payments_bill_id ON offline_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_user_id ON offline_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_status ON offline_payments(status);