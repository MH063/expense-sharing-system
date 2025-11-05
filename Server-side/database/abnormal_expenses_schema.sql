-- 创建异常费用规则表
CREATE TABLE IF NOT EXISTS abnormal_expense_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'amount_threshold', 'frequency_check', 'time_pattern', 'category_anomaly'
    threshold_value DECIMAL(10,2), -- 阈值，根据规则类型可能有不同含义
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建异常费用记录表
CREATE TABLE IF NOT EXISTS abnormal_expenses (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id),
    rule_id INTEGER NOT NULL REFERENCES abnormal_expense_rules(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'ignored'
    note TEXT, -- 处理备注
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入一些默认的检测规则
INSERT INTO abnormal_expense_rules (name, rule_type, threshold_value, description, severity) VALUES
('高额费用检测', 'amount_threshold', 200.00, '检测金额超过200元的费用', 'high'),
('高额水费检测', 'amount_threshold', 100.00, '检测金额超过100元的水费', 'medium'),
('高额电费检测', 'amount_threshold', 300.00, '检测金额超过300元的电费', 'high'),
('高频消费检测', 'frequency_check', 5, '检测7天内同一类别消费超过5次', 'medium'),
('深夜消费检测', 'time_pattern', NULL, '检测23:00-5:00时间段的消费', 'low'),
('非常规类别消费检测', 'category_anomaly', NULL, '检测用户不常消费的类别', 'low')
ON CONFLICT DO NOTHING;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_abnormal_expenses_expense_id ON abnormal_expenses(expense_id);
CREATE INDEX IF NOT EXISTS idx_abnormal_expenses_rule_id ON abnormal_expenses(rule_id);
CREATE INDEX IF NOT EXISTS idx_abnormal_expenses_status ON abnormal_expenses(status);
CREATE INDEX IF NOT EXISTS idx_abnormal_expenses_created_at ON abnormal_expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_abnormal_expense_rules_is_active ON abnormal_expense_rules(is_active);