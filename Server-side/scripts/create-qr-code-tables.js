const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.resolve(__dirname, '../.env.development') });

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * 创建收款码表
 */
async function createQrCodeTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建用户收款码表
    const createQrCodesTable = `
      CREATE TABLE IF NOT EXISTS user_qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('wechat', 'alipay')),
        qr_image_url VARCHAR(500) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- 约束：每个用户每种类型的收款码只能有一个默认的
        UNIQUE(user_id, qr_type, is_default) DEFERRABLE INITIALLY DEFERRED,
        
        -- 索引
        INDEX idx_user_qr_codes_user_id (user_id),
        INDEX idx_user_qr_codes_qr_type (qr_type),
        INDEX idx_user_qr_codes_is_active (is_active),
        INDEX idx_user_qr_codes_is_default (is_default)
      );
    `;
    
    await client.query(createQrCodesTable);
    
    // 创建支付记录表
    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        qr_code_type VARCHAR(20) CHECK (qr_code_type IN ('wechat', 'alipay')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- 约束：支付人不能是收款人
        CONSTRAINT check_payer_not_user CHECK (user_id != payer_id),
        
        -- 索引
        INDEX idx_payments_bill_id (bill_id),
        INDEX idx_payments_user_id (user_id),
        INDEX idx_payments_payer_id (payer_id),
        INDEX idx_payments_status (status),
        INDEX idx_payments_created_at (created_at)
      );
    `;
    
    await client.query(createPaymentsTable);
    
    // 创建邀请码表
    const createInvitationCodesTable = `
      CREATE TABLE IF NOT EXISTS invitation_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        code VARCHAR(4) NOT NULL UNIQUE,
        description TEXT,
        max_uses INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- 索引
        INDEX idx_invitation_codes_room_id (room_id),
        INDEX idx_invitation_codes_code (code),
        INDEX idx_invitation_codes_is_active (is_active),
        INDEX idx_invitation_codes_expires_at (expires_at)
      );
    `;
    
    await client.query(createInvitationCodesTable);
    
    await client.query('COMMIT');
    console.log('收款码相关表创建成功');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建收款码表失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 创建触发器函数，自动更新updated_at字段
 */
async function createUpdateTimestampTrigger() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建更新时间戳的函数
    const createFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    await client.query(createFunction);
    
    // 为收款码表创建触发器
    const createQrCodesTrigger = `
      CREATE TRIGGER update_user_qr_codes_updated_at 
        BEFORE UPDATE ON user_qr_codes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await client.query(createQrCodesTrigger);
    
    // 为支付记录表创建触发器
    const createPaymentsTrigger = `
      CREATE TRIGGER update_payments_updated_at 
        BEFORE UPDATE ON payments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await client.query(createPaymentsTrigger);
    
    // 为邀请码表创建触发器
    const createInvitationCodesTrigger = `
      CREATE TRIGGER update_invitation_codes_updated_at 
        BEFORE UPDATE ON invitation_codes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await client.query(createInvitationCodesTrigger);
    
    await client.query('COMMIT');
    console.log('时间戳触发器创建成功');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建时间戳触发器失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 创建收款码管理相关的函数
 */
async function createQrCodeFunctions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 创建获取用户默认收款码的函数
    const getDefaultQrCodeFunction = `
      CREATE OR REPLACE FUNCTION get_default_qr_code(p_user_id UUID, p_qr_type VARCHAR)
      RETURNS TABLE (
        id UUID,
        qr_image_url VARCHAR
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          uqc.id,
          uqc.qr_image_url
        FROM user_qr_codes uqc
        WHERE uqc.user_id = p_user_id
          AND uqc.qr_type = p_qr_type
          AND uqc.is_active = TRUE
          AND uqc.is_default = TRUE
        LIMIT 1;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(getDefaultQrCodeFunction);
    
    // 创建设置默认收款码的函数
    const setDefaultQrCodeFunction = `
      CREATE OR REPLACE FUNCTION set_default_qr_code(p_user_id UUID, p_qr_code_id UUID)
      RETURNS VOID AS $$
      BEGIN
        -- 先取消同类型的其他默认收款码
        UPDATE user_qr_codes
        SET is_default = FALSE
        WHERE user_id = p_user_id
          AND qr_type = (SELECT qr_type FROM user_qr_codes WHERE id = p_qr_code_id)
          AND id != p_qr_code_id;
        
        -- 设置新的默认收款码
        UPDATE user_qr_codes
        SET is_default = TRUE
        WHERE id = p_qr_code_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(setDefaultQrCodeFunction);
    
    // 创建生成邀请码的函数
    const generateInvitationCodeFunction = `
      CREATE OR REPLACE FUNCTION generate_invitation_code()
      RETURNS VARCHAR(4) AS $$
      DECLARE
        code VARCHAR(4);
        attempts INTEGER := 0;
        max_attempts INTEGER := 100;
      BEGIN
        WHILE attempts < max_attempts LOOP
          -- 生成4位随机数字
          code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
          
          -- 检查是否满足规则：不允许同个数字重复3次
          IF NOT (
            code ~ '(.)\\1{2}' OR  -- 检查是否有连续3个相同数字
            code ~ '(.)\\1.*\\1'    -- 检查是否有3个相同数字（不连续）
          ) THEN
            -- 检查是否已存在
            IF NOT EXISTS (SELECT 1 FROM invitation_codes WHERE code = code) THEN
              RETURN code;
            END IF;
          END IF;
          
          attempts := attempts + 1;
        END LOOP;
        
        -- 如果无法生成符合条件的邀请码，抛出异常
        RAISE EXCEPTION '无法生成符合条件的邀请码，请稍后重试';
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(generateInvitationCodeFunction);
    
    await client.query('COMMIT');
    console.log('收款码管理相关函数创建成功');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建收款码管理相关函数失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 执行数据库初始化
async function init() {
  try {
    await createQrCodeTable();
    await createUpdateTimestampTrigger();
    await createQrCodeFunctions();
    console.log('收款码管理功能数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  init();
}

module.exports = {
  createQrCodeTable,
  createUpdateTimestampTrigger,
  createQrCodeFunctions,
  init
};