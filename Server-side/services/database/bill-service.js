/**
 * 账单服务
 * 处理账单相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class BillService extends BaseService {
  constructor() {
    super('bills');
  }

  /**
   * 创建新账单
   * @param {Object} billData - 账单数据
   * @returns {Promise<Object>} 创建的账单
   */
  async createBill(billData) {
    const id = uuidv4();
    const { roomId, title, description, totalAmount, creatorId, dueDate } = billData;
    
    const sql = `
      INSERT INTO bills (id, room_id, title, description, total_amount, status, creator_id, due_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [id, roomId, title, description, totalAmount, 'PENDING', creatorId, dueDate];
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * 获取房间账单列表
   * @param {string} roomId - 房间ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 账单列表
   */
  async getRoomBills(roomId, options = {}) {
    let sql = `
      SELECT b.*, u.username as creator_name, u.name as creator_display_name
      FROM bills b
      LEFT JOIN users u ON b.creator_id = u.id
      WHERE b.room_id = $1
    `;
    const params = [roomId];
    let paramIndex = 2;

    // 添加状态过滤
    if (options.status) {
      sql += ` AND b.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    // 添加日期范围过滤
    if (options.startDate) {
      sql += ` AND b.created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      sql += ` AND b.created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    // 排序
    sql += ` ORDER BY b.created_at DESC`;

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
   * 获取账单详情，包括支付信息
   * @param {string} billId - 账单ID
   * @returns {Promise<Object|null>} 账单详情
   */
  async getBillWithPayments(billId) {
    // 获取账单基本信息
    const billSql = `
      SELECT b.*, u.username as creator_name, u.name as creator_display_name
      FROM bills b
      LEFT JOIN users u ON b.creator_id = u.id
      WHERE b.id = $1
    `;
    const billResult = await this.query(billSql, [billId]);
    
    if (billResult.rows.length === 0) {
      return null;
    }
    
    const bill = billResult.rows[0];
    
    // 获取账单的支付记录
    const paymentsSql = `
      SELECT p.*, u.username, u.name as display_name
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.bill_id = $1
      ORDER BY p.created_at DESC
    `;
    const paymentsResult = await this.query(paymentsSql, [billId]);
    
    bill.payments = paymentsResult.rows;
    
    // 计算已支付金额
    const totalPaid = paymentsResult.rows
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    bill.total_paid = totalPaid;
    bill.remaining_amount = parseFloat(bill.total_amount) - totalPaid;
    
    // 根据支付情况更新账单状态
    if (totalPaid >= parseFloat(bill.total_amount)) {
      bill.payment_status = 'PAID';
    } else if (totalPaid > 0) {
      bill.payment_status = 'PARTIAL';
    } else {
      bill.payment_status = 'PENDING';
    }
    
    return bill;
  }

  /**
   * 更新账单状态
   * @param {string} billId - 账单ID
   * @param {string} status - 新状态
   * @returns {Promise<Object|null>} 更新后的账单
   */
  async updateBillStatus(billId, status) {
    const sql = `
      UPDATE bills 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.query(sql, [status, billId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 更新账单信息
   * @param {string} billId - 账单ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的账单
   */
  async updateBill(billId, updateData) {
    const allowedFields = ['title', 'description', 'total_amount', 'due_date', 'status'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(billId);

    const sql = `
      UPDATE bills 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 删除账单
   * @param {string} billId - 账单ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteBill(billId) {
    // 先删除相关的支付记录
    const deletePaymentsSql = `DELETE FROM payments WHERE bill_id = $1`;
    await this.query(deletePaymentsSql, [billId]);
    
    // 删除账单
    const sql = `DELETE FROM bills WHERE id = $1`;
    const result = await this.query(sql, [billId]);
    return result.rowCount > 0;
  }

  /**
   * 获取用户参与的账单
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 账单列表
   */
  async getUserBills(userId, options = {}) {
    let sql = `
      SELECT DISTINCT b.*, u.username as creator_name, u.name as creator_display_name
      FROM bills b
      LEFT JOIN users u ON b.creator_id = u.id
      LEFT JOIN payments p ON b.id = p.bill_id
      LEFT JOIN user_room_relations urr ON b.room_id = urr.room_id
      WHERE (b.creator_id = $1 OR p.user_id = $1 OR urr.user_id = $1)
      AND urr.is_active = $2
    `;
    const params = [userId, true];
    let paramIndex = 3;

    // 添加状态过滤
    if (options.status) {
      sql += ` AND b.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    // 添加日期范围过滤
    if (options.startDate) {
      sql += ` AND b.created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      sql += ` AND b.created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    // 排序
    sql += ` ORDER BY b.created_at DESC`;

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
   * 获取账单统计信息
   * @param {string} roomId - 房间ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 统计信息
   */
  async getBillStats(roomId, options = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_bills,
        COUNT(CASE WHEN status = 'PARTIAL' THEN 1 END) as partial_bills,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_bills
      FROM bills
      WHERE room_id = $1
    `;
    const params = [roomId];

    // 添加日期范围过滤
    if (options.startDate) {
      sql += ` AND created_at >= $2`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ` AND created_at <= $3`;
      params.push(options.endDate);
    }

    const result = await this.query(sql, params);
    return result.rows[0];
  }
}

module.exports = new BillService();