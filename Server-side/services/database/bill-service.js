/**
 * 账单服务
 * 处理账单相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');
const enhancedCacheService = require('../enhanced-cache-service');

class BillService extends BaseService {
  constructor() {
    super('bills');
  }

  /**
   * 创建账单
   * @param {Object} billData - 账单数据
   * @returns {Promise<Object>} 创建的账单
   */
  async createBill(billData) {
    const {
      room_id,
      title,
      description,
      amount,
      currency,
      category_id,
      creator_id,
      due_date,
      is_recurring = false,
      recurring_type = null,
      recurring_end_date = null
    } = billData;

    // 使用 Sequelize 插入数据
    const [result] = await sequelize.query(`
      INSERT INTO bills (
        uuid,
        room_id,
        title,
        description,
        amount,
        currency,
        category_id,
        creator_id,
        due_date,
        is_recurring,
        recurring_type,
        recurring_end_date,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, {
      replacements: {
        uuid: uuidv4(),
        room_id,
        title,
        description,
        amount,
        currency,
        category_id,
        creator_id,
        due_date,
        created_by: creator_id,
        is_recurring,
        recurring_type,
        recurring_end_date
      }
    });
    
    // 清除相关缓存
    await this.clearBillCache(room_id, null);
    
    return result[0];
  }

  /**
   * 获取房间账单列表
   * @param {string} roomId - 房间ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 账单列表和分页信息
   */
  async getRoomBills(roomId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search, 
      sort_by = 'created_at', 
      sort_order = 'DESC' 
    } = options;
    
    // 创建选项哈希，用于生成缓存键
    const optionsHash = this.hashOptions(options);
    const cacheKey = `room:bills:${roomId}:${optionsHash}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let whereClause = 'WHERE b.room_id = $1';
      const queryParams = [roomId];
      let paramIndex = 2;
      
      if (status) {
        whereClause += ` AND b.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      if (search) {
        whereClause += ` AND (b.title ILIKE $${paramIndex} OR b.description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // 构建排序条件
      const validSortFields = ['created_at', 'due_date', 'amount', 'title'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      // 查询账单列表
      const billsQuery = `
        SELECT 
          b.*,
          u.username as creator_name,
          u.avatar_url as creator_avatar,
          COALESCE(SUM(p.amount), 0) as paid_amount,
          (b.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
        FROM bills b
        LEFT JOIN users u ON b.creator_id = u.id
        LEFT JOIN payments p ON b.id = p.bill_id AND p.status = 'completed'
        ${whereClause}
        GROUP BY b.id, u.username, u.avatar_url
        ORDER BY b.${sortField} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const billsResult = await this.query(billsQuery, queryParams);
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(DISTINCT b.id) as total
        FROM bills b
        ${whereClause}
      `;
      
      const countResult = await this.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        bills: billsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }, enhancedCacheService.getDefaultTTL('bill'), ['bill', 'room']); // 使用账单类型的默认TTL并添加多个标签
  }

  /**
   * 获取最近的账单列表
   * @param {number} limit - 返回的账单数量限制
   * @returns {Promise<Array>} 最近账单列表
   */
  async getRecentBills(limit = 10) {
    const cacheKey = `recent:bills:${limit}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `
        SELECT 
          b.id,
          b.room_id,
          b.title,
          b.amount,
          b.status,
          b.created_at,
          u.username as creator_name,
          r.name as room_name
        FROM bills b
        LEFT JOIN users u ON b.creator_id = u.id
        LEFT JOIN rooms r ON b.room_id = r.id
        ORDER BY b.created_at DESC
        LIMIT $1
      `;
      
      const result = await this.query(sql, [limit]);
      return result.rows;
    }, enhancedCacheService.getDefaultTTL('bill'), ['bill']); // 使用账单类型的默认TTL并添加标签
  }

  /**
   * 获取账单详情（通过ID）
   * @param {string} billId - 账单ID
   * @returns {Promise<Object>} 账单详情
   */
  async getBillById(billId) {
    const cacheKey = `bill:id:${billId}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `
        SELECT 
          b.*,
          u.username as creator_name,
          u.avatar_url as creator_avatar,
          r.name as room_name
        FROM bills b
        LEFT JOIN users u ON b.creator_id = u.id
        LEFT JOIN rooms r ON b.room_id = r.id
        WHERE b.id = $1
      `;
      
      const result = await this.query(sql, [billId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    }, enhancedCacheService.getDefaultTTL('bill'), ['bill']); // 使用账单类型的默认TTL并添加标签
  }

  /**
   * 获取账单详情（包含支付记录）
   * @param {string} billId - 账单ID
   * @returns {Promise<Object>} 账单详情
   */
  async getBillWithPayments(billId) {
    // 使用缓存键模式：bill:detail:{billId}
    const cacheKey = `bill:detail:${billId}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      // 查询账单基本信息
      const billQuery = `
        SELECT 
          b.*,
          u.username as creator_name,
          u.avatar_url as creator_avatar
        FROM bills b
        LEFT JOIN users u ON b.creator_id = u.id
        WHERE b.id = $1
      `;
      
      const billResult = await this.query(billQuery, [billId]);
      
      if (billResult.rows.length === 0) {
        return null;
      }
      
      const bill = billResult.rows[0];
      
      // 查询支付记录
      const paymentsQuery = `
        SELECT 
          p.*,
          u.username as payer_name,
          u.avatar_url as payer_avatar
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.bill_id = $1
        ORDER BY p.created_at DESC
      `;
      
      const paymentsResult = await this.query(paymentsQuery, [billId]);
      
      // 添加统计信息
      const paidAmount = paymentsResult.rows
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      return {
        ...bill,
        payments: paymentsResult.rows,
        paid_amount: paidAmount,
        remaining_amount: parseFloat(bill.amount) - paidAmount,
        payment_count: paymentsResult.rows.length,
        completed_payment_count: paymentsResult.rows.filter(p => p.status === 'completed').length
      };
    }, enhancedCacheService.getDefaultTTL('bill'), ['bill']); // 使用账单类型的默认TTL并添加标签
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
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const bill = result.rows[0];
    
    // 清除相关缓存
    await this.clearBillCache(bill.room_id, billId);
    
    return bill;
  }

  /**
   * 更新账单信息
   * @param {string} billId - 账单ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的账单
   */
  async updateBill(billId, updateData) {
    const allowedFields = [
      'title', 'description', 'amount', 'due_date', 
      'is_recurring', 'recurring_type', 'recurring_end_date'
    ];
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
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const bill = result.rows[0];
    
    // 清除相关缓存
    await this.clearBillCache(bill.room_id, billId);
    
    return bill;
  }

  /**
   * 删除账单
   * @param {string} billId - 账单ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteBill(billId) {
    // 先获取账单信息以便清除缓存
    const billQuery = `SELECT room_id FROM bills WHERE id = $1`;
    const billResult = await this.query(billQuery, [billId]);
    
    if (billResult.rows.length === 0) {
      return false;
    }
    
    const roomId = billResult.rows[0].room_id;
    
    // 删除账单（级联删除相关的支付记录）
    const sql = `DELETE FROM bills WHERE id = $1`;
    const result = await this.query(sql, [billId]);
    
    if (result.rowCount > 0) {
      // 清除相关缓存
      await this.clearBillCache(roomId, billId);
      return true;
    }
    
    return false;
  }

  /**
   * 获取用户账单列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 用户账单列表和分页信息
   */
  async getUserBills(userId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      role = 'all', // 'all', 'creator', 'payer'
      sort_by = 'created_at', 
      sort_order = 'DESC' 
    } = options;
    
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    let whereClause = 'WHERE rm.user_id = $1';
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (status) {
      whereClause += ` AND b.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    // 根据角色筛选
    if (role === 'creator') {
      whereClause += ` AND b.creator_id = $1`;
    } else if (role === 'payer') {
      whereClause += ` AND p.user_id = $1`;
    }
    
    // 构建排序条件
    const validSortFields = ['created_at', 'due_date', 'amount', 'title'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // 查询账单列表
    const billsQuery = `
      SELECT DISTINCT
        b.*,
        u.username as creator_name,
        u.avatar_url as creator_avatar,
        CASE 
          WHEN b.creator_id = $1 THEN true
          ELSE false
        END as is_creator,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (b.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM bills b
      JOIN room_members rm ON b.room_id = rm.room_id
      LEFT JOIN users u ON b.creator_id = u.id
      LEFT JOIN payments p ON b.id = p.bill_id AND p.status = 'completed'
      ${whereClause}
      GROUP BY b.id, u.username, u.avatar_url
      ORDER BY b.${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const billsResult = await this.query(billsQuery, queryParams);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bills b
      JOIN room_members rm ON b.room_id = rm.room_id
      ${whereClause}
    `;
    
    const countResult = await this.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    return {
      bills: billsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取账单统计信息
   * @param {string} roomId - 房间ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 统计信息
   */
  async getBillStats(roomId, options = {}) {
    const { period = 'all' } = options;
    
    // 创建选项哈希，用于生成缓存键
    const optionsHash = this.hashOptions(options);
    const cacheKey = `room:stats:${roomId}:${optionsHash}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      let dateFilter = '';
      const queryParams = [roomId];
      
      if (period === 'month') {
        dateFilter = 'AND b.created_at >= date_trunc(\'month\', CURRENT_DATE)';
      } else if (period === 'quarter') {
        dateFilter = 'AND b.created_at >= date_trunc(\'quarter\', CURRENT_DATE)';
      } else if (period === 'year') {
        dateFilter = 'AND b.created_at >= date_trunc(\'year\', CURRENT_DATE)';
      }
      
      // 查询账单统计
      const statsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(b.amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN b.status = 'pending' THEN b.amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN b.status = 'overdue' THEN b.amount ELSE 0 END), 0) as overdue_amount,
          COALESCE(AVG(b.amount), 0) as average_amount
        FROM bills b
        WHERE b.room_id = $1 ${dateFilter}
      `;
      
      const statsResult = await this.query(statsQuery, queryParams);
      const stats = statsResult.rows[0];
      
      // 查询支付统计
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(p.amount), 0) as total_paid,
          COUNT(DISTINCT p.user_id) as unique_payers
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        WHERE b.room_id = $1 AND p.status = 'completed' ${dateFilter}
      `;
      
      const paymentStatsResult = await this.query(paymentStatsQuery, queryParams);
      const paymentStats = paymentStatsResult.rows[0];
      
      // 按状态分组统计
      const statusQuery = `
        SELECT 
          b.status,
          COUNT(*) as count,
          COALESCE(SUM(b.amount), 0) as amount
        FROM bills b
        WHERE b.room_id = $1 ${dateFilter}
        GROUP BY b.status
      `;
      
      const statusResult = await this.query(statusQuery, queryParams);
      const byStatus = statusResult.rows.reduce((acc, row) => {
        acc[row.status] = {
          count: parseInt(row.count),
          amount: parseFloat(row.amount)
        };
        return acc;
      }, {});
      
      return {
        total: {
          bills: parseInt(stats.total_bills),
          amount: parseFloat(stats.total_amount),
          paid: parseFloat(stats.paid_amount),
          pending: parseFloat(stats.pending_amount),
          overdue: parseFloat(stats.overdue_amount),
          average: parseFloat(stats.average_amount)
        },
        payments: {
          count: parseInt(paymentStats.total_payments),
          amount: parseFloat(paymentStats.total_paid),
          uniquePayers: parseInt(paymentStats.unique_payers)
        },
        byStatus
      };
    }, enhancedCacheService.getDefaultTTL('stats'), ['stats', 'bill', 'room']); // 使用统计类型的默认TTL并添加多个标签
  }

  /**
   * 批量获取账单信息
   * @param {Array<string>} billIds - 账单ID数组
   * @returns {Promise<Map<string, Object>>} 账单ID到账单信息的映射
   */
  async getBillsBatch(billIds) {
    if (!billIds || billIds.length === 0) {
      return new Map();
    }
    
    // 生成缓存键数组
    const cacheKeys = billIds.map(id => `bill:id:${id}`);
    
    // 尝试从批量缓存获取
    const cachedResults = await enhancedCacheService.mget(cacheKeys);
    const results = new Map();
    const uncachedIds = [];
    
    // 分离已缓存和未缓存的账单
    for (let i = 0; i < billIds.length; i++) {
      const billId = billIds[i];
      const cacheKey = cacheKeys[i];
      const cachedBill = cachedResults.get(cacheKey);
      
      if (cachedBill) {
        results.set(billId, cachedBill);
      } else {
        uncachedIds.push(billId);
      }
    }
    
    // 如果有未缓存的账单，从数据库获取
    if (uncachedIds.length > 0) {
      const sql = `SELECT id, room_id, title, description, amount, status, due_date, creator_id, created_at, updated_at FROM bills WHERE id = ANY($1)`;
      const dbResult = await this.query(sql, [uncachedIds]);
      
      // 批量设置缓存
      const cacheItems = [];
      
      for (const bill of dbResult.rows) {
        results.set(bill.id, bill);
        cacheItems.push({
          key: `bill:id:${bill.id}`,
          value: bill,
          ttl: enhancedCacheService.getDefaultTTL('bill'),
          tags: ['bill']
        });
      }
      
      // 批量设置缓存
      if (cacheItems.length > 0) {
        await enhancedCacheService.mset(cacheItems);
      }
    }
    
    return results;
  }

  /**
   * 清除账单相关的缓存
   * @param {string} roomId - 房间ID
   * @param {string} billId - 账单ID
   * @returns {Promise<void>}
   */
  async clearBillCache(roomId, billId) {
    // 清除账单详情缓存
    if (billId) {
      await enhancedCacheService.del(`bill:detail:${billId}`);
      await enhancedCacheService.del(`bill:id:${billId}`);
    }
    
    // 使用标签批量清除房间账单列表缓存
    await enhancedCacheService.delByTag(`room:bills:${roomId}`);
    
    // 清除房间统计缓存
    await enhancedCacheService.delByTag(`room:stats:${roomId}`);
  }

  /**
   * 生成选项哈希，用于缓存键
   * @param {Object} options - 选项对象
   * @returns {string} 哈希字符串
   */
  hashOptions(options) {
    // 简单的哈希函数，用于生成缓存键的一部分
    const str = JSON.stringify(options, Object.keys(options).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }
}

module.exports = new BillService();