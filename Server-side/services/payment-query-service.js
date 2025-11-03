/**
 * 支付记录查询服务
 * 提供支付记录的查询、筛选和统计功能
 */

const pool = require('../config/db').pool;
const { formatDateRange } = require('../utils/date-utils');

/**
 * 获取支付记录列表
 * @param {Object} queryParams - 查询参数
 * @param {string} queryParams.userId - 用户ID（可选）
 * @param {string} queryParams.billId - 账单ID（可选）
 * @param {string} queryParams.roomId - 房间ID（可选）
 * @param {string} queryParams.status - 支付状态（可选）
 * @param {string} queryParams.paymentMethod - 支付方式（可选）
 * @param {string} queryParams.startDate - 开始日期（可选）
 * @param {string} queryParams.endDate - 结束日期（可选）
 * @param {number} queryParams.page - 页码（默认为1）
 * @param {number} queryParams.pageSize - 每页数量（默认为10）
 * @param {string} queryParams.sortBy - 排序字段（默认为createdAt）
 * @param {string} queryParams.sortOrder - 排序方向（默认为DESC）
 * @returns {Object} 支付记录列表和分页信息
 */
const getPaymentRecords = async (queryParams = {}) => {
  try {
    console.log('获取支付记录列表，参数:', queryParams);
    
    const {
      userId,
      billId,
      roomId,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = queryParams;
    
    // 构建WHERE条件
    const whereConditions = [];
    const queryValues = [];
    let paramIndex = 1;
    
    if (userId) {
      whereConditions.push(`p.user_id = $${paramIndex++}`);
      queryValues.push(userId);
    }
    
    if (billId) {
      whereConditions.push(`p.bill_id = $${paramIndex++}`);
      queryValues.push(billId);
    }
    
    if (status) {
      whereConditions.push(`p.status = $${paramIndex++}`);
      queryValues.push(status);
    }
    
    if (paymentMethod) {
      whereConditions.push(`p.payment_method = $${paramIndex++}`);
      queryValues.push(paymentMethod);
    }
    
    if (startDate) {
      whereConditions.push(`p.payment_time >= $${paramIndex++}`);
      queryValues.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push(`p.payment_time <= $${paramIndex++}`);
      queryValues.push(endDate + ' 23:59:59');
    }
    
    // 构建完整的WHERE子句
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 如果提供了roomId，通过账单关联查询
    const roomCondition = roomId ? `AND b.room_id = $${paramIndex++}` : '';
    if (roomId) {
      queryValues.push(roomId);
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      ${whereClause} ${roomCondition}
    `;
    
    const countResult = await pool.query(countQuery, queryValues);
    const total = parseInt(countResult.rows[0].total);
    
    // 查询支付记录
    const dataQuery = `
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.payment_method,
        p.payment_time,
        p.description,
        p.external_transaction_id,
        p.created_at,
        p.updated_at,
        b.id as bill_id,
        b.title as bill_title,
        b.amount as bill_amount,
        b.due_date as bill_due_date,
        b.status as bill_status,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause} ${roomCondition}
      ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    queryValues.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryValues);
    
    // 格式化结果
    const payments = dataResult.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentTime: row.payment_time,
      description: row.description,
      externalTransactionId: row.external_transaction_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bill: row.bill_id ? {
        id: row.bill_id,
        title: row.bill_title,
        amount: row.bill_amount,
        dueDate: row.bill_due_date,
        status: row.bill_status
      } : null,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatar: row.user_avatar
      } : null
    }));
    
    console.log(`成功查询到 ${total} 条支付记录`);
    
    return {
      items: payments,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取支付记录列表失败:', { error: error.message });
    throw error;
  }
};

/**
 * 获取支付记录详情
 * @param {string} paymentId - 支付记录ID
 * @returns {Object} 支付记录详情
 */
const getPaymentRecordById = async (paymentId) => {
  try {
    console.log(`获取支付记录详情，ID: ${paymentId}`);
    
    // 查询支付记录
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.payment_method,
        p.payment_time,
        p.description,
        p.external_transaction_id,
        p.created_at,
        p.updated_at,
        b.id as bill_id,
        b.title as bill_title,
        b.amount as bill_amount,
        b.due_date as bill_due_date,
        b.status as bill_status,
        b.room_id as bill_room_id,
        r.id as room_id,
        r.name as room_name,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [paymentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // 格式化结果
    const payment = {
      id: row.id,
      amount: row.amount,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentTime: row.payment_time,
      description: row.description,
      externalTransactionId: row.external_transaction_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bill: row.bill_id ? {
        id: row.bill_id,
        title: row.bill_title,
        amount: row.bill_amount,
        dueDate: row.bill_due_date,
        status: row.bill_status,
        roomId: row.bill_room_id,
        room: row.room_id ? {
          id: row.room_id,
          name: row.room_name
        } : null
      } : null,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatar: row.user_avatar
      } : null
    };
    
    console.log(`成功获取支付记录详情，ID: ${paymentId}`);
    
    return payment;
  } catch (error) {
    console.error('获取支付记录详情失败:', { error: error.message });
    throw error;
  }
};

/**
 * 获取用户的支付统计信息
 * @param {Object} queryParams - 查询参数
 * @param {string} queryParams.userId - 用户ID
 * @param {string} queryParams.startDate - 开始日期（可选）
 * @param {string} queryParams.endDate - 结束日期（可选）
 * @param {string} queryParams.roomId - 房间ID（可选）
 * @returns {Object} 用户支付统计信息
 */
const getUserPaymentStats = async (queryParams) => {
  try {
    console.log('获取用户支付统计信息，参数:', queryParams);
    
    const {
      userId,
      startDate,
      endDate,
      roomId
    } = queryParams;
    
    // 构建WHERE条件
    const whereConditions = [`p.user_id = $1`];
    const queryValues = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      whereConditions.push(`p.payment_time >= $${paramIndex++}`);
      queryValues.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push(`p.payment_time <= $${paramIndex++}`);
      queryValues.push(endDate + ' 23:59:59');
    }
    
    // 构建完整的WHERE子句
    let whereClause = whereConditions.join(' AND ');
    
    // 如果提供了roomId，通过账单关联查询
    const roomCondition = roomId ? `AND b.room_id = $${paramIndex++}` : '';
    if (roomId) {
      queryValues.push(roomId);
    }
    
    // 查询支付记录
    const query = `
      SELECT 
        p.amount,
        p.status,
        p.payment_method,
        p.payment_time
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      WHERE ${whereClause} ${roomCondition}
    `;
    
    const result = await pool.query(query, queryValues);
    const payments = result.rows;
    
    // 计算统计信息
    const stats = {
      totalPayments: payments.length,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
      failedAmount: 0,
      paymentMethods: {},
      monthlyStats: {}
    };
    
    // 按月分组统计
    const monthlyData = {};
    
    for (const payment of payments) {
      const amount = parseFloat(payment.amount);
      const month = new Date(payment.payment_time).toISOString().substring(0, 7); // YYYY-MM
      
      // 总计
      stats.totalAmount += amount;
      
      // 按状态统计
      if (payment.status === 'completed') {
        stats.completedPayments++;
        stats.completedAmount += amount;
      } else if (payment.status === 'pending') {
        stats.pendingPayments++;
        stats.pendingAmount += amount;
      } else if (payment.status === 'failed') {
        stats.failedPayments++;
        stats.failedAmount += amount;
      }
      
      // 按支付方式统计
      const method = payment.payment_method;
      if (!stats.paymentMethods[method]) {
        stats.paymentMethods[method] = {
          count: 0,
          amount: 0
        };
      }
      stats.paymentMethods[method].count++;
      stats.paymentMethods[method].amount += amount;
      
      // 按月统计
      if (!monthlyData[month]) {
        monthlyData[month] = {
          count: 0,
          amount: 0
        };
      }
      monthlyData[month].count++;
      monthlyData[month].amount += amount;
    }
    
    // 转换月度数据为数组并排序
    stats.monthlyStats = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        count: monthlyData[month].count,
        amount: monthlyData[month].amount
      }));
    
    console.log(`成功获取用户支付统计信息，用户ID: ${userId}`);
    
    return stats;
  } catch (error) {
    console.error('获取用户支付统计信息失败:', { error: error.message });
    throw error;
  }
};

/**
 * 获取账单的支付记录
 * @param {string} billId - 账单ID
 * @param {Object} options - 查询选项
 * @param {string} options.status - 状态筛选（可选）
 * @param {number} options.page - 页码（默认为1）
 * @param {number} options.pageSize - 每页数量（默认为10）
 * @returns {Object} 账单支付记录列表和分页信息
 */
const getBillPayments = async (billId, options = {}) => {
  try {
    console.log(`获取账单支付记录，账单ID: ${billId}`);
    
    const {
      status,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建WHERE条件
    const whereConditions = [`p.bill_id = $1`];
    const queryParams = [billId];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`p.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    // 构建完整的WHERE子句
    const whereClause = whereConditions.join(' AND ');
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryValues);
    const total = parseInt(countResult.rows[0].total);
    
    // 查询支付记录
    const dataQuery = `
      SELECT 
        p.id,
        p.amount,
        p.status,
        p.payment_method,
        p.payment_time,
        p.description,
        p.external_transaction_id,
        p.created_at,
        p.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY p.payment_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    queryValues.push(limit, offset);
    const dataResult = await pool.query(dataQuery, queryValues);
    
    // 格式化结果
    const payments = dataResult.rows.map(row => ({
      id: row.id,
      amount: row.amount,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentTime: row.payment_time,
      description: row.description,
      externalTransactionId: row.external_transaction_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatar: row.user_avatar
      } : null
    }));
    
    console.log(`成功查询到 ${total} 条账单支付记录`);
    
    return {
      items: payments,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取账单支付记录失败:', { error: error.message });
    throw error;
  }
};

/**
 * 获取用户的支付转移记录
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.transferType - 转移类型（可选）
 * @param {string} options.status - 状态（可选）
 * @param {string} options.role - 角色（from/to，表示付款人/收款人）
 * @param {number} options.page - 页码（默认为1）
 * @param {number} options.pageSize - 每页数量（默认为10）
 * @returns {Object} 用户支付转移记录列表和分页信息
 */
const getUserPaymentTransfers = async (userId, options = {}) => {
  try {
    console.log(`获取用户支付转移记录，用户ID: ${userId}`);
    
    const {
      transferType,
      status,
      role,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建WHERE条件
    const whereConditions = [];
    const queryValues = [];
    let paramIndex = 1;
    
    // 简化实现，直接使用userId作为查询条件
    whereConditions.push(`(pt.from_user_id = $${paramIndex++} OR pt.to_user_id = $${paramIndex++})`);
    queryValues.push(userId, userId);
    
    // 构建完整的WHERE子句
    const whereClause = whereConditions.join(' AND ');
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transfers pt
      WHERE pt.from_user_id = $1 OR pt.to_user_id = $1
    `;
    
    // 执行COUNT查询获取总记录数
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total, 10);
    
    // 查询支付转移记录
    const dataQuery = `
      SELECT pt.*,
        b.id as bill_id,
        b.title as bill_title,
        b.amount as bill_amount,
        b.status as bill_status,
        fu.id as from_user_id,
        fu.name as from_user_name,
        fu.email as from_user_email,
        fu.avatar as from_user_avatar,
        tu.id as to_user_id,
        tu.name as to_user_name,
        tu.email as to_user_email,
        tu.avatar as to_user_avatar
      FROM payment_transfers pt
      LEFT JOIN bills b ON pt.bill_id = b.id
      LEFT JOIN users fu ON pt.from_user_id = fu.id
      LEFT JOIN users tu ON pt.to_user_id = tu.id
      WHERE $1 IN (pt.from_user_id, pt.to_user_id)
      ORDER BY pt.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const dataResult = await pool.query(dataQuery, [userId, limit, offset]);
    
    // 格式化结果
    const transfers = dataResult.rows.map(row => ({
      id: row.id,
      fromPaymentId: row.from_payment_id,
      toPaymentId: row.to_payment_id,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      fromBill: {
        title: row.from_bill_title
      },
      toBill: {
        title: row.to_bill_title
      }
    }));
    
    console.log(`成功查询到 ${total} 条用户支付转移记录`);
    
    return {
      transfers,
      total,
      page: parseInt(page),
      limit: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取用户支付转移记录失败:', { error: error.message });
    throw error;
  }
};

/**
 * 获取房间的支付统计信息
 * @param {string} roomId - 房间ID
 * @param {Object} options - 查询选项（可选）
 * @param {string} options.startDate - 开始日期（可选）
 * @param {string} options.endDate - 结束日期（可选）
 * @returns {Object} 房间支付统计信息
 */
const getRoomPaymentStats = async (roomId, options = {}) => {
  try {
    console.log('获取房间支付统计信息，房间ID:', roomId, '选项:', options);
    
    const { startDate, endDate } = options;
    
    // 构建查询条件
    const queryParams = [roomId];
    let whereClause = 'WHERE b.room_id = $1';
    
    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND p.created_at >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND p.created_at <= $${queryParams.length}`;
    }
    
    // 查询房间支付统计
    const query = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as completed_amount,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as pending_amount
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      ${whereClause}
    `;
    
    console.log('获取房间支付统计查询:', query, queryParams);
    const result = await pool.query(query, queryParams);
    
    // 打印查询结果以便调试
    console.log('查询结果:', result.rows);
    
    // 处理查询结果
    const stats = result.rows[0] || {};
    
    // 格式化返回结果，确保能正确处理字符串格式的值
    // 先转换为字符串，再转换为数字，确保能处理各种格式的输入
    return {
      totalAmount: parseFloat(String(stats.total_amount || '0')) || 0,
      totalCount: parseInt(String(stats.total_count || '0')) || 0,
      completedAmount: parseFloat(String(stats.completed_amount || '0')) || 0,
      completedCount: parseInt(String(stats.completed_count || '0')) || 0,
      pendingAmount: parseFloat(String(stats.pending_amount || '0')) || 0,
      pendingCount: parseInt(String(stats.pending_count || '0')) || 0
    };
  } catch (error) {
    console.error('获取房间支付统计信息失败:', { error: error.message });
    throw error;
  }
};

module.exports = {
  getPaymentRecords,
  getPaymentRecordById,
  getUserPaymentStats,
  getBillPayments,
  getUserPaymentTransfers,
  getRoomPaymentStats
};