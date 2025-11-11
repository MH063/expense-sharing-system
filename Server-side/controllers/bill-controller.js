const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { authenticateToken, requireRole } = require('../middleware/auth-middleware');
const { PrecisionCalculator } = require('../services/precision-calculator');
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
        return res.error(400, '标题、金额、房间ID和到期日期为必填项');
      }
      
      // 验证金额格式
      if (isNaN(total_amount) || parseFloat(total_amount) <= 0) {
        return res.error(400, '金额必须是大于0的数字');
      }
      
      // 验证分摊类型
      if (!['EQUAL', 'CUSTOM', 'PERCENTAGE'].includes(split_type)) {
        return res.error(400, '分摊类型必须是 EQUAL、CUSTOM 或 PERCENTAGE');
      }
      
      // 验证日期格式
      const dueDateObj = new Date(due_date);
      if (isNaN(dueDateObj.getTime())) {
        return res.error(400, '到期日期格式无效');
      }
      
      // 验证用户是否为寝室成员
      const memberCheck = await client.query(
        'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
        [room_id, user_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }
      
      // 验证费用记录是否属于该寝室
      if (expense_ids && expense_ids.length > 0) {
        const expenseCheck = await client.query(
          'SELECT COUNT(*) as count FROM expenses WHERE room_id = $1 AND id = ANY($2)',
          [room_id, expense_ids]
        );
        
        if (parseInt(expenseCheck.rows[0].count) !== expense_ids.length) {
          return res.error(400, '部分费用记录不属于该寝室');
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
          return res.error(400, '分摊成员包含非寝室成员');
        }
        
        // 验证分摊金额总和是否等于账单总金额
        const splitTotal = split_details.reduce((sum, detail) => PrecisionCalculator.add(sum, parseFloat(detail.amount)), 0);
        if (Math.abs(PrecisionCalculator.subtract(splitTotal, parseFloat(total_amount))) > 0.01) {
          return res.error(400, '分摊金额总和与账单总金额不匹配');
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
          return res.error(400, '分摊成员包含非寝室成员');
        }
        
        // 验证百分比总和是否等于100%
        const percentageTotal = split_details.reduce((sum, detail) => PrecisionCalculator.add(sum, parseFloat(detail.amount)), 0);
        if (Math.abs(PrecisionCalculator.subtract(percentageTotal, 100)) > 0.01) {
          return res.error(400, '百分比总和必须等于100%');
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
        return res.error(400, '该房间没有成员，无法创建账单');
      }
      
      // 创建账单分摊记录
      if (split_type === 'EQUAL') {
        // 平均分摊 - 使用preciseSplitAmount确保分摊总额与总金额一致
        const sharesArray = members.map(() => 1); // 每人一份
        const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
        
        for (let i = 0; i < members.length; i++) {
          await client.query(
            `INSERT INTO bill_splits (bill_id, user_id, amount, status)
             VALUES ($1, $2, $3, 'PENDING')`,
            [bill.id, members[i].user_id, splitAmounts[i]]
          );
        }
      } else if (split_type === 'CUSTOM') {
        // 自定义分摊
        if (split_details.length > 0) {
          // 使用提供的分摊详情 - 使用preciseSplitAmount确保分摊总额与总金额一致
          const amounts = split_details.map(detail => parseFloat(detail.amount));
          const totalSplitAmount = amounts.reduce((sum, amount) => PrecisionCalculator.add(sum, amount), 0);
          
          // 如果分摊总额与总金额不一致，按比例调整
          if (!PrecisionCalculator.equals(totalSplitAmount, parseFloat(total_amount))) {
            const sharesArray = amounts.map(amount => 
              PrecisionCalculator.divide(amount, totalSplitAmount)
            );
            const adjustedAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
            
            for (let i = 0; i < split_details.length; i++) {
              await client.query(
                `INSERT INTO bill_splits (bill_id, user_id, amount, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
                [bill.id, split_details[i].user_id, adjustedAmounts[i]]
              );
            }
          } else {
            // 分摊总额与总金额一致，直接使用
            for (const detail of split_details) {
              await client.query(
                `INSERT INTO bill_splits (bill_id, user_id, amount, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
                [bill.id, detail.user_id, detail.amount]
              );
            }
          }
        } else {
          // 如果没有提供分摊详情，默认平均分摊 - 使用preciseSplitAmount确保分摊总额与总金额一致
          const sharesArray = members.map(() => 1); // 每人一份
          const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
          
          for (let i = 0; i < members.length; i++) {
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, members[i].user_id, splitAmounts[i]]
            );
          }
        }
      } else if (split_type === 'PERCENTAGE') {
        // 百分比分摊 - 使用preciseSplitAmount确保分摊总额与总金额一致
        if (split_details.length > 0) {
          // 使用提供的分摊详情
          const percentages = split_details.map(detail => parseFloat(detail.amount));
          const totalPercentage = percentages.reduce((sum, percentage) => PrecisionCalculator.add(sum, percentage), 0);
          
          // 确保百分比总和为100%
          if (!PrecisionCalculator.equals(totalPercentage, 100)) {
            // 按比例调整百分比，使总和为100%
            const adjustedPercentages = PrecisionCalculator.preciseSplitAmount(100, percentages);
            
            for (let i = 0; i < split_details.length; i++) {
              const amount = PrecisionCalculator.divide(
                PrecisionCalculator.multiply(adjustedPercentages[i], parseFloat(total_amount)), 
                100
              );
              await client.query(
                `INSERT INTO bill_splits (bill_id, user_id, amount, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
                [bill.id, split_details[i].user_id, amount]
              );
            }
          } else {
            // 百分比总和为100%，直接计算金额
            const sharesArray = percentages.map(percentage => 
              PrecisionCalculator.divide(percentage, 100)
            );
            const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
            
            for (let i = 0; i < split_details.length; i++) {
              await client.query(
                `INSERT INTO bill_splits (bill_id, user_id, amount, status)
                 VALUES ($1, $2, $3, 'PENDING')`,
                [bill.id, split_details[i].user_id, splitAmounts[i]]
              );
            }
          }
        } else {
          // 如果没有提供分摊详情，默认平均分摊 - 使用preciseSplitAmount确保分摊总额与总金额一致
          const sharesArray = members.map(() => 1); // 每人一份
          const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
          
          for (let i = 0; i < members.length; i++) {
            await client.query(
              `INSERT INTO bill_splits (bill_id, user_id, amount, status)
               VALUES ($1, $2, $3, 'PENDING')`,
              [bill.id, members[i].user_id, splitAmounts[i]]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单创建成功: ${bill.id}, 创建者: ${user_id}, 寝室: ${room_id}`);
      
      res.success(201, '账单创建成功', { bill });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建账单失败:', error);
      res.error(500, '创建账单失败', error.message);
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
        return res.error(401, '未认证的用户');
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
        JOIN users u ON b.creator_id = u.id
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
      
      // 批量获取所有账单的分摊信息，避免N+1查询问题
      const billIds = result.rows.map(bill => bill.id);
      let splitsQuery = `
        SELECT bp.*, u.username as user_name, bp.bill_id
        FROM bill_participants bp
        JOIN users u ON bp.user_id = u.id
        WHERE bp.bill_id = ANY($1)
      `;
      
      const splitsResult = await client.query(splitsQuery, [billIds]);
      
      // 将分摊信息按账单ID分组
      const splitsByBillId = {};
      splitsResult.rows.forEach(split => {
        if (!splitsByBillId[split.bill_id]) {
          splitsByBillId[split.bill_id] = [];
        }
        splitsByBillId[split.bill_id].push(split);
      });
      
      // 为每个账单添加分摊信息和支付状态
      const billsWithSplits = result.rows.map(bill => {
        const splits = splitsByBillId[bill.id] || [];
        bill.participants = splits;
        
        // 计算支付状态（基于 bill_participants.paid_status）
        const totalSplits = splits.length;
        const paidSplits = splits.filter(s => s.paid_status === 'confirmed').length;
        
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
          bill.status = 'overdue';
        }
        
        return bill;
      });
      
      res.success(200, '获取账单列表成功', {
        bills: billsWithSplits,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取账单列表失败:', error);
      res.error(500, '获取账单列表失败', error.message);
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
        return res.error(403, '您没有权限查看该账单');
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
      
      res.success(200, '获取账单详情成功', { bill });
    } catch (error) {
      logger.error('获取账单详情失败:', error);
      res.error(500, '获取账单详情失败', error.message);
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
        // 获取寝室成员
        const membersQuery = `
          SELECT user_id
          FROM room_members
          WHERE room_id = $1
        `;
        
        const membersResult = await client.query(membersQuery, [bill.room_id]);
        const members = membersResult.rows;
        
        // 使用尾差处理机制重新计算分摊金额
        const sharesArray = members.map(() => 1); // 每人一份
        const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(total_amount), sharesArray);
        
        // 更新每个成员的分摊金额
        for (let i = 0; i < members.length; i++) {
          await client.query(
            `UPDATE bill_splits
             SET amount = $1
             WHERE bill_id = $2 AND user_id = $3`,
            [splitAmounts[i], id, members[i].user_id]
          );
        }
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单更新成功: ${id}, 更新者: ${user_id}`);
      
      res.success(200, '账单更新成功', { bill: updatedBill });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('更新账单失败:', error);
      res.error(500, '更新账单失败', error.message);
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
        return res.error(403, '您没有权限删除该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以删除账单
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有创建者或寝室管理员可以删除账单');
      }
      
      // 只有PENDING状态的账单可以删除
      if (bill.status !== 'PENDING') {
        return res.error(400, '只有待审核状态的账单可以删除');
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
      
      res.success(200, '账单删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('删除账单失败:', error);
      res.error(500, '删除账单失败', error.message);
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
        return res.error(403, '您没有权限审核该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有寝室管理员可以审核账单
      if (memberRole !== 'admin') {
        return res.error(403, '只有寝室管理员可以审核账单');
      }
      
      // 只有PENDING状态的账单可以审核
      if (bill.status !== 'PENDING') {
        return res.error(400, '只有待审核状态的账单可以审核');
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
      
      res.success(200, `账单${action === 'APPROVE' ? '通过' : '拒绝'}审核`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('审核账单失败:', error);
      res.error(500, '审核账单失败', error.message);
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
        return res.error(403, '您没有该账单的分摊记录');
      }
      
      const split = splitCheck.rows[0];
      const billStatus = split.bill_status;
      
      // 只有已审核通过的账单可以支付
      if (billStatus !== 'APPROVED') {
        return res.error(400, '只有已审核通过的账单可以支付');
      }
      
      // 只有待支付状态的分摊可以确认支付
      if (split.status !== 'PENDING_PAYMENT') {
        return res.error(400, '该分摊已支付或状态不正确');
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
      
      res.success(200, '支付确认成功');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('确认账单支付失败:', error);
      res.error(500, '确认账单支付失败', error.message);
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
      
      res.success(200, '获取用户账单统计成功', {
        pending: {
          count: parseInt(pendingStats.count),
          total_amount: PrecisionCalculator.round(parseFloat(pendingStats.total_amount), 2)
        },
        paid: {
          count: parseInt(paidStats.count),
          total_amount: PrecisionCalculator.round(parseFloat(paidStats.total_amount), 2)
        },
        trend: trendData
      });
    } catch (error) {
      logger.error('获取用户账单统计失败:', error);
      res.error(500, '获取用户账单统计失败', error.message);
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
        return res.error(400, '未上传文件');
      }
    
      // 构建文件访问URL
      const fileUrl = `/uploads/receipts/${req.file.filename}`;
      
      // 记录上传日志
      logger.info(`用户 ${req.user.id} 上传收据: ${req.file.originalname} -> ${fileUrl}`);
      
      return res.success(200, '收据上传成功', {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
    } catch (error) {
      logger.error('上传收据失败:', error);
      return res.error(500, '上传收据失败', error.message);
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
        return res.error(403, '您没有权限修改该账单的分摊');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有寝室管理员或账单创建者可以修改分摊
      if (memberRole !== 'admin' && bill.creator_id !== user_id) {
        return res.error(403, '只有寝室管理员或账单创建者可以修改分摊');
      }
      
      // 只有PENDING或APPROVED状态的账单可以修改分摊
      if (bill.status !== 'PENDING' && bill.status !== 'APPROVED') {
        return res.error(400, '只有待审核或已审核状态的账单可以修改分摊');
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
        // 平均分摊 - 使用尾差处理机制确保分摊总额等于账单总金额
        const sharesArray = members.map(() => 1); // 每人一份
        const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(bill.total_amount), sharesArray);
        splits = members.map((member, index) => ({
          user_id: member.user_id,
          amount: splitAmounts[index]
        }));
      } else if (split_type === 'PERCENTAGE') {
        // 百分比分摊 - 使用尾差处理机制确保分摊总额等于账单总金额
        if (!custom_splits || custom_splits.length !== members.length) {
          throw new Error('百分比分摊需要为每个成员指定百分比');
        }
        
        // 验证百分比总和
        let totalPercentage = custom_splits.reduce((sum, split) => PrecisionCalculator.add(sum, parseFloat(split.percentage)), 0);
        
        // 如果百分比总和不为100%，按比例调整
        if (Math.abs(PrecisionCalculator.subtract(totalPercentage, 100)) > 0.01) {
          // 按比例调整每个百分比
          custom_splits = custom_splits.map(split => ({
            ...split,
            percentage: PrecisionCalculator.divide(PrecisionCalculator.multiply(parseFloat(split.percentage), 100), totalPercentage)
          }));
        }
        
        // 计算分摊金额
        const sharesArray = custom_splits.map(split => parseFloat(split.percentage));
        const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(bill.total_amount), sharesArray);
        
        splits = custom_splits.map((split, index) => ({
          user_id: split.user_id,
          amount: splitAmounts[index]
        }));
      } else if (split_type === 'CUSTOM') {
        // 自定义金额分摊 - 使用尾差处理机制确保分摊总额等于账单总金额
        if (!custom_splits || custom_splits.length !== members.length) {
          throw new Error('自定义分摊需要为每个成员指定金额');
        }
        
        // 验证分摊金额总和
        const totalAmount = custom_splits.reduce((sum, split) => PrecisionCalculator.add(sum, parseFloat(split.amount)), 0);
        
        // 如果分摊金额总和与账单总金额不一致，按比例调整
        if (Math.abs(PrecisionCalculator.subtract(totalAmount, parseFloat(bill.total_amount))) > 0.01) {
          // 按比例调整每个分摊金额
          const ratio = PrecisionCalculator.divide(parseFloat(bill.total_amount), totalAmount);
          custom_splits = custom_splits.map(split => ({
            ...split,
            amount: PrecisionCalculator.multiply(parseFloat(split.amount), ratio)
          }));
        }
        
        // 使用尾差处理机制确保分摊总额等于账单总金额
        const sharesArray = custom_splits.map(split => parseFloat(split.amount));
        const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(bill.total_amount), sharesArray);
        
        splits = custom_splits.map((split, index) => ({
          user_id: split.user_id,
          amount: splitAmounts[index]
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
      
      res.success(200, '账单分摊重新计算成功', { splits: updatedSplitsQuery.rows });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('重新计算账单分摊失败:', error);
      res.error(500, '重新计算账单分摊失败', error.message);
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
        return res.error(403, '您只能记录自己的还款');
      }
      
      // 验证账单存在且已审核通过
      const billCheck = await client.query(
        `SELECT * FROM bills WHERE id = $1 AND status = 'APPROVED'`,
        [bill_id]
      );
      
      if (billCheck.rows.length === 0) {
        return res.error(404, '账单不存在或未审核通过');
      }
      
      // 验证还款人和收款人都有该账单的分摊记录
      const splitsCheck = await client.query(
        `SELECT * FROM bill_splits 
         WHERE bill_id = $1 AND user_id IN ($2, $3)`,
        [bill_id, from_user_id, to_user_id]
      );
      
      if (splitsCheck.rows.length < 2) {
        return res.error(400, '还款人或收款人没有该账单的分摊记录');
      }
      
      // 验证还款金额
      if (amount <= 0) {
        return res.error(400, '还款金额必须大于0');
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
      
      res.success(200, '还款记录创建成功');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('记录还款失败:', error);
      res.error(500, '记录还款失败', error.message);
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
        return res.error(403, '您没有权限查看该账单的结算记录');
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
      
      res.success(200, '获取账单结算记录成功', { settlements: settlementsQuery.rows });
    } catch (error) {
      logger.error('获取账单结算记录失败:', error);
      res.error(500, '获取账单结算记录失败', error.message);
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
        return res.error(404, '未找到您所在的寝室');
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
      
      res.success(200, '获取寝室账单统计成功', {
        room: {
          id: targetRoomId,
          name: room.room_name
        },
        overall: {
          total_bills: parseInt(overallStats.total_bills),
          total_amount: PrecisionCalculator.round(parseFloat(overallStats.total_amount), 2),
          pending_bills: parseInt(overallStats.pending_bills),
          approved_bills: parseInt(overallStats.approved_bills),
          completed_bills: parseInt(overallStats.completed_bills),
          rejected_bills: parseInt(overallStats.rejected_bills)
        },
        members: memberStats.map(member => ({
          user_id: member.user_id,
          username: member.username,
          total_bills: parseInt(member.total_bills),
          total_amount: PrecisionCalculator.round(parseFloat(member.total_amount), 2),
          pending_bills: parseInt(member.pending_bills),
          pending_amount: PrecisionCalculator.round(parseFloat(member.pending_amount), 2),
          paid_bills: parseInt(member.paid_bills),
          paid_amount: PrecisionCalculator.round(parseFloat(member.paid_amount), 2)
        })),
        trend: trendData,
        categories: categoryStats
      });
    } catch (error) {
      logger.error('获取寝室账单统计失败:', error);
      res.error(500, '获取寝室账单统计失败', error.message);
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
        return res.error(400, '日期格式无效');
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
        return res.error(404, '未找到您所在的寝室');
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
      
      res.success(200, '获取时间范围内账单统计成功', {
        date_range: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        stats: statsData.map(stat => ({
          period: stat.period,
          count: parseInt(stat.count),
          total_amount: PrecisionCalculator.round(parseFloat(stat.total_amount), 2),
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
          total_amount: PrecisionCalculator.round(parseFloat(user.total_amount), 2),
          pending_count: parseInt(user.pending_count),
          pending_amount: PrecisionCalculator.round(parseFloat(user.pending_amount), 2),
          paid_count: parseInt(user.paid_count),
          paid_amount: PrecisionCalculator.round(parseFloat(user.paid_amount), 2)
        }))
      });
    } catch (error) {
      logger.error('获取时间范围内账单统计失败:', error);
      res.error(500, '获取时间范围内账单统计失败', error.message);
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
      return res.error(400, '评论内容不能为空');
    }

    // 权限：需为房间成员
    const permission = await client.query(
      `SELECT 1 FROM bills b JOIN room_members rm ON b.room_id = rm.room_id WHERE b.id = $1 AND rm.user_id = $2`,
      [id, user_id]
    );
    if (permission.rows.length === 0) {
      return res.error(403, '您无权评论该账单');
    }

    const insert = await client.query(
      `INSERT INTO bill_comments (bill_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [id, user_id, content.trim()]
    );

    return res.success(201, '添加账单评论成功', insert.rows[0]);
  } catch (error) {
    logger.error('添加账单评论失败:', error);
    return res.error(500, '添加账单评论失败', error.message);
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
      return res.error(403, '您无权查看该账单评论');
    }

    const result = await client.query(
      `SELECT bc.*, u.username FROM bill_comments bc JOIN users u ON bc.user_id = u.id WHERE bc.bill_id = $1 ORDER BY bc.created_at DESC`,
      [id]
    );

    return res.success(200, '获取账单评论成功', result.rows);
  } catch (error) {
    logger.error('获取账单评论失败:', error);
    return res.error(500, '获取账单评论失败', error.message);
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
      return res.error(403, '您无权分享该账单');
    }
    const bill = permission.rows[0];
    if (bill.creator_id !== user_id && bill.member_role !== 'admin') {
      return res.error(403, '仅创建者或房间管理员可分享账单');
    }

    const share_code = Math.random().toString(36).slice(2, 10);
    const expires_at = new Date(Date.now() + expires_in_minutes * 60000);

    const update = await client.query(
      `UPDATE bills SET share_code = $1, share_expires_at = $2, updated_at = now() WHERE id = $3 RETURNING share_code, share_expires_at`,
      [share_code, expires_at, id]
    );

    return res.success(200, '创建账单分享成功', update.rows[0]);
  } catch (error) {
    logger.error('创建账单分享失败:', error);
    return res.error(500, '创建账单分享失败', error.message);
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
      return res.error(404, '分享链接无效或已过期');
    }

    const bill = billQuery.rows[0];
    return res.success(200, '通过分享码获取账单成功', { bill });
  } catch (error) {
    logger.error('通过分享码获取账单失败:', error);
    return res.error(500, '通过分享码获取账单失败', error.message);
  } finally {
    client.release();
  }
};

BillController.prototype.getBillSplits = async function getBillSplits(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // bill_id
      const user_id = req.user.id;
      
      // 验证用户是否有权限查看该账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限查看该账单');
      }
      
      // 获取账单分摊详情
      const splitsQuery = `
        SELECT bs.*, u.username, u.avatar_url
        FROM bill_splits bs
        JOIN users u ON bs.user_id = u.id
        WHERE bs.bill_id = $1
        ORDER BY bs.created_at
      `;
      
      const splitsResult = await client.query(splitsQuery, [id]);
      
      res.success(200, '获取账单分摊详情成功', { splits: splitsResult.rows });
    } catch (error) {
      logger.error('获取账单分摊详情失败:', error);
      res.error(500, '获取账单分摊详情失败', error.message);
    } finally {
      client.release();
    }
  }

  BillController.prototype.createBillSplit = async function createBillSplit(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // bill_id
      const { user_id, amount, note } = req.body;
      const creator_id = req.user.id;
      
      // 验证必填字段
      if (!user_id || !amount) {
        return res.error(400, '用户ID和金额为必填项');
      }
      
      // 验证金额格式
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.error(400, '金额必须是大于0的数字');
      }
      
      // 验证用户是否有权限操作该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, creator_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限操作该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以创建分摊
      if (bill.creator_id !== creator_id && memberRole !== 'admin') {
        return res.error(403, '只有创建者或寝室管理员可以创建账单分摊');
      }
      
      // 验证分摊用户是否为寝室成员
      const memberCheck = await client.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [bill.room_id, user_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.error(400, '分摊用户不是该寝室的成员');
      }
      
      // 检查是否已存在该用户的分摊记录
      const existingSplit = await client.query(
        'SELECT 1 FROM bill_splits WHERE bill_id = $1 AND user_id = $2',
        [id, user_id]
      );
      
      if (existingSplit.rows.length > 0) {
        return res.error(400, '该用户已存在分摊记录');
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 创建账单分摊记录
      const splitResult = await client.query(
        `INSERT INTO bill_splits (bill_id, user_id, amount, note, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         RETURNING *`,
        [id, user_id, amount, note]
      );
      
      const split = splitResult.rows[0];
      
      // 检查账单是否已全部分摊
      const totalSplitAmount = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM bill_splits WHERE bill_id = $1',
        [id]
      );
      
      const totalAmount = parseFloat(totalSplitAmount.rows[0].total);
      
      // 如果分摊总额等于账单总额，更新账单状态为已分摊
      if (Math.abs(totalAmount - parseFloat(bill.total_amount)) < 0.01) {
        await client.query(
          'UPDATE bills SET status = $1 WHERE id = $2',
          ['SPLIT', id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单分摊创建成功: 账单ID=${id}, 用户ID=${user_id}, 金额=${amount}, 创建者=${creator_id}`);
      
      res.success(201, '账单分摊创建成功', { split });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建账单分摊失败:', error);
      res.error(500, '创建账单分摊失败', error.message);
    } finally {
      client.release();
    }
  }

  BillController.prototype.updateBillSplit = async function updateBillSplit(req, res) {
    const client = await pool.connect();
    try {
      const { id, splitId } = req.params; // bill_id, split_id
      const { amount, note, status } = req.body;
      const user_id = req.user.id;
      
      // 验证金额格式（如果提供）
      if (amount !== undefined && (isNaN(amount) || parseFloat(amount) <= 0)) {
        return res.error(400, '金额必须是大于0的数字');
      }
      
      // 验证用户是否有权限操作该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限操作该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以更新分摊
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有创建者或寝室管理员可以更新账单分摊');
      }
      
      // 验证分摊记录是否存在
      const splitCheck = await client.query(
        'SELECT * FROM bill_splits WHERE id = $1 AND bill_id = $2',
        [splitId, id]
      );
      
      if (splitCheck.rows.length === 0) {
        return res.error(404, '分摊记录不存在');
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 更新账单分摊记录
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`);
        updateValues.push(amount);
      }
      
      if (note !== undefined) {
        updateFields.push(`note = $${paramIndex++}`);
        updateValues.push(note);
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(status);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(splitId, id);
      
      const updateQuery = `
        UPDATE bill_splits
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND bill_id = $${paramIndex++}
        RETURNING *
      `;
      
      const splitResult = await client.query(updateQuery, updateValues);
      const split = splitResult.rows[0];
      
      // 检查账单是否已全部分摊
      const totalSplitAmount = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM bill_splits WHERE bill_id = $1',
        [id]
      );
      
      const totalAmount = parseFloat(totalSplitAmount.rows[0].total);
      
      // 如果分摊总额等于账单总额，更新账单状态为已分摊
      if (Math.abs(totalAmount - parseFloat(bill.total_amount)) < 0.01) {
        await client.query(
          'UPDATE bills SET status = $1 WHERE id = $2',
          ['SPLIT', id]
        );
      } else {
        // 否则更新账单状态为待分摊
        await client.query(
          'UPDATE bills SET status = $1 WHERE id = $2',
          ['PENDING', id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单分摊更新成功: 分摊ID=${splitId}, 账单ID=${id}, 更新者=${user_id}`);
      
      res.success(200, '账单分摊更新成功', { split });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('更新账单分摊失败:', error);
      res.error(500, '更新账单分摊失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 删除账单分摊
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.deleteBillSplit = async function deleteBillSplit(req, res) {
    const client = await pool.connect();
    try {
      const { id, splitId } = req.params; // bill_id, split_id
      const user_id = req.user.id;
      
      // 验证用户是否有权限操作该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限操作该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以删除分摊
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有创建者或寝室管理员可以删除账单分摊');
      }
      
      // 验证分摊记录是否存在
      const splitCheck = await client.query(
        'SELECT 1 FROM bill_splits WHERE id = $1 AND bill_id = $2',
        [splitId, id]
      );
      
      if (splitCheck.rows.length === 0) {
        return res.error(404, '分摊记录不存在');
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 删除账单分摊记录
      await client.query(
        'DELETE FROM bill_splits WHERE id = $1 AND bill_id = $2',
        [splitId, id]
      );
      
      // 更新账单状态为待分摊
      await client.query(
        'UPDATE bills SET status = $1 WHERE id = $2',
        ['PENDING', id]
      );
      
      await client.query('COMMIT');
      
      logger.info(`账单分摊删除成功: 分摊ID=${splitId}, 账单ID=${id}, 删除者=${user_id}`);
      
      res.success(200, '账单分摊删除成功');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('删除账单分摊失败:', error);
      res.error(500, '删除账单分摊失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单结算状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.getBillSettlementStatus = async function getBillSettlementStatus(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // bill_id
      const user_id = req.user.id;
      
      // 验证用户是否有权限查看该账单
      const permissionCheck = await client.query(
        `SELECT 1 FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限查看该账单');
      }
      
      // 获取账单基本信息
      const billQuery = await client.query(
        'SELECT * FROM bills WHERE id = $1',
        [id]
      );
      
      if (billQuery.rows.length === 0) {
        return res.error(404, '账单不存在');
      }
      
      const bill = billQuery.rows[0];
      
      // 获取账单分摊详情
      const splitsQuery = `
        SELECT bs.*, u.username, u.avatar_url
        FROM bill_splits bs
        JOIN users u ON bs.user_id = u.id
        WHERE bs.bill_id = $1
        ORDER BY bs.created_at
      `;
      
      const splitsResult = await client.query(splitsQuery, [id]);
      const splits = splitsResult.rows;
      
      // 获取结算记录
      const settlementsQuery = `
        SELECT bs.*, u.username as payer_name, up.username as payee_name
        FROM bill_settlements bs
        JOIN users u ON bs.payer_id = u.id
        JOIN users up ON bs.payee_id = up.id
        WHERE bs.bill_id = $1
        ORDER BY bs.created_at DESC
      `;
      
      const settlementsResult = await client.query(settlementsQuery, [id]);
      const settlements = settlementsResult.rows;
      
      // 计算结算状态
      const totalSplits = splits.length;
      const paidSplits = splits.filter(s => s.status === 'PAID').length;
      const pendingSplits = totalSplits - paidSplits;
      
      let settlementStatus = 'PENDING';
      if (paidSplits === 0) {
        settlementStatus = 'PENDING';
      } else if (paidSplits === totalSplits) {
        settlementStatus = 'COMPLETED';
      } else {
        settlementStatus = 'PARTIAL';
      }
      
      res.success(200, '获取账单结算状态成功', {
        bill: {
          id: bill.id,
          title: bill.title,
          total_amount: bill.total_amount,
          status: bill.status
        },
        settlement_status: settlementStatus,
        splits: splits,
        settlements: settlements,
        summary: {
          total_splits: totalSplits,
          paid_splits: paidSplits,
          pending_splits: pendingSplits,
          settlement_percentage: totalSplits > 0 ? Math.round((paidSplits / totalSplits) * 100) : 0
        }
      });
    } catch (error) {
      logger.error('获取账单结算状态失败:', error);
      res.error(500, '获取账单结算状态失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 结算账单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.settleBill = async function settleBill(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // bill_id
      const { payer_id, payee_id, amount, note } = req.body;
      const user_id = req.user.id;
      
      // 验证必填字段
      if (!payer_id || !payee_id || !amount) {
        return res.error(400, '付款人、收款人和金额为必填项');
      }
      
      // 验证金额格式
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.error(400, '金额必须是大于0的数字');
      }
      
      // 验证用户是否有权限操作该账单（创建者或寝室管理员）
      const permissionCheck = await client.query(
        `SELECT b.*, rm.role as member_role
         FROM bills b
         JOIN room_members rm ON b.room_id = rm.room_id
         WHERE b.id = $1 AND rm.user_id = $2`,
        [id, user_id]
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您没有权限操作该账单');
      }
      
      const bill = permissionCheck.rows[0];
      const memberRole = bill.member_role;
      
      // 只有创建者或寝室管理员可以结算账单
      if (bill.creator_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有创建者或寝室管理员可以结算账单');
      }
      
      // 验证付款人和收款人是否为寝室成员
      const memberCheck = await client.query(
        'SELECT user_id FROM room_members WHERE room_id = $1 AND user_id = ANY($2)',
        [bill.room_id, [payer_id, payee_id]]
      );
      
      if (memberCheck.rows.length !== 2) {
        return res.error(400, '付款人或收款人不是该寝室的成员');
      }
      
      // 验证付款人的分摊记录是否存在且未支付
      const splitCheck = await client.query(
        'SELECT * FROM bill_splits WHERE bill_id = $1 AND user_id = $2',
        [id, payer_id]
      );
      
      if (splitCheck.rows.length === 0) {
        return res.error(400, '付款人没有该账单的分摊记录');
      }
      
      const split = splitCheck.rows[0];
      
      if (split.status === 'PAID') {
        return res.error(400, '付款人已支付该账单');
      }
      
      // 验证支付金额是否超过分摊金额
      if (parseFloat(amount) > parseFloat(split.amount)) {
        return res.error(400, '支付金额不能超过分摊金额');
      }
      
      // 开始事务
      await client.query('BEGIN');
      
      // 创建结算记录
      const settlementResult = await client.query(
        `INSERT INTO bill_settlements (bill_id, payer_id, payee_id, amount, note, status)
         VALUES ($1, $2, $3, $4, $5, 'COMPLETED')
         RETURNING *`,
        [id, payer_id, payee_id, amount, note]
      );
      
      const settlement = settlementResult.rows[0];
      
      // 更新分摊记录状态
      if (parseFloat(amount) >= parseFloat(split.amount)) {
        // 全额支付
        await client.query(
          'UPDATE bill_splits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['PAID', split.id]
        );
      } else {
        // 部分支付
        await client.query(
          'UPDATE bill_splits SET amount = amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [amount, split.id]
        );
        
        // 创建新的部分支付记录
        await client.query(
          `INSERT INTO bill_splits (bill_id, user_id, amount, status, note)
           VALUES ($1, $2, $3, 'PAID', $4)`,
          [id, payer_id, amount, `部分支付: ${note || ''}`]
        );
      }
      
      // 检查账单是否已全部结算
      const unpaidSplits = await client.query(
        'SELECT COUNT(*) as count FROM bill_splits WHERE bill_id = $1 AND status != $2',
        [id, 'PAID']
      );
      
      if (parseInt(unpaidSplits.rows[0].count) === 0) {
        // 所有分摊已支付，更新账单状态为已结算
        await client.query(
          'UPDATE bills SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['SETTLED', id]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info(`账单结算成功: 账单ID=${id}, 付款人=${payer_id}, 收款人=${payee_id}, 金额=${amount}, 操作者=${user_id}`);
      
      res.success(201, '账单结算成功', { settlement });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('结算账单失败:', error);
      res.error(500, '结算账单失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取账单分类列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.getBillCategories = async function getBillCategories(req, res) {
    const client = await pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id } = req.query;
      
      // 验证用户是否有权限查看该寝室的分类
      let roomFilter = '';
      const params = [user_id];
      let paramIndex = 2;
      
      if (room_id) {
        roomFilter = `AND rm.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      // 获取用户所在的寝室
      const roomQuery = `
        SELECT rm.room_id
        FROM room_members rm
        WHERE rm.user_id = $1 AND rm.status = 'active'
        ${roomFilter}
      `;
      
      const roomResult = await client.query(roomQuery, params);
      
      if (roomResult.rows.length === 0) {
        return res.error(404, '未找到您所在的寝室');
      }
      
      // 获取账单分类
      const categoryQuery = `
        SELECT DISTINCT category as name, COUNT(*) as count
        FROM bills b
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1 AND b.category IS NOT NULL
        ${roomFilter}
        GROUP BY category
        ORDER BY count DESC
      `;
      
      const categoryResult = await client.query(categoryQuery, params);
      const categories = categoryResult.rows;
      
      res.success(200, '获取账单分类列表成功', { categories });
    } catch (error) {
      logger.error('获取账单分类列表失败:', error);
      res.error(500, '获取账单分类列表失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 创建账单分类
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.createBillCategory = async function createBillCategory(req, res) {
    const client = await pool.connect();
    try {
      const { name, description, color, icon } = req.body;
      const user_id = req.user.id;
      const { room_id } = req.query;
      
      // 验证必填字段
      if (!name) {
        return res.error(400, '分类名称为必填项');
      }
      
      // 验证用户是否有权限操作该寝室
      if (!room_id) {
        return res.error(400, '房间ID为必填项');
      }
      
      const permissionCheck = await client.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND status = $3',
        [room_id, user_id, 'active']
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }
      
      // 检查分类是否已存在
      const existingCategory = await client.query(
        'SELECT 1 FROM bill_categories WHERE room_id = $1 AND name = $2',
        [room_id, name]
      );
      
      if (existingCategory.rows.length > 0) {
        return res.error(400, '该分类已存在');
      }
      
      // 创建账单分类
      const categoryResult = await client.query(
        `INSERT INTO bill_categories (room_id, name, description, color, icon)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [room_id, name, description, color, icon]
      );
      
      const category = categoryResult.rows[0];
      
      logger.info(`账单分类创建成功: 分类ID=${category.id}, 名称=${name}, 房间ID=${room_id}, 创建者=${user_id}`);
      
      res.success(201, '账单分类创建成功', { category });
    } catch (error) {
      logger.error('创建账单分类失败:', error);
      res.error(500, '创建账单分类失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 更新账单分类
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.updateBillCategory = async function updateBillCategory(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // category_id
      const { name, description, color, icon } = req.body;
      const user_id = req.user.id;
      
      // 验证分类是否存在
      const categoryCheck = await client.query(
        'SELECT * FROM bill_categories WHERE id = $1',
        [id]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.error(404, '分类不存在');
      }
      
      const category = categoryCheck.rows[0];
      
      // 验证用户是否有权限操作该寝室
      const permissionCheck = await client.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND status = $3',
        [category.room_id, user_id, 'active']
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }
      
      // 检查分类名称是否已存在（排除当前分类）
      if (name && name !== category.name) {
        const existingCategory = await client.query(
          'SELECT 1 FROM bill_categories WHERE room_id = $1 AND name = $2 AND id != $3',
          [category.room_id, name, id]
        );
        
        if (existingCategory.rows.length > 0) {
          return res.error(400, '该分类名称已存在');
        }
      }
      
      // 更新账单分类
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (color !== undefined) {
        updateFields.push(`color = $${paramIndex++}`);
        updateValues.push(color);
      }
      
      if (icon !== undefined) {
        updateFields.push(`icon = $${paramIndex++}`);
        updateValues.push(icon);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);
      
      const updateQuery = `
        UPDATE bill_categories
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;
      
      const categoryResult = await client.query(updateQuery, updateValues);
      const updatedCategory = categoryResult.rows[0];
      
      logger.info(`账单分类更新成功: 分类ID=${id}, 更新者=${user_id}`);
      
      res.success(200, '账单分类更新成功', { category: updatedCategory });
    } catch (error) {
      logger.error('更新账单分类失败:', error);
      res.error(500, '更新账单分类失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 删除账单分类
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.deleteBillCategory = async function deleteBillCategory(req, res) {
    const client = await pool.connect();
    try {
      const { id } = req.params; // category_id
      const user_id = req.user.id;
      
      // 验证分类是否存在
      const categoryCheck = await client.query(
        'SELECT * FROM bill_categories WHERE id = $1',
        [id]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.error(404, '分类不存在');
      }
      
      const category = categoryCheck.rows[0];
      
      // 验证用户是否有权限操作该寝室
      const permissionCheck = await client.query(
        'SELECT rm.role FROM room_members WHERE room_id = $1 AND user_id = $2 AND status = $3',
        [category.room_id, user_id, 'active']
      );
      
      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }
      
      const memberRole = permissionCheck.rows[0].role;
      
      // 只有寝室管理员可以删除分类
      if (memberRole !== 'admin') {
        return res.error(403, '只有寝室管理员可以删除账单分类');
      }
      
      // 检查是否有账单使用该分类
      const billsUsingCategory = await client.query(
        'SELECT COUNT(*) as count FROM bills WHERE category = $1',
        [category.name]
      );
      
      if (parseInt(billsUsingCategory.rows[0].count) > 0) {
        return res.error(400, '该分类正在被账单使用，无法删除');
      }
      
      // 删除账单分类
      await client.query(
        'DELETE FROM bill_categories WHERE id = $1',
        [id]
      );
      
      logger.info(`账单分类删除成功: 分类ID=${id}, 删除者=${user_id}`);
      
      res.success(200, '账单分类删除成功');
    } catch (error) {
      logger.error('删除账单分类失败:', error);
      res.error(500, '删除账单分类失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 更新账单评论
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.updateBillComment = async function updateBillComment(req, res) {
    const client = await pool.connect();
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const user_id = req.user.id;

      // 验证评论是否存在
      const commentCheck = await client.query(
        'SELECT bc.*, b.room_id FROM bill_comments bc JOIN bills b ON bc.bill_id = b.id WHERE bc.id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.error(404, '评论不存在');
      }

      const comment = commentCheck.rows[0];

      // 验证用户是否有权限更新评论（评论创建者或房间管理员）
      const permissionCheck = await client.query(
        'SELECT rm.role FROM room_members rm WHERE rm.room_id = $1 AND rm.user_id = $2',
        [comment.room_id, user_id]
      );

      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }

      const memberRole = permissionCheck.rows[0].role;

      // 只有评论创建者或房间管理员可以更新评论
      if (comment.user_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有评论创建者或房间管理员可以更新评论');
      }

      // 验证评论内容
      if (!content || content.trim().length < 1) {
        return res.error(400, '评论内容不能为空');
      }

      // 更新评论
      const updateResult = await client.query(
        'UPDATE bill_comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [content.trim(), commentId]
      );

      const updatedComment = updateResult.rows[0];

      logger.info(`账单评论更新成功: 评论ID=${commentId}, 更新者=${user_id}`);

      res.success(200, '账单评论更新成功', { comment: updatedComment });
    } catch (error) {
      logger.error('更新账单评论失败:', error);
      res.error(500, '更新账单评论失败', error.message);
    } finally {
      client.release();
    }
  };

  /**
   * 删除账单评论
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.deleteBillComment = async function deleteBillComment(req, res) {
    const client = await pool.connect();
    try {
      const { commentId } = req.params;
      const user_id = req.user.id;

      // 验证评论是否存在
      const commentCheck = await client.query(
        'SELECT bc.*, b.room_id FROM bill_comments bc JOIN bills b ON bc.bill_id = b.id WHERE bc.id = $1',
        [commentId]
      );

      if (commentCheck.rows.length === 0) {
        return res.error(404, '评论不存在');
      }

      const comment = commentCheck.rows[0];

      // 验证用户是否有权限删除评论（评论创建者或房间管理员）
      const permissionCheck = await client.query(
        'SELECT rm.role FROM room_members rm WHERE rm.room_id = $1 AND rm.user_id = $2',
        [comment.room_id, user_id]
      );

      if (permissionCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }

      const memberRole = permissionCheck.rows[0].role;

      // 只有评论创建者或房间管理员可以删除评论
      if (comment.user_id !== user_id && memberRole !== 'admin') {
        return res.error(403, '只有评论创建者或房间管理员可以删除评论');
      }

      // 删除评论
      await client.query('DELETE FROM bill_comments WHERE id = $1', [commentId]);

      logger.info(`账单评论删除成功: 评论ID=${commentId}, 删除者=${user_id}`);

      res.success(200, '账单评论删除成功');
    } catch (error) {
      logger.error('删除账单评论失败:', error);
      res.error(500, '删除账单评论失败', error.message);
    } finally {
      client.release();
    }
  };

  /**
   * 获取账单统计数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  BillController.prototype.getBillStatistics = async function getBillStatistics(req, res) {
    const client = await pool.connect();
    try {
      const { roomId, userId, period, dateFrom, dateTo } = req.query;
      const admin_user_id = req.user.id;

      // 构建查询条件
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      // 如果指定了房间ID，验证管理员是否有权限查看该房间
      if (roomId) {
        const roomPermissionCheck = await client.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND status = $3',
          [roomId, admin_user_id, 'active']
        );

        if (roomPermissionCheck.rows.length === 0) {
          return res.error(403, '您不是该寝室的成员');
        }

        whereConditions.push(`b.room_id = $${paramIndex++}`);
        queryParams.push(roomId);
      }

      // 如果指定了用户ID，验证用户是否存在
      if (userId) {
        whereConditions.push(`b.creator_id = $${paramIndex++}`);
        queryParams.push(userId);
      }

      // 处理日期范围
      if (dateFrom) {
        whereConditions.push(`b.date >= $${paramIndex++}`);
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push(`b.date <= $${paramIndex++}`);
        queryParams.push(dateTo);
      }

      // 处理周期
      if (period) {
        const now = new Date();
        let dateFromCondition = '';

        switch (period) {
          case 'week':
            dateFromCondition = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split('T')[0];
            break;
          case 'month':
            dateFromCondition = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            break;
          case 'quarter':
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            dateFromCondition = new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().split('T')[0];
            break;
          case 'year':
            dateFromCondition = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
        }

        if (dateFromCondition) {
          whereConditions.push(`b.date >= $${paramIndex++}`);
          queryParams.push(dateFromCondition);
        }
      }

      // 构建WHERE子句
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 获取账单总数
      const totalBillsQuery = `SELECT COUNT(*) as total FROM bills b ${whereClause}`;
      const totalBillsResult = await client.query(totalBillsQuery, queryParams);
      const totalBills = parseInt(totalBillsResult.rows[0].total);

      // 获取账单总金额
      const totalAmountQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM bills b ${whereClause}`;
      const totalAmountResult = await client.query(totalAmountQuery, queryParams);
      const totalAmount = parseFloat(totalAmountResult.rows[0].total);

      // 获取按状态分组的账单统计
      const statusQuery = `
        SELECT b.status, COUNT(*) as count, COALESCE(SUM(b.amount), 0) as amount
        FROM bills b ${whereClause}
        GROUP BY b.status
      `;
      const statusResult = await client.query(statusQuery, queryParams);
      const statusStats = statusResult.rows;

      // 获取按分类分组的账单统计
      const categoryQuery = `
        SELECT b.category, COUNT(*) as count, COALESCE(SUM(b.amount), 0) as amount
        FROM bills b ${whereClause}
        GROUP BY b.category
        ORDER BY amount DESC
        LIMIT 10
      `;
      const categoryResult = await client.query(categoryQuery, queryParams);
      const categoryStats = categoryResult.rows;

      // 获取按月份分组的账单统计（最近12个月）
      const monthlyQuery = `
        SELECT 
          TO_CHAR(b.date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(b.amount), 0) as amount
        FROM bills b 
        WHERE b.date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        ${whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : ''}
        GROUP BY TO_CHAR(b.date, 'YYYY-MM')
        ORDER BY month
      `;
      const monthlyResult = await client.query(monthlyQuery, queryParams);
      const monthlyStats = monthlyResult.rows;

      // 获取按创建者分组的账单统计（前10名）
      const creatorQuery = `
        SELECT 
          u.id,
          u.username,
          u.display_name,
          COUNT(*) as count,
          COALESCE(SUM(b.amount), 0) as amount
        FROM bills b
        JOIN users u ON b.creator_id = u.id
        ${whereClause}
        GROUP BY u.id, u.username, u.display_name
        ORDER BY amount DESC
        LIMIT 10
      `;
      const creatorResult = await client.query(creatorQuery, queryParams);
      const creatorStats = creatorResult.rows;

      // 构建响应数据
      const statistics = {
        summary: {
          totalBills,
          totalAmount,
          averageAmount: totalBills > 0 ? totalAmount / totalBills : 0
        },
        statusStats,
        categoryStats,
        monthlyStats,
        creatorStats
      };

      logger.info(`账单统计数据获取成功: 查询条件=${JSON.stringify(req.query)}`);

      res.success(200, '账单统计数据获取成功', { statistics });
    } catch (error) {
      logger.error('获取账单统计数据失败:', error);
      res.error(500, '获取账单统计数据失败', error.message);
    } finally {
      client.release();
    }
  };

module.exports = new BillController();