/**
 * 离线支付支持服务
 * 处理离线支付记录的存储、同步和状态管理
 */

const pool = require('../config/db').pool;
const logger = require('../config/winston');
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
    logger.info('创建离线支付记录，数据:', paymentData);
    
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
    const billResult = await pool.query(
      'SELECT id FROM bills WHERE id = $1',
      [billId]
    );
    
    if (billResult.rows.length === 0) {
      throw new Error('账单不存在');
    }
    
    // 检查用户是否存在
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    // 创建离线支付记录
    const insertResult = await pool.query(
      `INSERT INTO offline_payments 
       (bill_id, user_id, amount, payment_method, notes, payment_time, status, device_id, location, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [billId, userId, amount, paymentMethod, note || '', new Date(), 'pending', deviceId, location || '']
    );
    
    const offlinePayment = insertResult.rows[0];
    
    logger.info(`成功创建离线支付记录，ID: ${offlinePayment.id}`);
    
    return offlinePayment;
  } catch (error) {
    logger.error('创建离线支付记录失败:', error);
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
    logger.info(`同步离线支付记录，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const paymentResult = await pool.query(
      'SELECT * FROM offline_payments WHERE id = $1',
      [paymentId]
    );
    
    if (paymentResult.rows.length === 0) {
      throw new Error('支付记录不存在');
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.status !== 'pending') {
      throw new Error('只能同步待同步状态的离线支付记录');
    }
    
    // 更新支付记录
    const updateResult = await pool.query(
      `UPDATE offline_payments 
       SET status = $1, last_sync_attempt = NOW(), synced_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      ['synced', paymentId]
    );
    
    const updatedPayment = updateResult.rows[0];
    
    logger.info(`成功同步离线支付记录，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    logger.error('同步离线支付记录失败:', error);
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
    logger.info(`获取用户离线支付记录，用户ID: ${userId}`);
    
    const {
      status,
      page = 1,
      pageSize = 10
    } = options;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建查询条件和参数
    let queryConditions = 'WHERE op.user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;
    
    if (status) {
      queryConditions += ` AND op.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM offline_payments op ${queryConditions}`,
      queryParams
    );
    const count = parseInt(countResult.rows[0].total);
    
    // 查询离线支付记录
    const paymentsResult = await pool.query(
      `SELECT 
       op.*,
       b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status
       FROM offline_payments op
       LEFT JOIN bills b ON op.bill_id = b.id
       ${queryConditions}
       ORDER BY op.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );
    
    const payments = paymentsResult.rows.map(payment => ({
      ...payment,
      bill: payment.bill_id ? {
        id: payment.bill_id,
        title: payment.bill_title,
        amount: payment.bill_amount,
        status: payment.bill_status
      } : null
    }));
    
    logger.info(`成功查询到 ${count} 条用户离线支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    logger.error('获取用户离线支付记录失败:', error);
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
    logger.info('获取所有待同步的离线支付记录');
    
    const {
      page = 1,
      pageSize = 10
    } = options;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM offline_payments WHERE status = $1',
      ['pending']
    );
    const count = parseInt(countResult.rows[0].total);
    
    // 查询待同步的离线支付记录
    const paymentsResult = await pool.query(
      `SELECT 
       op.*,
       b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
       u.id as user_id, u.name as user_name, u.email as user_email
       FROM offline_payments op
       LEFT JOIN bills b ON op.bill_id = b.id
       LEFT JOIN users u ON op.user_id = u.id
       WHERE op.status = $1
       ORDER BY op.created_at ASC
       LIMIT $2 OFFSET $3`,
      ['pending', limit, offset]
    );
    
    const payments = paymentsResult.rows.map(payment => ({
      ...payment,
      bill: payment.bill_id ? {
        id: payment.bill_id,
        title: payment.bill_title,
        amount: payment.bill_amount,
        status: payment.bill_status
      } : null,
      user: payment.user_id ? {
        id: payment.user_id,
        name: payment.user_name,
        email: payment.user_email
      } : null
    }));
    
    logger.info(`成功查询到 ${count} 条待同步的离线支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    logger.error('获取待同步的离线支付记录失败:', error);
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
    logger.info(`标记离线支付记录为同步失败，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const paymentResult = await pool.query(
      'SELECT * FROM offline_payments WHERE id = $1',
      [paymentId]
    );
    
    if (paymentResult.rows.length === 0) {
      throw new Error('支付记录不存在');
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.status !== 'pending') {
      throw new Error('只能标记待同步状态的支付记录');
    }
    
    // 更新支付记录
    const updateResult = await pool.query(
      `UPDATE offline_payments 
       SET status = $1, last_sync_attempt = NOW(), failure_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      ['failed', failureReason || '', paymentId]
    );
    
    const updatedPayment = updateResult.rows[0];
    
    logger.info(`成功标记离线支付记录为同步失败，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    logger.error('标记离线支付记录为同步失败失败:', error);
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
    logger.info(`重试同步失败的离线支付记录，ID: ${paymentId}`);
    
    // 查找离线支付记录
    const paymentResult = await pool.query(
      'SELECT * FROM offline_payments WHERE id = $1',
      [paymentId]
    );
    
    if (paymentResult.rows.length === 0) {
      throw new Error('支付记录不存在');
    }
    
    const payment = paymentResult.rows[0];
    
    if (payment.status !== 'failed') {
      throw new Error('只能重试同步失败状态的支付记录');
    }
    
    // 更新支付记录
    const updateResult = await pool.query(
      `UPDATE offline_payments 
       SET status = $1, sync_attempts = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      ['pending', (payment.sync_attempts || 0) + 1, paymentId]
    );
    
    const updatedPayment = updateResult.rows[0];
    
    logger.info(`成功重置离线支付记录为待同步状态，ID: ${paymentId}`);
    
    return updatedPayment;
  } catch (error) {
    logger.error('重试同步失败的离线支付记录失败:', error);
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