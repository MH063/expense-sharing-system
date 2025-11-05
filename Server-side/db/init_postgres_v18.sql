-- 记账系统 初始化脚本（用户端/管理端 · PostgreSQL 18）
-- 独立可执行：创建扩展、枚举、完整表结构、外键约束、索引与必要初始数据

\set ON_ERROR_STOP on

BEGIN;

-- 1) 扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid

-- 2) 枚举类型
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'room_role';
  IF NOT FOUND THEN CREATE TYPE room_role AS ENUM ('room_leader','member'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'bill_status';
  IF NOT FOUND THEN CREATE TYPE bill_status AS ENUM ('draft','open','settling','settled','canceled'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'split_type';
  IF NOT FOUND THEN CREATE TYPE split_type AS ENUM ('equal','custom','percentage'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'payment_method';
  IF NOT FOUND THEN CREATE TYPE payment_method AS ENUM ('cash','alipay','wechat','bank','credit','other'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'payment_status';
  IF NOT FOUND THEN CREATE TYPE payment_status AS ENUM ('pending','confirmed','canceled','failed'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'transfer_status';
  IF NOT FOUND THEN CREATE TYPE transfer_status AS ENUM ('pending','confirmed','canceled'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'qr_type';
  IF NOT FOUND THEN CREATE TYPE qr_type AS ENUM ('wechat','alipay'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'notification_type';
  IF NOT FOUND THEN CREATE TYPE notification_type AS ENUM ('bill_due','payment_status','expense_added','system'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'dispute_status';
  IF NOT FOUND THEN CREATE TYPE dispute_status AS ENUM ('pending','processing','resolved','escalated'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'dispute_type';
  IF NOT FOUND THEN CREATE TYPE dispute_type AS ENUM ('payment','expense','room','other'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'priority_level';
  IF NOT FOUND THEN CREATE TYPE priority_level AS ENUM ('low','medium','high'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'review_status';
  IF NOT FOUND THEN CREATE TYPE review_status AS ENUM ('pending','approved','rejected'); END IF;
END $$;
-- 管理端枚举
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'admin_user_status';
  IF NOT FOUND THEN CREATE TYPE admin_user_status AS ENUM ('active','disabled'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'permission_type';
  IF NOT FOUND THEN CREATE TYPE permission_type AS ENUM ('menu','page','api','action'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'admin_operation';
  IF NOT FOUND THEN CREATE TYPE admin_operation AS ENUM ('create','update','delete','grant','revoke','export','import','login','logout','maintenance','other'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'job_status';
  IF NOT FOUND THEN CREATE TYPE job_status AS ENUM ('queued','running','succeeded','failed','canceled'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'report_status';
  IF NOT FOUND THEN CREATE TYPE report_status AS ENUM ('draft','published','archived'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'review_outcome';
  IF NOT FOUND THEN CREATE TYPE review_outcome AS ENUM ('approved','rejected','escalated'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'ticket_status';
  IF NOT FOUND THEN CREATE TYPE ticket_status AS ENUM ('open','processing','resolved','closed'); END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'webhook_status';
  IF NOT FOUND THEN CREATE TYPE webhook_status AS ENUM ('active','disabled'); END IF;
END $$;

-- 3) 用户端表（与文档一致，不得修改字段语义）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(128),
  avatar_url TEXT,
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  locale VARCHAR(16) DEFAULT 'zh-CN',
  timezone VARCHAR(64) DEFAULT 'Asia/Shanghai',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_bill_due BOOLEAN NOT NULL DEFAULT TRUE,
  notify_payment_status BOOLEAN NOT NULL DEFAULT TRUE,
  notify_expense_added BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_third_party_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  UNIQUE (user_id, provider),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  avatar_url TEXT,
  invite_code VARCHAR(32),
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role room_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  code VARCHAR(16) NOT NULL UNIQUE,
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  qr_type qr_type NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, qr_type, is_default) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(64) NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  split_type split_type NOT NULL DEFAULT 'equal',
  status bill_status NOT NULL DEFAULT 'open',
  share_code VARCHAR(32) UNIQUE,
  share_expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(title) >= 2)
);

CREATE TABLE IF NOT EXISTS bill_participants (
  bill_id UUID NOT NULL REFERENCES bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  share_amount NUMERIC(12,2) NOT NULL CHECK (share_amount >= 0),
  percentage NUMERIC(5,2),
  paid_status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  PRIMARY KEY (bill_id, user_id),
  CHECK ((percentage IS NULL) OR (percentage >= 0 AND percentage <= 100))
);

CREATE TABLE IF NOT EXISTS bill_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bill_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL UNIQUE REFERENCES bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  initiated_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  bill_id UUID REFERENCES bills(id) ON UPDATE CASCADE ON DELETE SET NULL,
  from_user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status transfer_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status payment_status NOT NULL DEFAULT 'pending',
  qr_code_id UUID REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL,
  transaction_ref VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  icon VARCHAR(64),
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, name)
);

DROP VIEW IF EXISTS expense_types;
CREATE VIEW expense_types AS
  SELECT id, room_id, name AS type_name, icon FROM expense_categories;

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category VARCHAR(64) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_date DATE NOT NULL,
  split_type split_type NOT NULL DEFAULT 'equal',
  description TEXT,
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  percentage NUMERIC(5,2),
  PRIMARY KEY (expense_id, user_id),
  CHECK ((percentage IS NULL) OR (percentage >= 0 AND percentage <= 100))
);

CREATE TABLE IF NOT EXISTS expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON UPDATE CASCADE ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS special_payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  criteria JSONB NOT NULL,
  effect JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  creator_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  handler_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type dispute_type NOT NULL,
  priority priority_level NOT NULL DEFAULT 'medium',
  status dispute_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_participants (
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (dispute_id, user_id)
);

CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  evidence_type VARCHAR(32) NOT NULL CHECK (evidence_type IN ('image','document')),
  url TEXT NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL UNIQUE REFERENCES disputes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  content TEXT NOT NULL,
  result VARCHAR(32) NOT NULL CHECK (result IN ('approved','rejected','compromise')),
  handler_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT,
  status review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON UPDATE CASCADE ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) 管理端表
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(128),
  password_hash TEXT NOT NULL,
  status admin_user_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  type permission_type NOT NULL,
  resource VARCHAR(256),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  granted_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  operation admin_operation NOT NULL,
  target_table VARCHAR(128),
  target_id UUID,
  payload JSONB,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_change_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  table_name VARCHAR(128) NOT NULL,
  record_id UUID NOT NULL,
  action admin_operation NOT NULL,
  before_values JSONB,
  after_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (table_name, record_id, id)
);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(64) NOT NULL,
  params JSONB,
  status job_status NOT NULL DEFAULT 'queued',
  queued_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES batch_jobs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  shard_no INT,
  status job_status NOT NULL,
  log TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  schedule_cron VARCHAR(64),
  status report_status NOT NULL DEFAULT 'published',
  created_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES report_definitions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  period_label VARCHAR(64),
  params JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  storage_url TEXT,
  row_count INT,
  checksum VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(64) NOT NULL,
  params JSONB,
  status job_status NOT NULL DEFAULT 'queued',
  file_url TEXT,
  requested_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  reason VARCHAR(256),
  status review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_table, entity_id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES moderation_queue(id) ON UPDATE CASCADE ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  decision review_outcome NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  assigned_admin_id UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  admin_user_id UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128) NOT NULL,
  message TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  visible_from TIMESTAMPTZ,
  visible_to TIMESTAMPTZ,
  created_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  target_url TEXT NOT NULL,
  secret VARCHAR(128),
  status webhook_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON UPDATE CASCADE ON DELETE CASCADE,
  event_code VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  delivered_at TIMESTAMPTZ,
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) 索引（节选核心 + 文档建议）
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_room_status ON bills(room_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bill_participants_user_paid ON bill_participants(user_id, paid_status);
CREATE INDEX IF NOT EXISTS idx_payments_bill_status ON payments(bill_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_from_status ON payment_transfers(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_to_status ON payment_transfers(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_room_date ON expenses(room_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_disputes_room_status ON disputes(room_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_room_status ON reviews(room_id, status);
-- 管理端
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_admin ON admin_user_roles(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_user ON admin_operation_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_change_audits_record ON data_change_audits(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_type_status ON batch_jobs(job_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_report ON report_snapshots(report_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_exports_type_status ON data_exports(export_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status_assignee ON tickets(status, assigned_admin_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook ON webhook_events(webhook_id, created_at DESC);

-- 6) 必要初始数据（示例）
-- 示例管理员角色/权限
INSERT INTO admin_users (id, username, display_name, password_hash, status)
VALUES ('00000000-0000-0000-0000-000000000001','admin','系统管理员','$2y$10$examplehashforadmin', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, name, is_system) VALUES
('00000000-0000-0000-0000-000000000010','super_admin', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO admin_user_roles (admin_user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, code, name, type) VALUES
('00000000-0000-0000-0000-000000000100','admin.access','访问管理端','menu'),
('00000000-0000-0000-0000-000000000101','admin.users.read','查看管理员','api'),
('00000000-0000-0000-0000-000000000102','admin.roles.assign','分配角色','api')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000010', id FROM permissions
ON CONFLICT DO NOTHING;

COMMIT;
