-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
