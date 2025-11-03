/**
 * 支付优化相关数据库表创建脚本
 * 包含离线支付记录表和支付提醒表
 */

-- 离线支付记录表
CREATE TABLE IF NOT EXISTS offline_payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sync_status VARCHAR(20) DEFAULT 'pending',
    sync_attempts INTEGER DEFAULT 0,
    last_sync_attempt TIMESTAMP,
    sync_error TEXT,
    payment_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 支付提醒表
CREATE TABLE IF NOT EXISTS payment_reminders (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reminder_time TIMESTAMP NOT NULL,
    reminder_type VARCHAR(20) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 离线支付记录表索引
CREATE INDEX IF NOT EXISTS idx_offline_payments_bill_id ON offline_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_user_id ON offline_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_payments_status ON offline_payments(status);
CREATE INDEX IF NOT EXISTS idx_offline_payments_sync_status ON offline_payments(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_payments_created_at ON offline_payments(created_at);

-- 支付提醒表索引
CREATE INDEX IF NOT EXISTS idx_payment_reminders_bill_id ON payment_reminders(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_user_id ON payment_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_reminder_time ON payment_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_created_at ON payment_reminders(created_at);

-- 离线支付记录表更新时间触发器
CREATE OR REPLACE FUNCTION update_offline_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offline_payments_updated_at
    BEFORE UPDATE ON offline_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_offline_payments_updated_at();

-- 支付提醒表更新时间触发器
CREATE OR REPLACE FUNCTION update_payment_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_reminders_updated_at
    BEFORE UPDATE ON payment_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_reminders_updated_at();

-- 离线支付记录表注释
COMMENT ON TABLE offline_payments IS '离线支付记录表，存储用户在离线状态下创建的支付记录';
COMMENT ON COLUMN offline_payments.id IS '主键ID';
COMMENT ON COLUMN offline_payments.bill_id IS '关联的账单ID';
COMMENT ON COLUMN offline_payments.user_id IS '支付用户ID';
COMMENT ON COLUMN offline_payments.amount IS '支付金额';
COMMENT ON COLUMN offline_payments.payment_method IS '支付方式';
COMMENT ON COLUMN offline_payments.description IS '支付描述';
COMMENT ON COLUMN offline_payments.status IS '支付状态：pending-待处理，completed-已完成，cancelled-已取消';
COMMENT ON COLUMN offline_payments.sync_status IS '同步状态：pending-待同步，synced-已同步，failed-同步失败';
COMMENT ON COLUMN offline_payments.sync_attempts IS '同步尝试次数';
COMMENT ON COLUMN offline_payments.last_sync_attempt IS '最后同步尝试时间';
COMMENT ON COLUMN offline_payments.sync_error IS '同步错误信息';
COMMENT ON COLUMN offline_payments.payment_data IS '支付相关数据，JSON格式';
COMMENT ON COLUMN offline_payments.created_at IS '创建时间';
COMMENT ON COLUMN offline_payments.updated_at IS '更新时间';
COMMENT ON COLUMN offline_payments.created_by IS '创建者ID';

-- 支付提醒表注释
COMMENT ON TABLE payment_reminders IS '支付提醒表，存储支付提醒信息';
COMMENT ON COLUMN payment_reminders.id IS '主键ID';
COMMENT ON COLUMN payment_reminders.bill_id IS '关联的账单ID';
COMMENT ON COLUMN payment_reminders.user_id IS '被提醒用户ID';
COMMENT ON COLUMN payment_reminders.reminder_time IS '提醒时间';
COMMENT ON COLUMN payment_reminders.reminder_type IS '提醒类型：email-邮件，sms-短信，push-推送';
COMMENT ON COLUMN payment_reminders.message IS '提醒消息内容';
COMMENT ON COLUMN payment_reminders.status IS '提醒状态：pending-待发送，sent-已发送，failed-发送失败';
COMMENT ON COLUMN payment_reminders.sent_at IS '发送时间';
COMMENT ON COLUMN payment_reminders.error_message IS '发送失败错误信息';
COMMENT ON COLUMN payment_reminders.created_at IS '创建时间';
COMMENT ON COLUMN payment_reminders.updated_at IS '更新时间';
COMMENT ON COLUMN payment_reminders.created_by IS '创建者ID';