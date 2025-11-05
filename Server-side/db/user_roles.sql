-- 用户角色管理表结构
-- 这些表用于管理普通用户的角色，而不是管理员用户

-- 1. 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 2. 插入用户角色初始数据
INSERT INTO roles (id, name, description, is_system) VALUES
('10000000-0000-0000-0000-000000000001','system_admin','系统管理员', TRUE),
('10000000-0000-0000-0000-000000000002','admin','管理员', TRUE),
('10000000-0000-0000-0000-000000000003','寝室长','寝室长', TRUE),
('10000000-0000-0000-0000-000000000004','payer','付款人', TRUE),
('10000000-0000-0000-0000-000000000005','user','普通用户', TRUE)
ON CONFLICT DO NOTHING;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- 4. 为普通用户添加默认角色
-- 注意：这里只是一个示例，实际使用时应该根据业务逻辑来分配角色
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT id, '10000000-0000-0000-0000-000000000005' FROM users
-- ON CONFLICT DO NOTHING;