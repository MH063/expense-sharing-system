/**
 * 支付流程优化测试套件（原生SQL版本）
 * 
 * 本文件包含支付流程优化功能的完整测试套件，包括单元测试和集成测试
 * 测试覆盖以下功能：
 * 1. 离线支付功能
 * 2. 支付提醒功能
 * 3. 支付记录查询
 * 4. 定时任务管理
 * 5. 通知服务
 */

// 测试环境变量设置
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.EMAIL_HOST = 'smtp.example.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// 设置测试超时时间
jest.setTimeout(30000);

// 全局测试工具函数
const createTestUser = async (userData = {}) => {
  const { pool } = require('../../config/db');
  const result = await pool.query(
    'INSERT INTO users (id, username, email, password) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
    [
      userData.username || 'testuser',
      userData.email || 'test@example.com',
      userData.password || 'password123'
    ]
  );
  return result.rows[0];
};

const createTestRoom = async (roomData = {}) => {
  const { pool } = require('../../config/db');
  const result = await pool.query(
    'INSERT INTO rooms (id, name, description, creator_id) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
    [
      roomData.name || '测试房间',
      roomData.description || '用于测试的房间',
      roomData.creator_id || (await createTestUser()).id
    ]
  );
  return result.rows[0];
};

const createTestBill = async (billData = {}) => {
  const { pool } = require('../../config/db');
  const creatorId = billData.creator_id || (await createTestUser()).id;
  const roomId = billData.room_id || (await createTestRoom()).id;
  
  const result = await pool.query(
    'INSERT INTO bills (id, title, description, total_amount, due_date, room_id, creator_id) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *',
    [
      billData.title || '测试账单',
      billData.description || '用于测试的账单',
      billData.total_amount || 100.50,
      billData.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后到期
      roomId,
      creatorId
    ]
  );
  return result.rows[0];
};

const cleanupTestData = async () => {
  const { pool } = require('../../config/db');
  
  // 清理测试数据，按依赖关系顺序
  await pool.query('DELETE FROM payment_reminders WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
  await pool.query('DELETE FROM offline_payments WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
  await pool.query('DELETE FROM payments WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
  await pool.query('DELETE FROM bills WHERE title LIKE \'测试%\'');
  await pool.query('DELETE FROM user_room_relations WHERE user_id IN (SELECT id FROM users WHERE username LIKE \'test%\')');
  await pool.query('DELETE FROM users WHERE username LIKE \'test%\'');
  await pool.query('DELETE FROM rooms WHERE name LIKE \'测试%\'');
};

const generateTestToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const mockRequest = (userData = {}) => {
  return {
    user: userData,
    body: {},
    params: {},
    query: {}
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// 导出测试工具函数
module.exports = {
  createTestUser,
  createTestRoom,
  createTestBill,
  cleanupTestData,
  generateTestToken,
  mockRequest,
  mockResponse
};