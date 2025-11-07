const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { authenticateToken, requireRole } = require('../middleware/auth-middleware');
const fs = require('fs');
const path = require('path');

/**
 * 账单控制器
 * 处理账单生成、审核和支付相关操作
 */
class BillController {
  constructor() {
    this.pool = pool;
    // 绑定所有方法到实例
    this.createBill = this.createBill.bind(this);
    this.getBills = this.getBills.bind(this);
    this.getBillById = this.getBillById.bind(this);
    this.updateBill = this.updateBill.bind(this);
    this.deleteBill = this.deleteBill.bind(this);
    this.reviewBill = this.reviewBill.bind(this);
    this.confirmBillPayment = this.confirmBillPayment.bind(this);
    this.getUserBillStats = this.getUserBillStats.bind(this);
    this.uploadReceipt = this.uploadReceipt.bind(this);
    this.recalculateBillSplit = this.recalculateBillSplit.bind(this);
    this.recordSettlement = this.recordSettlement.bind(this);
    this.getBillSettlements = this.getBillSettlements.bind(this);
    this.getRoomBillStats = this.getRoomBillStats.bind(this);
    this.getBillStatsByDateRange = this.getBillStatsByDateRange.bind(this);
    // 新增：评论与分享方法绑定
    this.addBillComment = this.addBillComment.bind(this);
    this.getBillComments = this.getBillComments.bind(this);
    this.createBillShare = this.createBillShare.bind(this);
    this.getBillByShareCode = this.getBillByShareCode.bind(this);
  }

  /**
   * 创建账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createBill(req, res) {
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
      
      // 记录请求信息
      logger.info(`创建账单请求 - 用户ID: ${user_id}, 房间ID: ${room_id}, 标题: ${title}, 金额: ${total_amount}, 分摊类型: ${split_type}`);
      
      // 验证必填字段
      if (!title || !total_amount || !room_id || !due_date) {
        return res.status(400).json({
          success: false,
          message: '标题、金额、房间ID和到期日期为必填项'
        });
      }
      
      // 验证金额格式
      if (isNaN(total_amount) || parseFloat(total_amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: '金额必须是大于0的数字'
        });
      }
      
      // 验证分摊类型
      if (!['EQUAL', 'CUSTOM', 'PERCENTAGE'].includes(split_type)) {
        return res.status(400).json({
          success: false,
          message: '分摊类型必须是 EQUAL、CUSTOM 或 PERCENTAGE'
        });
      }
      
      // 验证日期格式
      const dueDateObj = new Date(due_date);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: '到期日期格式无效'
        });
      }
      
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
      
      // 验证百分比分摊详情
      if (split_type === 'PERCENTAGE' && split_details.length > 0) {
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
        
        // 验证百分比总和是否等于100%
        const percentageTotal = split_details.reduce((sum, detail) => sum + parseFloat(detail.amount), 0);
        if (Math.abs(percentageTotal - 100) > 0.01) {
          return res.status(400).json({
            success: false,
            message: '百分比总和必须等于100%'
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
      
      // 获取房间所有成员
      const membersQuery = await client.query(
        'SELECT rm.user_id, u.username FROM room_members rm JOIN users u ON rm.user_id = u.id WHERE rm.room_id = $1',
        [room_id]
      );
      
      const members = membersQuery.rows;
      const memberCount = members.length;
      
      logger.info(`房间 ${room_id} 成员数量: ${memberCount}`);
      
      // 验证房间是否有成员
      if (memberCount === 0) {
        return res.status(400).json({
          success: false,
          message: '该房间没有成员，无法创建账单'
        });
      }
      
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
  async getBills(req, res) {
    const client = await pool.connect();
    try {
      const user_id = (req.user && (req.user.sub || req.user.id)) || null;
      if (!user_id) {
        return res.status(401).json({ success: false, message: '未认证的用户' });
      }
      const { 
        room_id, 
        status, 
        category, 
        start_date, 
        end_date,
        min_amount,
        max_amount,
        page = 1, 
        limit = 10 
      } = req.query;
      
      // 简化：直接从 bills 表读取核心字段，并通过 room_members 约束用户可见范围
      let query = `
        SELECT b.id, b.title, b.amount, b.category, b.due_date, b.status, b.created_at, b.updated_at, b.room_id,
               u.username as creator_name, r.name as room_name
        FROM bills b
        JOIN users u ON b.created_by = u.id
        JOIN rooms r ON b.room_id = r.id
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1
      `;
      
      const params = [user_id];
      let paramIndex = 2;
      
      // 添加筛选条件
      if (room_id) {
        query += ` AND b.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      if (status) {
        // map frontend 'pending' to db 'open', 'completed' to 'settled' etc.
        const statusMap = { pending: 'open', approved: 'open', completed: 'settled', canceled: 'canceled', settling: 'settling', open: 'open' };
        const dbStatus = statusMap[status.toLowerCase?.() ? status.toLowerCase() : status] || status;
        query += ` AND b.status = $${paramIndex++}`;
        params.push(dbStatus);
      }
      
      if (category) {
        query += ` AND b.category = $${paramIndex++}`;
        params.push(category);
      }
      
      if (start_date) {
        query += ` AND b.due_date >= $${paramIndex++}`;
        params.push(start_date);
      }
      
      if (end_date) {
        query += ` AND b.due_date <= $${paramIndex++}`;
        params.push(end_date);
      }
      
      if (min_amount) {
        query += ` AND b.amount >= $${paramIndex++}`;
        params.push(min_amount);
      }
      
      if (max_amount) {
        query += ` AND b.amount <= $${paramIndex++}`;
        params.push(max_amount);
      }
      
      // 默认按创建时间倒序排列
      query += ` ORDER BY b.created_at DESC`;
      
      // 分页
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // 获取总数（使用相同的筛选条件）
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
      
      if (start_date) {
        countQuery += ` AND b.due_date >= $${countParamIndex++}`;
        countParams.push(start_date);
      }
      
      if (end_date) {
        countQuery += ` AND b.due_date <= $${countParamIndex++}`;
        countParams.push(end_date);
      }
      
      if (min_amount) {
        countQuery += ` AND b.total_amount >= $${countParamIndex++}`;
        countParams.push(min_amount);
      }
      
      if (max_amount) {
        countQuery += ` AND b.total_amount <= $${countParamIndex++}`;
        countParams.push(max_amount);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      // 获取每个账单的分摊信息
      const billsWithSplits = await Promise.all(
        result.rows.map(async (bill) => {
          const splitsQuery = `
            SELECT bp.*, u.username as user_name
            FROM bill_participants bp
            JOIN users u ON bp.user_id = u.id
            WHERE bp.bill_id = $1
          `;
          
          const splitsResult = await client.query(splitsQuery, [bill.id]);
          bill.participants = splitsResult.rows;
          
          // 计算支付状态（基于 bill_participants.paid_status）
          const totalSplits = splitsResult.rows.length;
          const paidSplits = splitsResult.rows.filter(s => s.paid_status === 'confirmed').length;
          
          if (totalSplits === paidSplits && totalSplits > 0) {
            bill.payment_status = 'paid';
          } else if (paidSplits > 0) {
            bill.payment_status = 'partial';
          } else {
            bill.payment_status = 'pending';
          }
          
          // 检查是否逾期
          const dueDate = new Date(bill.due_date);
          const today = new Date();
          if (dueDate < today && bill.payment_status !== 'paid' && bill.status === 'open') {
            bill.status = 'open';
          }
          
          return bill;
        })
      );
      
      res.status(200).json({
        success: true,
        data: {
          bills: billsWithSplits,
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
  async getBillById(req, res) {
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
  async updateBill(req, res) {
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
  async deleteBill(req, res) {
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
  async reviewBill(req, res) {
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
  async confirmBillPayment(req, res) {
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
      
      // 创建支付记录
      const paymentRecordQuery = `
        INSERT INTO payments (bill_id, user_id, payer_id, amount, payment_method, payment_time, status)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'completed')
        RETURNING id
      `;
      
      const paymentResult = await client.query(paymentRecordQuery, [
        id, 
        user_id,
        user_id, // payer_id与user_id相同，表示用户自己支付
        split.amount, 
        'ONLINE' // 默认支付方式，可根据实际情况调整
      ]);
      
      const paymentId = paymentResult.rows[0].id;
      
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
  async getUserBillStats(req, res) {
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
   * 上传账单收据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async uploadReceipt(req, res) {
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

  /**
   * 重新计算账单分摊
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async recalculateBillSplit(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // 账单ID
      const { split_type, custom_splits } = req.body; // 分摊类型和自定义分摊
      const user_id = req.user.id;
      
      // 验证用户是否有权限修改该账单的分摊（寝室管理员或账单创建者）
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
          message: '您没有权限修改该账单的分摊'
        });
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有寝室管理员或账单创建者可以修改分摊
      if (memberRole !== 'admin' && bill.created_by !== user_id) {
        return res.status(403).json({
          success: false,
          message: '只有寝室管理员或账单创建者可以修改分摊'
        });
      }
      
      // 只有PENDING或APPROVED状态的账单可以修改分摊
      if (bill.status !== 'PENDING' && bill.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: '只有待审核或已审核状态的账单可以修改分摊'
        });
      }
      
      // 获取寝室所有成员
      const membersQuery = await client.query(
        `SELECT user_id, username FROM room_members WHERE room_id = $1 AND status = 'active'`,
        [bill.room_id]
      );
      
      const members = membersQuery.rows;
      
      // 开始事务
      await client.query('BEGIN');
      
      // 删除现有的分摊记录
      await client.query(
        `DELETE FROM bill_splits WHERE bill_id = $1`,
        [id]
      );
      
      // 根据分摊类型计算新的分摊
      let splits = [];
      
      if (split_type === 'EQUAL') {
        // 平均分摊
        const amountPerPerson = bill.total_amount / members.length;
        splits = members.map(member => ({
          user_id: member.user_id,
          amount: amountPerPerson
        }));
      } else if (split_type === 'PERCENTAGE') {
        // 百分比分摊
        if (!custom_splits || custom_splits.length !== members.length) {
          throw new Error('百分比分摊需要为每个成员指定百分比');
        }
        
        const totalPercentage = custom_splits.reduce((sum, split) => sum + parseFloat(split.percentage), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error('百分比总和必须等于100%');
        }
        
        splits = custom_splits.map(split => ({
          user_id: split.user_id,
          amount: (parseFloat(split.percentage) / 100) * bill.total_amount
        }));
      } else if (split_type === 'CUSTOM') {
        // 自定义金额分摊
        if (!custom_splits || custom_splits.length !== members.length) {
          throw new Error('自定义分摊需要为每个成员指定金额');
        }
        
        const totalAmount = custom_splits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
        if (Math.abs(totalAmount - bill.total_amount) > 0.01) {
          throw new Error('分摊金额总和必须等于账单总金额');
        }
        
        splits = custom_splits.map(split => ({
          user_id: split.user_id,
          amount: parseFloat(split.amount)
        }));
      } else {
        throw new Error('无效的分摊类型');
      }
      
      // 插入新的分摊记录
      for (const split of splits) {
        await client.query(
          `INSERT INTO bill_splits (bill_id, user_id, amount, status)
           VALUES ($1, $2, $3, $4)`,
          [id, split.user_id, split.amount, bill.status === 'APPROVED' ? 'PENDING_PAYMENT' : 'PENDING']
        );
      }
      
      // 更新账单的分摊类型
      await client.query(
        `UPDATE bills
         SET split_type = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [split_type, id]
      );
      
      await client.query('COMMIT');
      
      logger.info(`账单分摊重新计算成功: 账单ID ${id}, 分摊类型: ${split_type}`);
      
      // 获取更新后的分摊信息
      const updatedSplitsQuery = await client.query(
        `SELECT bs.*, u.username
         FROM bill_splits bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.bill_id = $1`,
        [id]
      );
      
      res.status(200).json({
        success: true,
        data: {
          message: '账单分摊重新计算成功',
          splits: updatedSplitsQuery.rows
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('重新计算账单分摊失败:', error);
      res.status(500).json({
        success: false,
        message: '重新计算账单分摊失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 记录结算
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async recordSettlement(req, res) {
    const client = await pool.connect();
    try {
      const { bill_id } = req.params;
      const { from_user_id, to_user_id, amount, note } = req.body;
      const user_id = req.user.id;
      
      // 验证用户是否有权限记录还款（还款人本人）
      if (from_user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: '您只能记录自己的还款'
        });
      }
      
      // 验证账单存在且已审核通过
      const billCheck = await client.query(
        `SELECT * FROM bills WHERE id = $1 AND status = 'APPROVED'`,
        [bill_id]
      );
      
      if (billCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '账单不存在或未审核通过'
        });
      }
      
      // 验证还款人和收款人都有该账单的分摊记录
      const splitsCheck = await client.query(
        `SELECT * FROM bill_splits 
         WHERE bill_id = $1 AND user_id IN ($2, $3)`,
        [bill_id, from_user_id, to_user_id]
      );
      
      if (splitsCheck.rows.length < 2) {
        return res.status(400).json({
          success: false,
          message: '还款人或收款人没有该账单的分摊记录'
        });
      }
      
      // 验证还款金额
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: '还款金额必须大于0'
        });
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 创建还款记录
      await client.query(
        `INSERT INTO bill_settlements (bill_id, from_user_id, to_user_id, amount, note, settlement_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [bill_id, from_user_id, to_user_id, amount, note]
      );
      
      // 创建支付转账记录
      await client.query(
        `INSERT INTO payment_transfers (bill_id, from_user_id, to_user_id, amount, transfer_date, status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'completed')`,
        [bill_id, from_user_id, to_user_id, amount]
      );
      
      await client.query('COMMIT');
      
      logger.info(`还款记录创建成功: 账单ID ${bill_id}, 从用户 ${from_user_id} 到用户 ${to_user_id}, 金额 ${amount}`);
      
      res.status(200).json({
        success: true,
        data: {
          message: '还款记录创建成功'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('记录还款失败:', error);
      res.status(500).json({
        success: false,
        message: '记录还款失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单结算记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getBillSettlements(req, res) {
    const client = await pool.connect();
    try {
      const { bill_id } = req.params;
      const user_id = req.user.id;
      
      // 验证用户是否有权限查看该账单的结算记录（寝室成员）
      const permissionCheck = await client.query(
        `SELECT 1 FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [bill_id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看该账单的结算记录'
        });
      }
      
      // 获取结算记录
      const settlementsQuery = await client.query(
        `SELECT bs.*, 
                from_user.username as from_username,
                to_user.username as to_username
         FROM bill_settlements bs
         JOIN users from_user ON bs.from_user_id = from_user.id
         JOIN users to_user ON bs.to_user_id = to_user.id
         WHERE bs.bill_id = $1
         ORDER BY bs.settlement_date DESC`,
        [bill_id]
      );
      
      res.status(200).json({
        success: true,
        data: {
          settlements: settlementsQuery.rows
        }
      });
    } catch (error) {
      logger.error('获取账单结算记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单结算记录失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取寝室账单统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoomBillStats(req, res) {
    const client = await pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id } = req.query;
      
      // 验证用户是否有权限查看该寝室的统计（寝室成员）
      let roomFilter = '';
      const params = [user_id];
      let paramIndex = 2;
      
      if (room_id) {
        roomFilter = `AND rm.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      // 获取用户所在的寝室
      const roomQuery = `
        SELECT rm.room_id, r.name as room_name
        FROM room_members rm
        JOIN rooms r ON rm.room_id = r.id
        WHERE rm.user_id = $1 AND rm.status = 'active'
        ${roomFilter}
      `;
      
      const roomResult = await client.query(roomQuery, params);
      
      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到您所在的寝室'
        });
      }
      
      const room = roomResult.rows[0];
      const targetRoomId = room.room_id;
      
      // 获取寝室总账单统计
      const overallStatsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_bills,
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_bills,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_bills,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_bills
        FROM bills
        WHERE room_id = $1
      `;
      
      const overallStatsResult = await client.query(overallStatsQuery, [targetRoomId]);
      const overallStats = overallStatsResult.rows[0];
      
      // 获取寝室成员的账单统计
      const memberStatsQuery = `
        SELECT 
          u.id as user_id,
          u.username,
          COUNT(bs.bill_id) as total_bills,
          COALESCE(SUM(bs.amount), 0) as total_amount,
          COUNT(CASE WHEN bs.status = 'PENDING_PAYMENT' THEN 1 END) as pending_bills,
          COALESCE(SUM(CASE WHEN bs.status = 'PENDING_PAYMENT' THEN bs.amount ELSE 0 END), 0) as pending_amount,
          COUNT(CASE WHEN bs.status = 'PAID' THEN 1 END) as paid_bills,
          COALESCE(SUM(CASE WHEN bs.status = 'PAID' THEN bs.amount ELSE 0 END), 0) as paid_amount
        FROM users u
        JOIN room_members rm ON u.id = rm.user_id
        LEFT JOIN bill_splits bs ON u.id = bs.user_id
        LEFT JOIN bills b ON bs.bill_id = b.id
        WHERE rm.room_id = $1 AND rm.status = 'active'
        GROUP BY u.id, u.username
        ORDER BY u.username
      `;
      
      const memberStatsResult = await client.query(memberStatsQuery, [targetRoomId]);
      const memberStats = memberStatsResult.rows;
      
      // 获取最近6个月的账单趋势
      const trendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM bills
        WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const trendResult = await client.query(trendQuery, [targetRoomId]);
      const trendData = trendResult.rows;
      
      // 获取分类统计
      const categoryStatsQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM bills
        WHERE room_id = $1
        GROUP BY category
        ORDER BY total_amount DESC
      `;
      
      const categoryStatsResult = await client.query(categoryStatsQuery, [targetRoomId]);
      const categoryStats = categoryStatsResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          room: {
            id: targetRoomId,
            name: room.room_name
          },
          overall: {
            total_bills: parseInt(overallStats.total_bills),
            total_amount: parseFloat(overallStats.total_amount),
            pending_bills: parseInt(overallStats.pending_bills),
            approved_bills: parseInt(overallStats.approved_bills),
            completed_bills: parseInt(overallStats.completed_bills),
            rejected_bills: parseInt(overallStats.rejected_bills)
          },
          members: memberStats.map(member => ({
            user_id: member.user_id,
            username: member.username,
            total_bills: parseInt(member.total_bills),
            total_amount: parseFloat(member.total_amount),
            pending_bills: parseInt(member.pending_bills),
            pending_amount: parseFloat(member.pending_amount),
            paid_bills: parseInt(member.paid_bills),
            paid_amount: parseFloat(member.paid_amount)
          })),
          trend: trendData,
          categories: categoryStats
        }
      });
    } catch (error) {
      logger.error('获取寝室账单统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取寝室账单统计失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取时间范围内的账单统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getBillStatsByDateRange(req, res) {
    const client = await pool.connect();
    try {
      const user_id = req.user.id;
      const { start_date, end_date, room_id, group_by } = req.query;
      
      // 验证日期格式
      const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = end_date ? new Date(end_date) : new Date();
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: '日期格式无效'
        });
      }
      
      // 验证用户是否有权限查看该寝室的统计（寝室成员）
      let roomFilter = '';
      const params = [user_id, startDate, endDate];
      let paramIndex = 4;
      
      if (room_id) {
        roomFilter = `AND b.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      // 获取用户所在的寝室
      const roomQuery = `
        SELECT rm.room_id
        FROM room_members rm
        WHERE rm.user_id = $1 AND rm.status = 'active'
        ${room_id ? `AND rm.room_id = $${paramIndex - 1}` : ''}
      `;
      
      const roomResult = await client.query(roomQuery, params);
      
      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到您所在的寝室'
        });
      }
      
      // 获取账单统计
      let groupByClause = 'DATE_TRUNC(\'day\', b.created_at)';
      if (group_by === 'week') {
        groupByClause = 'DATE_TRUNC(\'week\', b.created_at)';
      } else if (group_by === 'month') {
        groupByClause = 'DATE_TRUNC(\'month\', b.created_at)';
      }
      
      const statsQuery = `
        SELECT 
          ${groupByClause} as period,
          COUNT(*) as count,
          COALESCE(SUM(b.total_amount), 0) as total_amount,
          COUNT(CASE WHEN b.status = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN b.status = 'APPROVED' THEN 1 END) as approved_count,
          COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) as completed_count,
          COUNT(CASE WHEN b.status = 'REJECTED' THEN 1 END) as rejected_count
        FROM bills b
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1 AND b.created_at BETWEEN $2 AND $3
        ${roomFilter}
        GROUP BY ${groupByClause}
        ORDER BY period
      `;
      
      const statsResult = await client.query(statsQuery, params);
      const statsData = statsResult.rows;
      
      // 获取分类统计
      const categoryStatsQuery = `
        SELECT 
          b.category,
          COUNT(*) as count,
          COALESCE(SUM(b.total_amount), 0) as total_amount
        FROM bills b
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1 AND b.created_at BETWEEN $2 AND $3
        ${roomFilter}
        GROUP BY b.category
        ORDER BY total_amount DESC
      `;
      
      const categoryStatsResult = await client.query(categoryStatsQuery, params);
      const categoryStats = categoryStatsResult.rows;
      
      // 获取用户账单统计
      const userStatsQuery = `
        SELECT 
          u.id as user_id,
          u.username,
          COUNT(bs.bill_id) as bill_count,
          COALESCE(SUM(bs.amount), 0) as total_amount,
          COUNT(CASE WHEN bs.status = 'PENDING_PAYMENT' THEN 1 END) as pending_count,
          COALESCE(SUM(CASE WHEN bs.status = 'PENDING_PAYMENT' THEN bs.amount ELSE 0 END), 0) as pending_amount,
          COUNT(CASE WHEN bs.status = 'PAID' THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN bs.status = 'PAID' THEN bs.amount ELSE 0 END), 0) as paid_amount
        FROM users u
        JOIN room_members rm ON u.id = rm.user_id
        LEFT JOIN bill_splits bs ON u.id = bs.user_id
        LEFT JOIN bills b ON bs.bill_id = b.id
        WHERE rm.room_id IN (
          SELECT room_id FROM room_members WHERE user_id = $1 AND status = 'active'
        ) AND (b.created_at BETWEEN $2 AND $3 OR b.created_at IS NULL)
        GROUP BY u.id, u.username
        ORDER BY total_amount DESC
      `;
      
      const userStatsResult = await client.query(userStatsQuery, [user_id, startDate, endDate]);
      const userStats = userStatsResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          date_range: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          },
          stats: statsData.map(stat => ({
            period: stat.period,
            count: parseInt(stat.count),
            total_amount: parseFloat(stat.total_amount),
            pending_count: parseInt(stat.pending_count),
            approved_count: parseInt(stat.approved_count),
            completed_count: parseInt(stat.completed_count),
            rejected_count: parseInt(stat.rejected_count)
          })),
          categories: categoryStats,
          users: userStats.map(user => ({
            user_id: user.user_id,
            username: user.username,
            bill_count: parseInt(user.bill_count),
            total_amount: parseFloat(user.total_amount),
            pending_count: parseInt(user.pending_count),
            pending_amount: parseFloat(user.pending_amount),
            paid_count: parseInt(user.paid_count),
            paid_amount: parseFloat(user.paid_amount)
          }))
        }
      });
    } catch (error) {
      logger.error('获取时间范围内账单统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取时间范围内账单统计失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
}

// 账单评论
BillController.prototype.addBillComment = async function addBillComment(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params; // bill_id
    const user_id = req.user.id;
    const { content } = req.body;

    if (!content || content.trim().length < 1) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }

    // 权限：需为房间成员
    const permission = await client.query(
      `SELECT 1 FROM bills b JOIN room_members rm ON b.room_id = rm.room_id WHERE b.id = $1 AND rm.user_id = $2`,
      [id, user_id]
    );
    if (permission.rows.length === 0) {
      return res.status(403).json({ success: false, message: '您无权评论该账单' });
    }

    const insert = await client.query(
      `INSERT INTO bill_comments (bill_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [id, user_id, content.trim()]
    );

    return res.status(201).json({ success: true, data: insert.rows[0] });
  } catch (error) {
    logger.error('添加账单评论失败:', error);
    return res.status(500).json({ success: false, message: '添加账单评论失败', error: error.message });
  } finally {
    client.release();
  }
};

BillController.prototype.getBillComments = async function getBillComments(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params; // bill_id
    const user_id = req.user.id;

    // 权限：需为房间成员
    const permission = await client.query(
      `SELECT 1 FROM bills b JOIN room_members rm ON b.room_id = rm.room_id WHERE b.id = $1 AND rm.user_id = $2`,
      [id, user_id]
    );
    if (permission.rows.length === 0) {
      return res.status(403).json({ success: false, message: '您无权查看该账单评论' });
    }

    const result = await client.query(
      `SELECT bc.*, u.username FROM bill_comments bc JOIN users u ON bc.user_id = u.id WHERE bc.bill_id = $1 ORDER BY bc.created_at DESC`,
      [id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('获取账单评论失败:', error);
    return res.status(500).json({ success: false, message: '获取账单评论失败', error: error.message });
  } finally {
    client.release();
  }
};

// 账单分享
BillController.prototype.createBillShare = async function createBillShare(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params; // bill_id
    const user_id = req.user.id;
    const { expires_in_minutes = 60 } = req.body;

    // 只有账单创建者或房间管理员可生成分享码
    const permission = await client.query(
      `SELECT b.*, rm.role as member_role FROM bills b JOIN room_members rm ON b.room_id = rm.room_id WHERE b.id = $1 AND rm.user_id = $2`,
      [id, user_id]
    );
    if (permission.rows.length === 0) {
      return res.status(403).json({ success: false, message: '您无权分享该账单' });
    }
    const bill = permission.rows[0];
    if (bill.creator_id !== user_id && bill.member_role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅创建者或房间管理员可分享账单' });
    }

    const share_code = Math.random().toString(36).slice(2, 10);
    const expires_at = new Date(Date.now() + expires_in_minutes * 60000);

    const update = await client.query(
      `UPDATE bills SET share_code = $1, share_expires_at = $2, updated_at = now() WHERE id = $3 RETURNING share_code, share_expires_at`,
      [share_code, expires_at, id]
    );

    return res.status(200).json({ success: true, data: update.rows[0] });
  } catch (error) {
    logger.error('创建账单分享失败:', error);
    return res.status(500).json({ success: false, message: '创建账单分享失败', error: error.message });
  } finally {
    client.release();
  }
};

BillController.prototype.getBillByShareCode = async function getBillByShareCode(req, res) {
  const client = await pool.connect();
  try {
    const { code } = req.params;

    const billQuery = await client.query(
      `SELECT b.*, u.username as creator_name, r.name as room_name FROM bills b JOIN users u ON b.creator_id = u.id JOIN rooms r ON b.room_id = r.id WHERE b.share_code = $1 AND (b.share_expires_at IS NULL OR b.share_expires_at > now())`,
      [code]
    );
    if (billQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: '分享链接无效或已过期' });
    }

    const bill = billQuery.rows[0];
    return res.status(200).json({ success: true, data: { bill } });
  } catch (error) {
    logger.error('通过分享码获取账单失败:', error);
    return res.status(500).json({ success: false, message: '通过分享码获取账单失败', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = new BillController();