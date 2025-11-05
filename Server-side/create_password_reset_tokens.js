const { pool } = require('./config/db');

async function createPasswordResetTokensTable() {
  try {
    console.log('开始创建password_reset_tokens表...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        is_used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('password_reset_tokens表创建成功');
    
    // 创建索引
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
    `;
    
    await pool.query(createIndexesQuery);
    console.log('password_reset_tokens表索引创建成功');
    
    console.log('password_reset_tokens表和索引创建完成');
    process.exit(0);
    
  } catch (error) {
    console.error('创建password_reset_tokens表失败:', error);
    process.exit(1);
  }
}

createPasswordResetTokensTable();