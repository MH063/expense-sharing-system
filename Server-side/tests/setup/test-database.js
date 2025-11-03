/**
 * 测试数据库初始化
 * 在测试开始前初始化真实数据库
 */

const sequelize = require('../../config/database');
const { createTestDatabase } = require('../../scripts/create-test-database');
const {
  User,
  Room,
  RoomMember,
  Bill,
  Payment,
  OfflinePayment,
  PaymentReminder,
  ExpenseType,
  Expense,
  ExpenseSplit,
  InviteCode,
  QRCode,
  SpecialPaymentRule,
  PaymentTransfer
} = require('../../models');

/**
 * 初始化测试数据库
 * @returns {Promise<void>}
 */
async function initTestDatabase() {
  try {
    // 首先创建测试数据库（如果不存在）
    await createTestDatabase();
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('测试数据库连接成功');
    
    // 同步所有模型，创建表结构
    await sequelize.sync({ force: true });
    console.log('测试数据库表结构同步完成');
  } catch (error) {
    console.error('测试数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 清理测试数据库
 * @returns {Promise<void>}
 */
async function clearTestDatabase() {
  try {
    // 按照依赖关系顺序删除表数据，避免外键约束问题
    const models = [
      PaymentTransfer,
      PaymentReminder,
      OfflinePayment,
      Payment,
      ExpenseSplit,
      Expense,
      Bill,
      SpecialPaymentRule,
      QRCode,
      InviteCode,
      RoomMember,
      Room,
      ExpenseType,
      User
    ];
    
    // 使用事务确保数据一致性
    const transaction = await sequelize.transaction();
    
    try {
      for (const model of models) {
        await model.destroy({ where: {}, force: true, transaction });
      }
      await transaction.commit();
      console.log('测试数据库清理完成');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('测试数据库清理失败:', error);
    throw error;
  }
}

/**
 * 关闭数据库连接
 * @returns {Promise<void>}
 */
async function closeTestDatabase() {
  try {
    await sequelize.close();
    console.log('测试数据库连接已关闭');
  } catch (error) {
    console.error('关闭测试数据库连接失败:', error);
    throw error;
  }
}

module.exports = {
  initTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
  sequelize,
  models: {
    User,
    Room,
    RoomMember,
    Bill,
    Payment,
    OfflinePayment,
    PaymentReminder,
    ExpenseType,
    Expense,
    ExpenseSplit,
    InviteCode,
    QRCode,
    SpecialPaymentRule,
    PaymentTransfer
  }
};