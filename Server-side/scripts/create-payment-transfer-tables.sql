-- 创建支付转移记录表
CREATE TABLE IF NOT EXISTS payment_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('self_pay', 'multiple_payers', 'payer_transfer')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    note TEXT,
    confirmed_at TIMESTAMP,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_payment_transfers_bill_id ON payment_transfers(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_from_user_id ON payment_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_to_user_id ON payment_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON payment_transfers(status);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_transfer_type ON payment_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_created_at ON payment_transfers(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_payment_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_transfers_updated_at
    BEFORE UPDATE ON payment_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transfers_updated_at();

-- 添加注释
COMMENT ON TABLE payment_transfers IS '支付转移记录表';
COMMENT ON COLUMN payment_transfers.id IS '主键ID';
COMMENT ON COLUMN payment_transfers.bill_id IS '关联的账单ID';
COMMENT ON COLUMN payment_transfers.transfer_type IS '转移类型：self_pay-本人支付，multiple_payers-多人支付，payer_transfer-缴费人之间转移';
COMMENT ON COLUMN payment_transfers.amount IS '转移金额';
COMMENT ON COLUMN payment_transfers.from_user_id IS '付款人ID';
COMMENT ON COLUMN payment_transfers.to_user_id IS '收款人ID';
COMMENT ON COLUMN payment_transfers.status IS '转移状态：pending-待确认，completed-已完成，cancelled-已取消';
COMMENT ON COLUMN payment_transfers.note IS '备注信息';
COMMENT ON COLUMN payment_transfers.confirmed_at IS '确认时间';
COMMENT ON COLUMN payment_transfers.confirmed_by IS '确认人ID';
COMMENT ON COLUMN payment_transfers.cancelled_at IS '取消时间';
COMMENT ON COLUMN payment_transfers.cancelled_by IS '取消人ID';
COMMENT ON COLUMN payment_transfers.created_by IS '创建人ID';
COMMENT ON COLUMN payment_transfers.updated_by IS '更新人ID';
COMMENT ON COLUMN payment_transfers.created_at IS '创建时间';
COMMENT ON COLUMN payment_transfers.updated_at IS '更新时间';