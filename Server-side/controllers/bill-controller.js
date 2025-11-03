const { pool } = require('../config/db');
const winston = require('winston');
const { authenticateToken, requireRole } = require('../middleware/auth-middleware');
const fs = require('fs');
const path = require('path');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/bill-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/bill-combined.log' })
  ]
});

/**
 * 账单控制器
 * 处理账单生成、审核和支付相关操作
 */
class BillController {
  constructor() {
    this.pool = pool;
  }

  /**
   * 创建账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  createBill = async (req, res) => {
    const client = await pool.connect();
    try {
      const { 
        room_id, 
        title, 
        description, 
        total_amount, 
        due_date, 
        category,
        expense_ids,
        split_type = 'EQUAL', // EQUAL, CUSTOM, PERCENTAGE
        split_details = [] // 自定义分摊详情 [{user_id, amount}]
      } = req.body;
      
      const user_id = req.user.id;
      
      // 验证用户是否为寝室成员
      const memberCheck = await client.query(
        'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
        [room_id, user_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }
      
      // 验证费用记录是否属于该寝室
      if (expense_ids && expense_ids.length > 0) {
        const expenseCheck = await client.query(
          'SELECT COUNT(*) as count FROM expenses WHERE room_id = $1 AND id = ANY($2)',
          [room_id, expense_ids]
        );
        
        if (parseInt(expenseCheck.rows[0].count) !== expense_ids.length) {
          return res.status(400).json({
            success: false,
            message: '部分费用记录不属于该寝室'
          });
        }
      }
      
      // 验证自定义分摊详情
      if (split_type === 'CUSTOM' && split_details.length > 0) {
        // 验证分摊成员是否为寝室成员
        const memberIds = split_details.map(detail => detail.user_id);
        const memberValidation = await client.query(
          'SELECT COUNT(*) as count FROM room_members WHERE room_id = $1 AND user_id = ANY($2)',
          [room_id, memberIds]
        );
        
        if (parseInt(memberValidation.rows[0].count) !== memberIds.length) {
          return res.status(400).json({
            success: false,
            message: '分摊成员包含非寝室成员'
          });
        }
        
        // 验证分摊金额总和是否等于账单总金额
        const splitTotal = split_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);
        if (Math.abs(splitTotal - parseFloat(total_amount)) > 0.01) {
          return res.status(400).json({
            success: false,
            message: '分摊金额总和与账单总金额不匹配'
          });
        }
      }
      
      // 处理收据上传
      let receipt_url = null;
      if (req.file) {
        // 如果有上传文件，生成文件URL
        receipt_url = `/uploads/receipts/${req.file.filename}`;
        logger.info(`收据上传成功: ${receipt_url}`);
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 创建账单
      const billResult = await client.query(
        `INSERT INTO bills (room_id, creator_id, title, description, total_amount, due_date, category, receipt_url, status, split_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
         RETURNING *`,
        [room_id, user_id, title, description, total_amount, due_date, category, receipt_url, split_type]
      );
      
      const bill = billResult.rows[0];
      
      // 如果指定了费用记录，关联到账单
      if (expense_ids && expense_ids.length > 0) {
        for (const expenseId of expense_ids) {
          await client.query(
            'INSERT INTO bill_expenses (bill_id, expense_id) VALUES ($1, $2)',
            [bill.id, expenseId]
          );
        }
      }
      
      // 获取寝室所有成员
      const membersResult = await client.query(
        'SELECT user_id FROM room_members WHERE room_id = $1',
        [room_id]
      );
      
      const members = membersResult.rows;
      const memberCount = members.length;
      
      // 创建账单分摊记录
      if (split_type === 'EQUAL') {
        // 平均分摊
        const amount = total_amount / memberCount;
        
        for (const member of members) {
          await client.query(
            `INSERT INTO bill_splits (bill_id, user_id, amount, status)
             VALUES ($1, $2, $3, 'PENDING')`,
            [bill.id, member.user_id, amount]
          );
        }
      } else if (split_type === 'CUSTOM') {
        // 自定义分摊
        if (split_details.length > 0) {
          // 使用提供的分摊详情
          for (const detail of split_details) {
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, detail.user_id, detail.amount]
            );
          }
        } else {
          // 如果没有提供分摊详情，默认平均分摊
          const amount = total_amount / memberCount;
          
          for (const member of members) {
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, member.user_id, amount]
            );
          }
        }
      } else if (split_type === 'PERCENTAGE') {
        // 百分比分摊
        if (split_details.length > 0) {
          // 使用提供的分摊详情
          for (const detail of split_details) {
            const amount = (parseFloat(detail.amount) / 100) * total_amount;
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, detail.user_id, amount]
            );
          }
        } else {
          // 如果没有提供分摊详情，默认平均分摊
          const amount = total_amount / memberCount;
          
          for (const member of members) {
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, member.user_id, amount]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单创建成功: ${bill.id}, 创建者: ${user_id}, 寝室: ${room_id}`);
      
      res.status(201).json({
        success: true,
        data: {
          bill,
          message: '账单创建成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建账单失败:', error);
      res.status(500).json({
        success: false,
        message: '创建账单失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getBills = async (req, res) => {
    const client = await pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id, status, category, page = 1, limit = 10 } = req.query;
      
      let query = `
        SELECT b.*, u.username as creator_name, r.name as room_name
        FROM bills b
        JOIN users u ON b.creator_id = u.id
        JOIN rooms r ON b.room_id = r.id
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1
      `;
      
      const params = [user_id];
      let paramIndex = 2;
      
      if (room_id) {
        query += ` AND b.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      if (status) {
        query += ` AND b.status = $${paramIndex++}`;
        params.push(status);
      }
      
      if (category) {
        query += ` AND b.category = $${paramIndex++}`;
        params.push(category);
      }
      
      query += ` ORDER BY b.created_at DESC`;
      
      // 分页
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total
        FROM bills b
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1
      `;
      
      let countParams = [user_id];
      let countParamIndex = 2;
      
      if (room_id) {
        countQuery += ` AND b.room_id = $${countParamIndex++}`;
        countParams.push(room_id);
      }
      
      if (status) {
        countQuery += ` AND b.status = $${countParamIndex++}`;
        countParams.push(status);
      }
      
      if (category) {
        countQuery += ` AND b.category = $${countParamIndex++}`;
        countParams.push(category);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.status(200).json({
        success: true,
        data: {
          bills: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取账单列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单列表失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getBillById = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      
      // 验证用户是否有权限查看该账单
      const permissionCheck = await client.query(
        `SELECT b.*, rm.user_id as member_id
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看该账单'
        });
      }
      
      // 获取账单基本信息
      const billQuery = `
        SELECT b.*, u.username as creator_name, r.name as room_name
        FROM bills b
        JOIN users u ON b.creator_id = u.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = $1
      `;
      
      const billResult = await client.query(billQuery, [id]);
      const bill = billResult.rows[0];
      
      // 获取账单分摊详情
      const splitsQuery = `
        SELECT bs.*, u.username as user_name
        FROM bill_splits bs
        JOIN users u ON bs.user_id = u.id
        WHERE bs.bill_id = $1
      `;
      
      const splitsResult = await client.query(splitsQuery, [id]);
      bill.splits = splitsResult.rows;
      
      // 获取关联的费用记录
      const expensesQuery = `
        SELECT e.*, u.username as payer_name
        FROM bill_expenses be
        JOIN expenses e ON be.expense_id = e.id
        JOIN users u ON e.payer_id = u.id
        WHERE be.bill_id = $1
      `;
      
      const expensesResult = await client.query(expensesQuery, [id]);
      bill.expenses = expensesResult.rows;
      
      // 获取审核记录
      const reviewsQuery = `
        SELECT br.*, u.username as reviewer_name
        FROM bill_reviews br
        JOIN users u ON br.reviewer_id = u.id
        WHERE br.bill_id = $1
        ORDER BY br.created_at DESC
      `;
      
      const reviewsResult = await client.query(reviewsQuery, [id]);
      bill.reviews = reviewsResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          bill
        }
      });
    } catch (error) {
      logger.error('获取账单详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单详情失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 更新账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  updateBill = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { title, description, total_amount, due_date, category } = req.body;
      const user_id = req.user.id;
      
      // 验证用户是否有权限更新该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限更新该账单'
        });
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以更新账单
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有创建者或寝室管理员可以更新账单'
        });
      }
      
      // 只有PENDING状态的账单可以更新
      if (bill.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: '只有待审核状态的账单可以更新'
        });
      }
      
      // 处理收据上传
      let receipt_url = bill.receipt_url;
      if (req.file) {
        // 如果有上传文件，生成文件URL
        receipt_url = `/uploads/receipts/${req.file.filename}`;
        
        // 如果原来有收据，删除旧文件
        if (bill.receipt_url) {
          const oldFilePath = path.join(__dirname, '..', 'public', bill.receipt_url);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            logger.info(`删除旧收据文件: ${oldFilePath}`);
          }
        }
        
        logger.info(`收据更新成功: ${receipt_url}`);
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 更新账单基本信息
      const updateQuery = `
        UPDATE bills
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            total_amount = COALESCE($3, total_amount),
            due_date = COALESCE($4, due_date),
            category = COALESCE($5, category),
            receipt_url = COALESCE($6, receipt_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [title, description, total_amount, due_date, category, receipt_url, id]);
      const updatedBill = result.rows[0];
      
      // 如果总金额发生变化，重新计算分摊金额
      if (total_amount && total_amount !== bill.total_amount) {
        // 获取寝室成员数量
        const memberCountQuery = `
          SELECT COUNT(*) as count
          FROM room_members
          WHERE room_id = $1
        `;
        
        const memberCountResult = await client.query(memberCountQuery, [bill.room_id]);
        const memberCount = parseInt(memberCountResult.rows[0].count);
        
        // 更新分摊金额
        const newAmount = total_amount / memberCount;
        
        await client.query(
          `UPDATE bill_splits
           SET amount = $1
           WHERE bill_id = $2`,
          [newAmount, id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单更新成功: ${id}, 更新者: ${user_id}`);
      
      res.status(200).json({
        success: true,
        data: {
          bill: updatedBill,
          message: '账单更新成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('更新账单失败:', error);
      res.status(500).json({
        success: false,
        message: '更新账单失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 删除账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  deleteBill = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      
      // 验证用户是否有权限删除该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限删除该账单'
        });
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以删除账单
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有创建者或寝室管理员可以删除账单'
        });
      }
      
      // 只有PENDING状态的账单可以删除
      if (bill.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: '只有待审核状态的账单可以删除'
        });
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 删除账单分摊记录
      await client.query('DELETE FROM bill_splits WHERE bill_id = $1', [id]);
      
      // 删除账单与费用的关联
      await client.query('DELETE FROM bill_expenses WHERE bill_id = $1', [id]);
      
      // 删除审核记录
      await client.query('DELETE FROM bill_reviews WHERE bill_id = $1', [id]);
      
      // 删除账单
      await client.query('DELETE FROM bills WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      // 删除收据文件（如果有）
      if (bill.receipt_url) {
        const filePath = path.join(__dirname, '..', 'public', bill.receipt_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`删除收据文件: ${filePath}`);
        }
      }
      
      logger.info(`账单删除成功: ${id}, 删除者: ${user_id}`);
      
      res.status(200).json({
        success: true,
        data: {
          message: '账单删除成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('删除账单失败:', error);
      res.status(500).json({
        success: false,
        message: '删除账单失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 审核账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  reviewBill = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { action, comment } = req.body; // action: APPROVE, REJECT
      const user_id = req.user.id;
      
      // 验证用户是否有权限审核该账单（寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限审核该账单'
        });
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有寝室管理员可以审核账单
      if (memberRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有寝室管理员可以审核账单'
        });
      }
      
      // 只有PENDING状态的账单可以审核
      if (bill.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: '只有待审核状态的账单可以审核'
        });
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 创建审核记录
      await client.query(
        `INSERT INTO bill_reviews (bill_id, reviewer_id, action, comment)
         VALUES ($1, $2, $3, $4)`,
        [id, user_id, action, comment]
      );
      
      // 更新账单状态
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      await client.query(
        `UPDATE bills
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newStatus, id]
      );
      
      // 如果审核通过，更新分摊状态为待支付
      if (action === 'APPROVE') {
        await client.query(
          `UPDATE bill_splits
           SET status = 'PENDING_PAYMENT'
           WHERE bill_id = $1`,
          [id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单审核成功: ${id}, 审核者: ${user_id}, 动作: ${action}`);
      
      res.status(200).json({
        success: true,
        data: {
          message: `账单${action === 'APPROVE' ? '通过' : '拒绝'}审核`
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('审核账单失败:', error);
      res.status(500).json({
        success: false,
        message: '审核账单失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 确认账单支付
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  confirmBillPayment = async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params; // 账单ID
      const user_id = req.user.id;
      
      // 验证用户是否有该账单的分摊记录
      const splitCheck = await client.query(
        `SELECT bs.*, b.status as bill_status
         FROM bill_splits bs
         JOIN bills b ON bs.bill_id = b.id
         WHERE bs.bill_id = $1 AND bs.user_id = $2`,
        [id, user_id]
      );
      
      if (splitCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有该账单的分摊记录'
        });
      }
      
      const split = splitCheck.rows[0];
      const billStatus = split.bill_status;
      
      // 只有已审核通过的账单可以支付
      if (billStatus !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: '只有已审核通过的账单可以支付'
        });
      }
      
      // 只有待支付状态的分摊可以确认支付
      if (split.status !== 'PENDING_PAYMENT') {
        return res.status(400).json({
          success: false,
          message: '该分摊已支付或状态不正确'
        });
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 更新分摊状态为已支付
      await client.query(
        `UPDATE bill_splits
         SET status = 'PAID', paid_at = CURRENT_TIMESTAMP
         WHERE bill_id = $1 AND user_id = $2`,
        [id, user_id]
      );
      
      // 检查是否所有分摊都已支付
      const unpaidCountQuery = await client.query(
        `SELECT COUNT(*) as count
         FROM bill_splits
         WHERE bill_id = $1 AND status != 'PAID'`,
        [id]
      );
      
      const unpaidCount = parseInt(unpaidCountQuery.rows[0].count);
      
      // 如果所有分摊都已支付，更新账单状态为已完成
      if (unpaidCount === 0) {
        await client.query(
          `UPDATE bills
           SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单支付确认成功: 账单ID ${id}, 用户ID ${user_id}`);
      
      res.status(200).json({
        success: true,
        data: {
          message: '支付确认成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('确认账单支付失败:', error);
      res.status(500).json({
        success: false,
        message: '确认账单支付失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户账单统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  getUserBillStats = async (req, res) => {
    const client = await pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id } = req.query;
      
      let roomFilter = '';
      const params = [user_id];
      let paramIndex = 2;
      
      if (room_id) {
        roomFilter = `AND b.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      // 获取待支付账单数量和总金额
      const pendingQuery = `
        SELECT COUNT(*) as count, COALESCE(SUM(bs.amount), 0) as total_amount
        FROM bill_splits bs
        JOIN bills b ON bs.bill_id = b.id
        WHERE bs.user_id = $1 AND bs.status = 'PENDING_PAYMENT' AND b.status = 'APPROVED'
        ${roomFilter}
      `;
      
      const pendingResult = await client.query(pendingQuery, params);
      const pendingStats = pendingResult.rows[0];
      
      // 获取已支付账单数量和总金额
      const paidQuery = `
        SELECT COUNT(*) as count, COALESCE(SUM(bs.amount), 0) as total_amount
        FROM bill_splits bs
        JOIN bills b ON bs.bill_id = b.id
        WHERE bs.user_id = $1 AND bs.status = 'PAID'
        ${roomFilter}
      `;
      
      const paidResult = await client.query(paidQuery, params);
      const paidStats = paidResult.rows[0];
      
      // 获取最近7天的账单趋势
      const trendQuery = `
        SELECT 
          DATE_TRUNC('day', b.created_at) as date,
          COUNT(*) as count,
          COALESCE(SUM(b.total_amount), 0) as total_amount
        FROM bill_splits bs
        JOIN bills b ON bs.bill_id = b.id
        WHERE bs.user_id = $1 AND b.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ${roomFilter}
        GROUP BY DATE_TRUNC('day', b.created_at)
        ORDER BY date
      `;
      
      const trendResult = await client.query(trendQuery, params);
      const trendData = trendResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          pending: {
            count: parseInt(pendingStats.count),
            total_amount: parseFloat(pendingStats.total_amount)
          },
          paid: {
            count: parseInt(paidStats.count),
            total_amount: parseFloat(paidStats.total_amount)
          },
          trend: trendData
        }
      });
    } catch (error) {
      logger.error('获取用户账单统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户账单统计失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 上传收据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  uploadReceipt = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '未上传文件' });
      }
    
      // 构建文件访问URL
      const fileUrl = `/uploads/receipts/${req.file.filename}`;
      
      // 记录上传日志
      logger.info(`用户 ${req.user.id} 上传收据: ${req.file.originalname} -> ${fileUrl}`);
      
      return res.status(200).json({
        success: true,
        message: '收据上传成功',
        data: {
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size
        }
      });
    } catch (error) {
      logger.error('上传收据失败:', error);
      return res.status(500).json({
        success: false,
        message: '上传收据失败',
        error: error.message
      });
    }
  }
}

module.exports = new BillController();