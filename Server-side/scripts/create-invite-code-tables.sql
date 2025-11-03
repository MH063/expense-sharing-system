-- 创建邀请码相关表

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 10,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 邀请码使用记录表
CREATE TABLE IF NOT EXISTS invite_code_logs (
  id SERIAL PRIMARY KEY,
  invite_code_id INTEGER NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_room_id ON invite_codes(room_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON invite_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_invite_code_logs_invite_code_id ON invite_code_logs(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_logs_user_id ON invite_code_logs(user_id);

-- 创建触发器，自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invite_codes_updated_at 
    BEFORE UPDATE ON invite_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例数据（可选）
-- INSERT INTO invite_codes (code, room_id, created_by, max_uses, expires_at)
-- VALUES ('ABC12345', 1, 1, 10, CURRENT_TIMESTAMP + INTERVAL '7 days');

-- 注释：
-- 1. invite_codes 表存储邀请码的基本信息，包括代码、关联的房间、创建者、最大使用次数等
-- 2. invite_code_logs 表记录每次邀请码被使用的详细信息，包括使用者和使用时间
-- 3. 添加了适当的索引以提高查询性能
-- 4. 创建了触发器自动更新 updated_at 字段
-- 5. 邀请码的验证逻辑在后端代码中实现，包括检查过期时间和使用次数限制