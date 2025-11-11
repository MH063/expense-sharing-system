-- 创建系统API使用日志表
CREATE TABLE IF NOT EXISTS system_api_usage_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER,
    response_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON system_api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON system_api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON system_api_usage_logs(user_id);

-- 创建安全日志表
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    description TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);