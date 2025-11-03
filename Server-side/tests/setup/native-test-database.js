/**
 * 测试数据库初始化（原生SQL版本）
 * - 使用原生SQL连接池
 * - 执行 scripts/init-test-database.sql 构建测试 Schema 与基础种子
 * - 在每个测试前使用 TRUNCATE 清空全部业务表，保证确定性
 */

const path = require('path');
const fs = require('fs');
// 强制使用共享连接池，避免 open handles
const { pool } = require('../../config/db');

let poolEnded = false; // 幂等关闭标记

// 初始化测试数据库
const initTestDatabase = async () => {
  try {
    // 执行初始化SQL脚本
    const sqlFile = path.join(__dirname, '../../scripts/init-test-database.sql');
    await runSqlFile(sqlFile);
    
    // 插入基础测试数据
    await insertSeedData();
    
    console.log('测试数据库初始化成功');
    return true;
  } catch (error) {
    console.error('测试数据库初始化失败:', error);
    throw error;
  }
};

// 执行SQL文件
async function runSqlFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const sql = fs.readFileSync(absolutePath, 'utf8');
  
  // 使用连接池执行
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 对于复杂的SQL脚本（如包含DO块），直接执行整个文件
    if (sql.includes('DO $$') || sql.includes('BEGIN')) {
      try {
        await client.query(sql);
      } catch (e) {
        console.error('执行复杂SQL脚本失败:', e.message);
        // 忽略一些已存在的错误
        if (!e.message.includes('already exists') && !e.message.includes('duplicate column')) {
          throw e;
        }
      }
    } else {
      // 对于简单脚本，按分号分割执行
      const statements = sql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            await client.query(stmt);
          } catch (e) {
            console.error('执行失败的语句:', stmt.substring(0, 100), '错误:', e.message);
            // 忽略一些已存在的错误
            if (!e.message.includes('already exists') && !e.message.includes('duplicate column')) {
              throw e;
            }
          }
        }
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 插入基础测试数据
const insertSeedData = async () => {
  const client = await pool.connect();
  try {
    // 插入费用类型
    await client.query(`
      INSERT INTO expense_types (id, name, description, icon, color, is_system_default, created_at, updated_at) VALUES
        (gen_random_uuid(), '餐饮', '餐饮相关费用', 'food', '#FF6B6B', true, NOW(), NOW()),
        (gen_random_uuid(), '交通', '交通相关费用', 'transport', '#4ECDC4', true, NOW(), NOW()),
        (gen_random_uuid(), '住宿', '住宿相关费用', 'hotel', '#45B7D1', true, NOW(), NOW()),
        (gen_random_uuid(), '娱乐', '娱乐相关费用', 'entertainment', '#96CEB4', true, NOW(), NOW()),
        (gen_random_uuid(), '购物', '购物相关费用', 'shopping', '#FFEAA7', true, NOW(), NOW()),
        (gen_random_uuid(), '其他', '其他费用', 'other', '#DDA0DD', true, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);
  } finally {
    client.release();
  }
};

// 清理测试数据库
const clearTestDatabase = async () => {
  if (poolEnded) return;
  
  const client = await pool.connect();
  try {
    // 清空所有表，但保留表结构
    const tables = [
      'payments',
      'offline_payments',
      'payment_transfers',
      'bills',
      'user_room_relations',
      'rooms',
      'users',
      'notifications',
      'expense_types'
    ];
    
    await client.query('BEGIN');
    
    // 禁用外键约束
    await client.query('SET session_replication_role = replica;');
    
    // 清空每个表
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch (e) {
        // 忽略表不存在的错误
        if (!e.message.includes('does not exist')) {
          console.warn(`清空表 ${table} 失败:`, e.message);
        }
      }
    }
    
    // 重新启用外键约束
    await client.query('SET session_replication_role = DEFAULT;');
    
    await client.query('COMMIT');
    
    // 重新插入基础数据
    await insertSeedData();
    
    logger.info('测试数据库清理完成');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('测试数据库清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 关闭测试数据库连接
const closeTestDatabase = async () => {
  if (poolEnded) return;
  
  try {
    await pool.end();
    poolEnded = true;
    console.log('测试数据库连接已关闭');
  } catch (error) {
    console.error('关闭测试数据库连接失败:', error);
  }
};

// 执行测试查询的辅助函数
const queryTestDatabase = async (text, params = []) => {
  if (poolEnded) {
    throw new Error('数据库连接池已关闭');
  }
  
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('测试查询执行', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('测试查询执行失败', { text, error });
    throw error;
  }
};

// 导出测试函数
module.exports = {
  initTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
  query: queryTestDatabase,
  pool
};