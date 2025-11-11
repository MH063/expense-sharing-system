-- 创建系统告警表
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,  -- 告警类型: 'system', 'api', 'database', 'redis', 'websocket'
    alert_level VARCHAR(20) NOT NULL, -- 告警级别: 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,      -- 告警标题
    message TEXT NOT NULL,            -- 告警消息
    details JSONB,                    -- 告警详细信息
    source VARCHAR(100),              -- 告警来源
    status VARCHAR(20) DEFAULT 'active', -- 告警状态: 'active', 'resolved', 'ignored'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,            -- 解决时间
    resolved_by VARCHAR(100)          -- 解决人
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_level ON system_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_system_alerts_updated_at 
    BEFORE UPDATE ON system_alerts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建告警阈值配置表
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL UNIQUE, -- 指标名称
    threshold_value DECIMAL(10,2) NOT NULL,   -- 阈值
    comparison_operator VARCHAR(10) NOT NULL, -- 比较操作符: '>', '<', '>=', '<='
    alert_level VARCHAR(20) NOT NULL,         -- 触发的告警级别
    enabled BOOLEAN DEFAULT TRUE,             -- 是否启用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_metric_name ON alert_thresholds(metric_name);

-- 创建更新时间触发器
CREATE TRIGGER update_alert_thresholds_updated_at 
    BEFORE UPDATE ON alert_thresholds 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认阈值配置
INSERT INTO alert_thresholds (metric_name, threshold_value, comparison_operator, alert_level) VALUES
('cpu_usage', 80, '>', 'medium'),
('cpu_usage', 90, '>', 'high'),
('cpu_usage', 95, '>', 'critical'),
('memory_usage', 80, '>', 'medium'),
('memory_usage', 90, '>', 'high'),
('memory_usage', 95, '>', 'critical'),
('database_connections', 80, '>', 'medium'),
('database_connections', 90, '>', 'high'),
('database_connections', 95, '>', 'critical'),
('api_response_time', 1000, '>', 'medium'),
('api_response_time', 2000, '>', 'high'),
('api_response_time', 5000, '>', 'critical'),
('api_error_rate', 5, '>', 'medium'),
('api_error_rate', 10, '>', 'high'),
('api_error_rate', 20, '>', 'critical'),
('redis_memory_usage', 80, '>', 'medium'),
('redis_memory_usage', 90, '>', 'high'),
('redis_memory_usage', 95, '>', 'critical')
ON CONFLICT (metric_name) DO NOTHING;