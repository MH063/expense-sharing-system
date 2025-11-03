/**
 * 支付流程优化测试套件
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
  const { User } = require('../../models');
  return await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    ...userData
  });
};

const createTestRoom = async (roomData = {}) => {
  const { Room } = require('../../models');
  return await Room.create({
    name: '测试房间',
    description: '用于测试的房间',
    ...roomData
  });
};

const createTestBill = async (billData = {}) => {
  const { Bill } = require('../../models');
  return await Bill.create({
    title: '测试账单',
    description: '用于测试的账单',
    amount: 100.50,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后到期
    ...billData
  });
};

const cleanupTestData = async () => {
  const { sequelize } = require('../../config/database');
  const { User, Room, Bill, Payment, OfflinePayment, PaymentReminder } = require('../../models');
  
  // 清理测试数据，按依赖关系顺序
  await PaymentReminder.destroy({ where: {} });
  await OfflinePayment.destroy({ where: {} });
  await Payment.destroy({ where: {} });
  await Bill.destroy({ where: {} });
  await User.destroy({ where: {} });
  await Room.destroy({ where: {} });
};

const generateTestToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId },
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