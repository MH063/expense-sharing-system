/**
 * 支付服务
 * 处理支付相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class PaymentService extends BaseService {
  constructor() {
    super('payments');
  }

  /**
   * 创建支付记录
   * @param {Object} paymentData - 支付数据
   * @returns {Promise<Object>} 创建的支付记录
   */
  async createPayment(paymentData) {
    const id = uuidv4();
    const { 
      billId, 
      userId, 
      amount, 
      paymentMethod, 
      isOffline = false, 
      deviceId = null,
      transactionId = null
    } = paymentData;
    
    const sql = `
      INSERT INTO payments (
        id, bill_id, user_id, amount, payment_method, status, 
        is_offline, sync_status, device_id, transaction_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [
      id, billId, userId, amount, paymentMethod, 'pending', 
      isOffline, isOffline ? 'pending' : 'synced', deviceId, transactionId
    ];
    
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新支付状态
   * @param {string} paymentId - 支付ID
   * @param {string} status - 新状态
   * @returns {Promise<Object|null>} 更新后的支付记录
   */
  async updatePaymentStatus(paymentId, status) {
    const sql = `
      UPDATE payments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.query(sql, [status, paymentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 更新支付同步状态
   * @param {string} paymentId - 支付ID
   * @param {string} syncStatus - 新同步状态
   * @returns {Promise<Object|null>} 更新后的支付记录
   */
  async updatePaymentSyncStatus(paymentId, syncStatus) {
    const sql = `
      UPDATE payments 
      SET sync_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.query(sql, [syncStatus, paymentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取账单的所有支付记录
   * @param {string} billId - 账单ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 支付记录列表
   */
  async getBillPayments(billId, options = {}) {
    let sql = `
      SELECT p.*, u.username, u.name as display_name
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.bill_id = $1
    `;
    const params = [billId];
    let paramIndex = 2;

    // 添加状态过滤
    if (options.status) {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    // 添加支付方式过滤
    if (options.paymentMethod) {
      sql += ` AND p.payment_method = $${paramIndex}`;
      params.push(options.paymentMethod);
      paramIndex++;
    }

    // 添加离线支付过滤
    if (options.isOffline !== undefined) {
      sql += ` AND p.is_offline = $${paramIndex}`;
      params.push(options.isOffline);
      paramIndex++;
    }

    // 排序
    sql += ` ORDER BY p.created_at DESC`;

    // 分页
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;

      if (options.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }
    }

    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * 获取用户的支付记录
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 支付记录列表
   */
  async getUserPayments(userId, options = {}) {
    let sql = `
      SELECT p.*, b.title as bill_title, b.room_id, r.name as room_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE p.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    // 添加状态过滤
    if (options.status) {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    // 添加支付方式过滤
    if (options.paymentMethod) {
      sql += ` AND p.payment_method = $${paramIndex}`;
      params.push(options.paymentMethod);
      paramIndex++;
    }

    // 添加日期范围过滤
    if (options.startDate) {
      sql += ` AND p.created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      sql += ` AND p.created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    // 排序
    sql += ` ORDER BY p.created_at DESC`;

    // 分页
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;

      if (options.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }
    }

    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * 获取支付详情
   * @param {string} paymentId - 支付ID
   * @returns {Promise<Object|null>} 支付详情
   */
  async getPaymentDetails(paymentId) {
    const sql = `
      SELECT p.*, u.username, u.name as display_name, 
             b.title as bill_title, b.total_amount as bill_total_amount, b.status as bill_status,
             r.name as room_name
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE p.id = $1
    `;
    const result = await this.query(sql, [paymentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 获取待同步的离线支付
   * @param {string} deviceId - 设备ID
   * @returns {Promise<Array>} 待同步的支付记录
   */
  async getPendingOfflinePayments(deviceId) {
    const sql = `
      SELECT p.*, u.username, u.name as display_name,
             b.title as bill_title, b.room_id
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN bills b ON p.bill_id = b.id
      WHERE p.is_offline = $1 AND p.sync_status = $2 AND p.device_id = $3
      ORDER BY p.created_at ASC
    `;
    const result = await this.query(sql, [true, 'pending', deviceId]);
    return result.rows;
  }

  /**
   * 获取支付统计信息
   * @param {string} billId - 账单ID
   * @returns {Promise<Object>} 统计信息
   */
  async getPaymentStats(billId) {
    const sql = `
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_payments,
        COUNT(CASE WHEN is_offline = true THEN 1 END) as offline_payments,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_sync
      FROM payments
      WHERE bill_id = $1
    `;
    const result = await this.query(sql, [billId]);
    return result.rows[0];
  }

  /**
   * 删除支付记录
   * @param {string} paymentId - 支付ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deletePayment(paymentId) {
    const sql = `DELETE FROM payments WHERE id = $1`;
    const result = await this.query(sql, [paymentId]);
    return result.rowCount > 0;
  }

  /**
   * 批量更新支付状态
   * @param {Array} paymentIds - 支付ID列表
   * @param {string} status - 新状态
   * @returns {Promise<number>} 更新的记录数
   */
  async batchUpdatePaymentStatus(paymentIds, status) {
    if (!paymentIds || paymentIds.length === 0) {
      return 0;
    }

    const placeholders = paymentIds.map((_, index) => `$${index + 2}`).join(', ');
    const sql = `
      UPDATE payments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    
    const result = await this.query(sql, [status, ...paymentIds]);
    return result.rowCount;
  }

  /**
   * 批量更新支付同步状态
   * @param {Array} paymentIds - 支付ID列表
   * @param {string} syncStatus - 新同步状态
   * @returns {Promise<number>} 更新的记录数
   */
  async batchUpdatePaymentSyncStatus(paymentIds, syncStatus) {
    if (!paymentIds || paymentIds.length === 0) {
      return 0;
    }

    const placeholders = paymentIds.map((_, index) => `$${index + 2}`).join(', ');
    const sql = `
      UPDATE payments 
      SET sync_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    
    const result = await this.query(sql, [syncStatus, ...paymentIds]);
    return result.rowCount;
  }
}

module.exports = new PaymentService();