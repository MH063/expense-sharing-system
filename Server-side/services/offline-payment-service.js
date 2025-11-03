/**
 * 离线支付支持服务
 * 处理离线支付记录的存储、同步和状态管理
 */

// 兼容测试环境：优先使用全局注入的 Sequelize 模型集合
const modelsSource = (global.models && global.models.OfflinePayment) ? global.models : require('../models');
const { OfflinePayment, Payment, Bill, User, Room } = modelsSource;
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建离线支付记录
 * @param {Object} paymentData - 支付数据
 * @param {string} paymentData.billId - 账单ID
 * @param {string} paymentData.userId - 用户ID
 * @param {number} paymentData.amount - 支付金额
 * @param {string} paymentData.paymentMethod - 支付方式
 * @param {string} paymentData.note - 备注
 * @param {string} paymentData.deviceId - 设备ID
 * @param {string} paymentData.location - 位置信息
 * @returns {Object} 离线支付记录
 */
const createOfflinePayment = async (paymentData) => {
  try {
    console.log('创建离线支付记录，数据:', paymentData);
    
    // 验证必要参数
    const {
      billId,
      userId,
      amount,
      paymentMethod,
      note,
      deviceId,
      location
    } = paymentData;
    
    if (!billId || !userId || !amount || !paymentMethod || !deviceId) {
      throw new Error('缺少必要参数');
    }
    
    // 检查账单是否存在
    const bill = await Bill.findByPk(billId);
    if (!bill) {
      throw new Error('账单不存在');
    }
    
    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 创建离线支付记录
    const offlinePayment = await OfflinePayment.create({
      billId,
      userId,
      amount,
      paymentMethod,
      notes: note || '',
      paymentTime: new Date(),
      status: 'pending' // 待同步状态
    });
    
    console.log(`成功创建离线支付记录，ID: ${offlinePayment.id}`);
    
    return offlinePayment;
  } catch (error) {
    console.error('创建离线支付记录失败:', error);
    throw error;
  }
};

/**
 * 同步离线支付记录
 * @param {string} paymentId - 支付记录ID
 * @param {Object} syncData - 同步数据
 * @param {string} syncData.transactionId - 交易ID
 * @param {string} syncData.receipt - 收据信息
 * @returns {Object} 更新后的支付记录
 */
const syncOfflinePayment = async (paymentId, syncData) => {
  try {
    console.log(`同步离线支付记录，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const payment = await OfflinePayment.findByPk(paymentId);
    
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    if (payment.status !== 'pending') {
      throw new Error('只能同步待同步状态的离线支付记录');
    }
    
    // 更新支付记录
    const updatedPayment = await payment.update({
      status: 'synced',
      lastSyncAttempt: new Date(),
      syncedAt: new Date()
    });
    
    console.log(`成功同步离线支付记录，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    console.error('同步离线支付记录失败:', error);
    throw error;
  }
};

/**
 * 获取用户的离线支付记录
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.status - 状态筛选
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @returns {Object} 离线支付记录列表和分页信息
 */
const getUserOfflinePayments = async (userId, options = {}) => {
  try {
    console.log(`获取用户离线支付记录，用户ID: ${userId}`);
    
    const {
      status,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建查询条件
    const whereClause = {
      userId
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询离线支付记录
    const { count, rows: payments } = await OfflinePayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条用户离线支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取用户离线支付记录失败:', error);
    throw error;
  }
};

/**
 * 获取所有待同步的离线支付记录
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @returns {Object} 待同步的离线支付记录列表和分页信息
 */
const getPendingSyncPayments = async (options = {}) => {
  try {
    console.log('获取所有待同步的离线支付记录');
    
    const {
      page = 1,
      pageSize = 10
    } = options;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询待同步的离线支付记录
    const { count, rows: payments } = await OfflinePayment.findAndCountAll({
      where: {
        status: 'pending'
      },
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'ASC']], // 按创建时间升序，先同步早创建的记录
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条待同步的离线支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取待同步的离线支付记录失败:', error);
    throw error;
  }
};

/**
 * 标记离线支付记录为同步失败
 * @param {string} paymentId - 支付记录ID
 * @param {string} failureReason - 失败原因
 * @returns {Object} 更新后的支付记录
 */
const markPaymentSyncFailed = async (paymentId, failureReason) => {
  try {
    console.log(`标记离线支付记录为同步失败，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const payment = await OfflinePayment.findByPk(paymentId);
    
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    if (payment.status !== 'pending') {
      throw new Error('只能标记待同步状态的支付记录');
    }
    
    // 更新支付记录
    const updatedPayment = await payment.update({
      status: 'failed',
      lastSyncAttempt: new Date()
    });
    
    console.log(`成功标记离线支付记录为同步失败，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    console.error('标记离线支付记录为同步失败失败:', error);
    throw error;
  }
};

/**
 * 重试同步失败的离线支付记录
 * @param {string} paymentId - 支付记录ID
 * @returns {Object} 更新后的支付记录
 */
const retryPaymentSync = async (paymentId) => {
  try {
    console.log(`重试同步失败的离线支付记录，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const payment = await OfflinePayment.findByPk(paymentId);
    
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    if (payment.status !== 'failed') {
      throw new Error('只能重试同步失败状态的支付记录');
    }
    
    // 更新支付记录
    const updatedPayment = await payment.update({
      status: 'pending',
      syncAttempts: payment.syncAttempts + 1
    });
    
    console.log(`成功重置离线支付记录为待同步状态，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    console.error('重试同步失败的离线支付记录失败:', error);
    throw error;
  }
};

module.exports = {
  createOfflinePayment,
  syncOfflinePayment,
  getUserOfflinePayments,
  getPendingSyncPayments,
  markPaymentSyncFailed,
  retryPaymentSync
};