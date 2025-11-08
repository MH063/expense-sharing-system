-- 离寝记录表
-- 用于记录用户的离寝情况，包括请假和退宿
-- 用于按在寝天数分摊算法计算每个成员的有效在寝天数

CREATE TYPE IF NOT EXISTS leave_type AS ENUM ('leave', 'checkout');
CREATE TYPE IF NOT EXISTS leave_status AS ENUM ('pending', 'approved', 'verified', 'settled', 'cancelled');

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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_leave_records_user_id ON leave_records(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_room_id ON leave_records(room_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_dates ON leave_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_records_status ON leave_records(status);
CREATE INDEX IF NOT EXISTS idx_leave_records_type ON leave_records(leave_type);

-- 创建更新时间戳的触发器
CREATE TRIGGER update_leave_records_updated_at BEFORE UPDATE ON leave_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE leave_records IS '离寝记录表，用于记录用户的离寝情况，包括请假和退宿';
COMMENT ON COLUMN leave_records.leave_type IS '离寝类型：leave-请假，checkout-退宿';
COMMENT ON COLUMN leave_records.status IS '状态：pending-待审核，approved-已批准，verified-已核实，settled-已结算，cancelled-已取消';
COMMENT ON COLUMN leave_records.start_date IS '离寝开始日期';
COMMENT ON COLUMN leave_records.end_date IS '离寝结束日期，可以为NULL表示未结束的请假';
COMMENT ON COLUMN leave_records.reason IS '离寝原因';
COMMENT ON COLUMN leave_records.created_by IS '创建记录的用户ID';
COMMENT ON COLUMN leave_records.reviewed_by IS '审核记录的用户ID';
COMMENT ON COLUMN leave_records.reviewed_at IS '审核时间';
COMMENT ON COLUMN leave_records.notes IS '备注信息';