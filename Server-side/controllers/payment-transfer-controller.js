/**
 * 支付转移记录控制器
 * 处理支付转移记录的创建、查询、确认和取消等操作
 */

const pool = require('../config/db');
const { validationResult } = require('express-validator');
const { logger } = require('../config/logger');

/**
 * 获取支付转移记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentTransfers = async (req, res) => {
  try {
    logger.info('获取支付转移记录列表，参数:', req.query);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.error(400, '请求参数验证失败', {errors: errors.array()});
    }
    
    const {
      billId,
      transferType,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = req.query;
    
    // 构建查询条件
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (billId) {
      conditions.push(`pt.bill_id = $${paramIndex++}`);
      params.push(billId);
    }
    
    if (transferType) {
      conditions.push(`pt.transfer_type = $${paramIndex++}`);
      params.push(transferType);
    }
    
    if (status) {
      conditions.push(`pt.status = $${paramIndex++}`);
      params.push(status);
    }
    
    // 日期范围查询
    if (startDate) {
      conditions.push(`pt.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push(`pt.created_at <= $${paramIndex++}`);
      params.push(endDate + ' 23:59:59');
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建WHERE子句
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transfers pt
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const count = parseInt(countResult.rows[0].total);
    
    // 查询转移记录
    const query = `
      SELECT 
        pt.*,
        b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
        fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
        tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
      FROM payment_transfers pt
      LEFT JOIN bills b ON pt.bill_id = b.id
      LEFT JOIN users fu ON pt.from_user_id = fu.id
      LEFT JOIN users tu ON pt.to_user_id = tu.id
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // 格式化结果
    const transfers = result.rows.map(row => ({
      id: row.id,
      billId: row.bill_id,
      transferType: row.transfer_type,
      amount: row.amount,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      bill: row.bill_id ? {
        id: row.bill_id,
        title: row.bill_title,
        amount: row.bill_amount,
        status: row.bill_status
      } : null,
      fromUser: row.from_user_id ? {
        id: row.from_user_id,
        name: row.from_user_name,
        email: row.from_user_email,
        avatar: row.from_user_avatar
      } : null,
      toUser: row.to_user_id ? {
        id: row.to_user_id,
        name: row.to_user_name,
        email: row.to_user_email,
        avatar: row.to_user_avatar
      } : null
    }));
    
    logger.info(`成功查询到 ${count} 条支付转移记录`);
    
    res.success(200, '获取支付转移记录列表成功', {
      items: transfers,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    });
  } catch (error) {
    logger.error('获取支付转移记录列表失败:', error);
    res.error(500, '服务器内部错误', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

/**
 * 创建支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createPaymentTransfer = async (req, res) => {
  try {
    logger.info('创建支付转移记录，数据:', req.body);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.error(400, '请求参数验证失败', {errors: errors.array()});
    }
    
    const {
      billId,
      transferType,
      amount,
      fromUserId,
      toUserId,
      note
    } = req.body;
    
    // 检查账单是否存在
    const billResult = await pool.query(
      'SELECT * FROM bills WHERE id = $1',
      [billId]
    );
    
    if (billResult.rows.length === 0) {
      return res.error(404, '账单不存在');
    }
    
    // 检查付款人是否存在
    const fromUserResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [fromUserId]
    );
    
    if (fromUserResult.rows.length === 0) {
      return res.error(404, '付款人不存在');
    }
    
    // 检查收款人是否存在
    const toUserResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [toUserId]
    );
    
    if (toUserResult.rows.length === 0) {
      return res.error(404, '收款人不存在');
    }
    
    // 检查付款人和收款人是否相同（除非是本人支付）
    if (transferType !== 'self_pay' && fromUserId === toUserId) {
      return res.error(400, '付款人和收款人不能相同');
    }
    
    // 检查金额是否有效
    if (amount <= 0) {
      return res.error(400, '金额必须大于0');
    }
    
    // 创建支付转移记录
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertResult = await client.query(
        `INSERT INTO payment_transfers 
         (bill_id, transfer_type, amount, from_user_id, to_user_id, note, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [billId, transferType, amount, fromUserId, toUserId, note, 'pending', req.user.id]
      );
      
      const transfer = insertResult.rows[0];
      
      // 获取完整的转移记录信息
      const detailResult = await client.query(
        `SELECT 
         pt.*,
         b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
         fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
         tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
         FROM payment_transfers pt
         LEFT JOIN bills b ON pt.bill_id = b.id
         LEFT JOIN users fu ON pt.from_user_id = fu.id
         LEFT JOIN users tu ON pt.to_user_id = tu.id
         WHERE pt.id = $1`,
        [transfer.id]
      );
      
      const transferWithDetails = detailResult.rows[0];
      
      // 格式化结果
      const formattedTransfer = {
        id: transferWithDetails.id,
        billId: transferWithDetails.bill_id,
        transferType: transferWithDetails.transfer_type,
        amount: transferWithDetails.amount,
        fromUserId: transferWithDetails.from_user_id,
        toUserId: transferWithDetails.to_user_id,
        note: transferWithDetails.note,
        status: transferWithDetails.status,
        createdAt: transferWithDetails.created_at,
        updatedAt: transferWithDetails.updated_at,
        createdBy: transferWithDetails.created_by,
        bill: transferWithDetails.bill_id ? {
          id: transferWithDetails.bill_id,
          title: transferWithDetails.bill_title,
          amount: transferWithDetails.bill_amount,
          status: transferWithDetails.bill_status
        } : null,
        fromUser: transferWithDetails.from_user_id ? {
          id: transferWithDetails.from_user_id,
          name: transferWithDetails.from_user_name,
          email: transferWithDetails.from_user_email,
          avatar: transferWithDetails.from_user_avatar
        } : null,
        toUser: transferWithDetails.to_user_id ? {
          id: transferWithDetails.to_user_id,
          name: transferWithDetails.to_user_name,
          email: transferWithDetails.to_user_email,
          avatar: transferWithDetails.to_user_avatar
        } : null
      };
      
      await client.query('COMMIT');
      
      logger.info(`成功创建支付转移记录，ID: ${transfer.id}`);
      
      res.success(201, '创建支付转移记录成功', formattedTransfer);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('创建支付转移记录失败:', error);
    res.error(500, '服务器内部错误', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

/**
 * 确认支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const confirmPaymentTransfer = async (req, res) => {
  try {
    logger.info(`确认支付转移记录，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.error(400, '请求参数验证失败', {errors: errors.array()});
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transferResult = await pool.query(
      `SELECT 
       pt.*,
       b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
       fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
       tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
       FROM payment_transfers pt
       LEFT JOIN bills b ON pt.bill_id = b.id
       LEFT JOIN users fu ON pt.from_user_id = fu.id
       LEFT JOIN users tu ON pt.to_user_id = tu.id
       WHERE pt.id = $1`,
      [id]
    );
    
    if (transferResult.rows.length === 0) {
      return res.error(404, '支付转移记录不存在');
    }
    
    const transfer = transferResult.rows[0];
    
    // 检查转移记录状态
    if (transfer.status !== 'pending') {
      return res.error(400, '只能确认待确认状态的转移记录');
    }
    
    // 检查权限：只有收款人或管理员可以确认
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (transfer.to_user_id !== currentUserId && !isAdmin) {
      return res.error(403, '没有权限确认此转移记录');
    }
    
    // 更新转移记录状态
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE payment_transfers 
         SET status = $1, confirmed_at = NOW(), confirmed_by = $2, updated_at = NOW()
         WHERE id = $3`,
        ['completed', currentUserId, id]
      );
      
      // 获取更新后的转移记录
      const updatedResult = await client.query(
        `SELECT 
         pt.*,
         b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
         fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
         tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
         FROM payment_transfers pt
         LEFT JOIN bills b ON pt.bill_id = b.id
         LEFT JOIN users fu ON pt.from_user_id = fu.id
         LEFT JOIN users tu ON pt.to_user_id = tu.id
         WHERE pt.id = $1`,
        [id]
      );
      
      const updatedTransfer = updatedResult.rows[0];
      
      // 格式化结果
      const formattedTransfer = {
        id: updatedTransfer.id,
        billId: updatedTransfer.bill_id,
        transferType: updatedTransfer.transfer_type,
        amount: updatedTransfer.amount,
        fromUserId: updatedTransfer.from_user_id,
        toUserId: updatedTransfer.to_user_id,
        note: updatedTransfer.note,
        status: updatedTransfer.status,
        createdAt: updatedTransfer.created_at,
        updatedAt: updatedTransfer.updated_at,
        createdBy: updatedTransfer.created_by,
        confirmedAt: updatedTransfer.confirmed_at,
        confirmedBy: updatedTransfer.confirmed_by,
        bill: updatedTransfer.bill_id ? {
          id: updatedTransfer.bill_id,
          title: updatedTransfer.bill_title,
          amount: updatedTransfer.bill_amount,
          status: updatedTransfer.bill_status
        } : null,
        fromUser: updatedTransfer.from_user_id ? {
          id: updatedTransfer.from_user_id,
          name: updatedTransfer.from_user_name,
          email: updatedTransfer.from_user_email,
          avatar: updatedTransfer.from_user_avatar
        } : null,
        toUser: updatedTransfer.to_user_id ? {
          id: updatedTransfer.to_user_id,
          name: updatedTransfer.to_user_name,
          email: updatedTransfer.to_user_email,
          avatar: updatedTransfer.to_user_avatar
        } : null
      };
      
      await client.query('COMMIT');
      
      logger.info(`成功确认支付转移记录，ID: ${id}`);
      
      res.success(200, '确认支付转移记录成功', formattedTransfer);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('确认支付转移记录失败:', error);
    res.error(500, '服务器内部错误', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

/**
 * 取消支付转移记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const cancelPaymentTransfer = async (req, res) => {
  try {
    logger.info(`取消支付转移记录，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.error(400, '请求参数验证失败', {errors: errors.array()});
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transferResult = await pool.query(
      `SELECT 
       pt.*,
       b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
       fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
       tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
       FROM payment_transfers pt
       LEFT JOIN bills b ON pt.bill_id = b.id
       LEFT JOIN users fu ON pt.from_user_id = fu.id
       LEFT JOIN users tu ON pt.to_user_id = tu.id
       WHERE pt.id = $1`,
      [id]
    );
    
    if (transferResult.rows.length === 0) {
      return res.error(404, '支付转移记录不存在');
    }
    
    const transfer = transferResult.rows[0];
    
    // 检查转移记录状态
    if (transfer.status !== 'pending') {
      return res.error(400, '只能取消待确认状态的转移记录');
    }
    
    // 检查权限：只有付款人、收款人或管理员可以取消
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (transfer.from_user_id !== currentUserId && 
        transfer.to_user_id !== currentUserId && 
        !isAdmin) {
      return res.error(403, '没有权限取消此转移记录');
    }
    
    // 更新转移记录状态
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE payment_transfers 
         SET status = $1, cancelled_at = NOW(), cancelled_by = $2, updated_at = NOW()
         WHERE id = $3`,
        ['cancelled', currentUserId, id]
      );
      
      // 获取更新后的转移记录
      const updatedResult = await client.query(
        `SELECT 
         pt.*,
         b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status,
         fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
         tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
         FROM payment_transfers pt
         LEFT JOIN bills b ON pt.bill_id = b.id
         LEFT JOIN users fu ON pt.from_user_id = fu.id
         LEFT JOIN users tu ON pt.to_user_id = tu.id
         WHERE pt.id = $1`,
        [id]
      );
      
      const updatedTransfer = updatedResult.rows[0];
      
      // 格式化结果
      const formattedTransfer = {
        id: updatedTransfer.id,
        billId: updatedTransfer.bill_id,
        transferType: updatedTransfer.transfer_type,
        amount: updatedTransfer.amount,
        fromUserId: updatedTransfer.from_user_id,
        toUserId: updatedTransfer.to_user_id,
        note: updatedTransfer.note,
        status: updatedTransfer.status,
        createdAt: updatedTransfer.created_at,
        updatedAt: updatedTransfer.updated_at,
        createdBy: updatedTransfer.created_by,
        cancelledAt: updatedTransfer.cancelled_at,
        cancelledBy: updatedTransfer.cancelled_by,
        bill: updatedTransfer.bill_id ? {
          id: updatedTransfer.bill_id,
          title: updatedTransfer.bill_title,
          amount: updatedTransfer.bill_amount,
          status: updatedTransfer.bill_status
        } : null,
        fromUser: updatedTransfer.from_user_id ? {
          id: updatedTransfer.from_user_id,
          name: updatedTransfer.from_user_name,
          email: updatedTransfer.from_user_email,
          avatar: updatedTransfer.from_user_avatar
        } : null,
        toUser: updatedTransfer.to_user_id ? {
          id: updatedTransfer.to_user_id,
          name: updatedTransfer.to_user_name,
          email: updatedTransfer.to_user_email,
          avatar: updatedTransfer.to_user_avatar
        } : null
      };
      
      await client.query('COMMIT');
      
      logger.info(`成功取消支付转移记录，ID: ${id}`);
      
      res.success(200, '取消支付转移记录成功', formattedTransfer);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('取消支付转移记录失败:', error);
    res.error(500, '服务器内部错误', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

/**
 * 获取支付转移记录详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPaymentTransferById = async (req, res) => {
  try {
    logger.info(`获取支付转移记录详情，ID: ${req.params.id}`);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.error(400, '请求参数验证失败', {errors: errors.array()});
    }
    
    const { id } = req.params;
    
    // 查找转移记录
    const transferResult = await pool.query(
      `SELECT 
       pt.*,
       b.id as bill_id, b.title as bill_title, b.amount as bill_amount, b.status as bill_status, b.room_id as bill_room_id,
       r.id as room_id, r.name as room_name,
       fu.id as from_user_id, fu.name as from_user_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar,
       tu.id as to_user_id, tu.name as to_user_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar
       FROM payment_transfers pt
       LEFT JOIN bills b ON pt.bill_id = b.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users fu ON pt.from_user_id = fu.id
       LEFT JOIN users tu ON pt.to_user_id = tu.id
       WHERE pt.id = $1`,
      [id]
    );
    
    if (transferResult.rows.length === 0) {
      return res.error(404, '支付转移记录不存在');
    }
    
    const transfer = transferResult.rows[0];
    
    // 格式化结果
    const formattedTransfer = {
      id: transfer.id,
      billId: transfer.bill_id,
      transferType: transfer.transfer_type,
      amount: transfer.amount,
      fromUserId: transfer.from_user_id,
      toUserId: transfer.to_user_id,
      note: transfer.note,
      status: transfer.status,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
      createdBy: transfer.created_by,
      cancelledAt: transfer.cancelled_at,
      cancelledBy: transfer.cancelled_by,
      bill: transfer.bill_id ? {
        id: transfer.bill_id,
        title: transfer.bill_title,
        amount: transfer.bill_amount,
        status: transfer.bill_status,
        roomId: transfer.bill_room_id,
        room: transfer.room_id ? {
          id: transfer.room_id,
          name: transfer.room_name
        } : null
      } : null,
      fromUser: transfer.from_user_id ? {
        id: transfer.from_user_id,
        name: transfer.from_user_name,
        email: transfer.from_user_email,
        avatar: transfer.from_user_avatar
      } : null,
      toUser: transfer.to_user_id ? {
        id: transfer.to_user_id,
        name: transfer.to_user_name,
        email: transfer.to_user_email,
        avatar: transfer.to_user_avatar
      } : null
    };
    
    logger.info(`成功获取支付转移记录详情，ID: ${id}`);
    
    res.success(200, '获取支付转移记录详情成功', formattedTransfer);
  } catch (error) {
    logger.error('获取支付转移记录详情失败:', error);
    res.error(500, '服务器内部错误', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

module.exports = {
  getPaymentTransfers,
  createPaymentTransfer,
  confirmPaymentTransfer,
  cancelPaymentTransfer,
  getPaymentTransferById
};