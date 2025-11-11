-- 创建离线支付表
CREATE TABLE offline_payments (
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
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    sync_data JSONB, -- 同步数据
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    sync_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_offline_payments_bill_id ON offline_payments(bill_id);
CREATE INDEX idx_offline_payments_expense_id ON offline_payments(expense_id);
CREATE INDEX idx_offline_payments_payer_id ON offline_payments(payer_id);
CREATE INDEX idx_offline_payments_payee_id ON offline_payments(payee_id);
CREATE INDEX idx_offline_payments_status ON offline_payments(status);
CREATE INDEX idx_offline_payments_sync_status ON offline_payments(sync_status);
CREATE INDEX idx_offline_payments_created_at ON offline_payments(created_at);

-- 创建payment_reminders表（简化为payment_reminders）
CREATE TABLE payment_reminders (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    bill_id INTEGER REFERENCES bills(id),
    expense_id INTEGER REFERENCES expenses(id),
    user_id INTEGER REFERENCES users(id),
    reminder_type VARCHAR(50) NOT NULL, -- 'upcoming_due', 'overdue', 'payment_received'
    message TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_payment_reminders_bill_id ON payment_reminders(bill_id);
CREATE INDEX idx_payment_reminders_expense_id ON payment_reminders(expense_id);
CREATE INDEX idx_payment_reminders_user_id ON payment_reminders(user_id);
CREATE INDEX idx_payment_reminders_scheduled_at ON payment_reminders(scheduled_at);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX idx_payment_reminders_reminder_type ON payment_reminders(reminder_type);

-- 创建查询视图
CREATE OR REPLACE VIEW payment_reminders_view AS
SELECT 
    pr.*,
    b.title as bill_title,
    b.amount as bill_amount,
    e.title as expense_title,
    e.amount as expense_amount,
    u.username as user_username,
    u.email as user_email
FROM payment_reminders pr
LEFT JOIN bills b ON pr.bill_id = b.id
LEFT JOIN expenses e ON pr.expense_id = e.id
LEFT JOIN users u ON pr.user_id = u.id;