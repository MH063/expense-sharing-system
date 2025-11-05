-- 创建用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);

-- 创建触发器，自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- 插入一些默认设置
INSERT INTO user_settings (user_id, setting_key, setting_value) 
SELECT id, 'theme', 'light' FROM users 
ON CONFLICT (user_id, setting_key) DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value) 
SELECT id, 'language', 'zh-CN' FROM users 
ON CONFLICT (user_id, setting_key) DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value) 
SELECT id, 'notifications', 'true' FROM users 
ON CONFLICT (user_id, setting_key) DO NOTHING;