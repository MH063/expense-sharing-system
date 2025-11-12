const { pool } = require('../config/db');
const winston = require('winston');
const PresenceDaySplitService = require('../services/presence-day-split-service');
const { PrecisionCalculator } = require('../services/precision-calculator');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/expense-controller.log' })
  ]
});

// 费用控制器
class ExpenseController {
  constructor() {
    this.logger = logger;
  }

  // 创建费用记录
  async createExpense(req, res) {
    const startTime = Date.now();
    const requestId = `create-expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] 开始创建费用记录`, {
      requestId,
      userId: req.user.sub,
      body: { ...req.body, password: undefined } // 不记录敏感信息
    });

    try {
      const { 
        title, 
        description, 
        amount, 
        expense_type_id, 
        room_id, 
        payer_id, 
        split_type, 
        split_details,
        expense_date,
        receipt_image_url,
        tags,
        status,
        // 新增读数计算方式相关字段
        calculation_method = 'amount', // 'amount' 或 'reading'
        meter_type,
        current_reading,
        previous_reading,
        unit_price,
        // 新增分摊人员选择相关字段
        selected_members
      } = req.body;
      const creatorId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!title || !expense_type_id || !room_id || !payer_id || !split_type) {
        logger.warn(`[${requestId}] 创建费用记录失败: 缺少必填字段`, {
          requestId,
          missingFields: {
            title: !title,
            expense_type_id: !expense_type_id,
            room_id: !room_id,
            payer_id: !payer_id,
            split_type: !split_type
          }
        });
        
        return res.error(400, '缺少必填字段');
      }

      // 验证selected_members参数
      if (selected_members && !Array.isArray(selected_members)) {
        logger.warn(`[${requestId}] 创建费用记录失败: selected_members参数必须是数组`, {
          requestId,
          selected_members
        });
        
        return res.error(400, 'selected_members参数必须是数组');
      }

      // 如果是读数计算方式，验证必填字段
      let calculatedAmount = amount;
      if (calculation_method === 'reading') {
        if (!meter_type || current_reading === undefined || previous_reading === undefined || !unit_price) {
          logger.warn(`[${requestId}] 创建费用记录失败: 读数计算方式缺少必填字段`, {
            requestId,
            missingFields: {
              meter_type: !meter_type,
              current_reading: current_reading === undefined,
              previous_reading: previous_reading === undefined,
              unit_price: !unit_price
            }
          });
          
          return res.error(400, '读数计算方式需要提供表计类型、本次读数、上次读数和单价');
        }
        
        // 验证读数是否合理
        if (parseFloat(current_reading) < parseFloat(previous_reading)) {
          logger.warn(`[${requestId}] 创建费用记录失败: 本次读数小于上次读数`, {
            requestId,
            current_reading,
            previous_reading
          });
          
          return res.error(400, '本次读数不能小于上次读数');
        }
        
        // 计算用量和总费用
        const usage = PrecisionCalculator.subtract(parseFloat(current_reading), parseFloat(previous_reading));
        calculatedAmount = PrecisionCalculator.multiply(usage, parseFloat(unit_price));
        
        // 如果前端提供了金额，检查是否与计算结果一致
        if (amount && Math.abs(PrecisionCalculator.subtract(calculatedAmount, parseFloat(amount))) > 0.01) {
          logger.warn(`[${requestId}] 创建费用记录失败: 计算金额与提供金额不一致`, {
            requestId,
            calculatedAmount,
            providedAmount: amount
          });
          
          return res.error(400, `计算金额(${calculatedAmount})与提供金额(${amount})不一致`);
        }
      } else if (!amount) {
        logger.warn(`[${requestId}] 创建费用记录失败: 金额计算方式需要提供金额`, {
          requestId
        });
        
        return res.error(400, '金额计算方式需要提供金额');
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [creatorId, room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 创建费用记录失败: 用户不是该寝室的成员`, {
          requestId,
          userId: creatorId,
          roomId: room_id
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 验证费用类型是否存在
      const expenseTypeResult = await pool.query(
        'SELECT * FROM expense_types WHERE id = $1',
        [expense_type_id]
      );

      if (expenseTypeResult.rows.length === 0) {
        logger.warn(`[${requestId}] 创建费用记录失败: 费用类型不存在`, {
          requestId,
          expense_type_id
        });
        
        return res.error(404, '费用类型不存在');
      }

      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 插入费用记录
        // 直接使用前端传入的split_type
        const expenseResult = await client.query(
          `INSERT INTO expenses 
           (title, description, amount, expense_type_id, room_id, payer_id, split_type, 
            expense_date, status, created_at, updated_at,
            calculation_method, meter_type, current_reading, previous_reading, unit_price) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11, $12, $13, $14) 
           RETURNING id, title, description, amount, expense_type_id, room_id, payer_id, 
                    split_type, expense_date, status, created_at,
                    calculation_method, meter_type, current_reading, previous_reading, unit_price`,
          [
            title, 
            description || '', 
            calculatedAmount, 
            expense_type_id, 
            room_id, 
            payer_id, 
            split_type, 
            expense_date || new Date().toISOString().split('T')[0], 
            'pending',
            calculation_method,
            meter_type,
            current_reading,
            previous_reading,
            unit_price
          ]
        );

        const expense = expenseResult.rows[0];
        logger.info(`[${requestId}] 费用记录创建成功`, {
          requestId,
          expenseId: expense.id,
          title: expense.title,
          amount: expense.amount
        });

        // 根据分摊类型创建分摊记录
        let splitRecords = [];
        
        if (split_type === 'equal') {
          // 平均分摊
          let membersQuery = `SELECT user_id FROM room_members WHERE room_id = $1`;
          let membersParams = [room_id];
          
          // 如果指定了selected_members，只分摊给选中的成员
          if (selected_members && selected_members.length > 0) {
            membersQuery += ` AND user_id = ANY($2)`;
            membersParams.push(selected_members);
            logger.info(`[${requestId}] 使用指定成员进行平均分摊`, {
              requestId,
              selected_members
            });
          }
          
          const membersResult = await client.query(membersQuery, membersParams);
          const members = membersResult.rows;
          
          if (members.length === 0) {
            logger.warn(`[${requestId}] 创建费用记录失败: 没有找到有效的分摊成员`, {
              requestId,
              room_id,
              selected_members
            });
            
            await client.query('ROLLBACK');
            return res.error(400, '没有找到有效的分摊成员');
          }
          
          // 使用尾差处理机制确保分摊总额等于实际金额
          const sharesArray = members.map(() => 1); // 每人一份
          const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(amount), sharesArray);
          
          for (let i = 0; i < members.length; i++) {
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, percentage, created_at) 
               VALUES ($1, $2, $3, 1.0, NOW()) 
               RETURNING id, expense_id, user_id, amount`,
              [expense.id, members[i].user_id, splitAmounts[i]]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
          
          logger.info(`[${requestId}] 平均分摊记录创建成功`, {
            requestId,
            expenseId: expense.id,
            memberCount: members.length
          });
        } else if (split_type === 'custom' && split_details && split_details.length > 0) {
          // 自定义分摊 - 使用尾差处理机制确保分摊总额等于实际金额
          
          // 验证分摊金额总和
          const totalAmount = split_details.reduce((sum, detail) => 
            PrecisionCalculator.add(sum, parseFloat(detail.amount)), 0
          );
          
          // 如果分摊金额总和与实际金额不一致，按比例调整
          if (Math.abs(PrecisionCalculator.subtract(totalAmount, parseFloat(amount))) > 0.01) {
            // 按比例调整每个分摊金额
            const ratio = PrecisionCalculator.divide(parseFloat(amount), totalAmount);
            split_details = split_details.map(detail => ({
              ...detail,
              amount: PrecisionCalculator.multiply(parseFloat(detail.amount), ratio)
            }));
            
            logger.info(`[${requestId}] 自定义分摊金额按比例调整`, {
              requestId,
              originalTotal: totalAmount,
              targetAmount: parseFloat(amount),
              ratio
            });
          }
          
          // 使用尾差处理机制确保分摊总额等于实际金额
          const sharesArray = split_details.map(detail => parseFloat(detail.amount));
          const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(amount), sharesArray);
          
          for (let i = 0; i < split_details.length; i++) {
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, percentage, created_at) 
               VALUES ($1, $2, $3, 1.0, NOW()) 
               RETURNING id, expense_id, user_id, amount`,
              [expense.id, split_details[i].user_id, splitAmounts[i]]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
          
          logger.info(`[${requestId}] 自定义分摊记录创建成功`, {
            requestId,
            expenseId: expense.id,
            memberCount: split_details.length
          });
        } else if (split_type === 'percentage' && split_details && split_details.length > 0) {
          // 百分比分摊 - 使用尾差处理机制确保分摊总额等于实际金额
          
          // 验证百分比总和
          let totalPercentage = split_details.reduce((sum, detail) => 
            PrecisionCalculator.add(sum, parseFloat(detail.percentage)), 0
          );
          
          // 如果百分比总和不为100%，按比例调整
          if (Math.abs(PrecisionCalculator.subtract(totalPercentage, 100)) > 0.01) {
            // 按比例调整每个百分比
            split_details = split_details.map(detail => ({
              ...detail,
              percentage: PrecisionCalculator.divide(
                PrecisionCalculator.multiply(parseFloat(detail.percentage), 100), 
                totalPercentage
              )
            }));
            
            logger.info(`[${requestId}] 百分比分摊按比例调整`, {
              requestId,
              originalTotal: totalPercentage,
              targetPercentage: 100
            });
          }
          
          // 使用尾差处理机制计算分摊金额
          const sharesArray = split_details.map(detail => parseFloat(detail.percentage));
          const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(amount), sharesArray);
          
          for (let i = 0; i < split_details.length; i++) {
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, percentage, created_at) 
               VALUES ($1, $2, $3, 1.0, NOW()) 
               RETURNING id, expense_id, user_id, amount`,
              [expense.id, split_details[i].user_id, splitAmounts[i]]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
          
          logger.info(`[${requestId}] 百分比分摊记录创建成功`, {
            requestId,
            expenseId: expense.id,
            memberCount: split_details.length
          });
        } else {
          logger.error(`[${requestId}] 创建费用记录失败: 无效的分摊类型或缺少分摊详情`, {
            requestId,
            split_type,
            has_split_details: !!split_details,
            split_details_length: split_details ? split_details.length : 0
          });
          
          throw new Error('无效的分摊类型或缺少分摊详情');
        }

        await client.query('COMMIT');

        // 获取完整的费用信息
        const fullExpenseResult = await pool.query(
          `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.payer_id, 
                  e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.created_at, e.updated_at,
                  e.calculation_method, e.meter_type, e.current_reading, e.previous_reading, e.unit_price,
                  et.name as expense_type_name, et.icon as expense_type_icon,
                  u.username as payer_username, u.name as payer_name
           FROM expenses e
           JOIN expense_types et ON e.expense_type_id = et.id
           JOIN users u ON e.payer_id = u.id
           WHERE e.id = $1`,
          [expense.id]
        );

        const fullExpense = fullExpenseResult.rows[0];
        const duration = Date.now() - startTime;

        logger.info(`[${requestId}] 费用记录创建成功`, {
          requestId,
          expenseId: fullExpense.id,
          title: fullExpense.title,
          amount: fullExpense.amount,
          splitType: split_type,
          splitRecordCount: splitRecords.length,
          duration
        });

        res.success(201, '费用记录创建成功', fullExpense);

      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`[${requestId}] 创建费用记录事务失败`, {
          requestId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[${requestId}] 费用记录创建失败`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration
      });
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用列表
  async getExpenses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        room_id, 
        expense_type_id, 
        payer_id, 
        start_date, 
        end_date,
        status 
      } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 构建查询条件
      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      // 只能查看自己所在寝室的费用
      const userRoomsResult = await pool.query(
        'SELECT room_id FROM room_members WHERE user_id = $1',
        [userId]
      );
      
      const userRoomIds = userRoomsResult.rows.map(row => row.room_id);
      
      if (userRoomIds.length === 0) {
        return res.success(200, '获取费用列表成功', {
          expenses: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        });
      }

      conditions.push(`e.room_id IN (${userRoomIds.map((_, index) => `$${paramIndex++}`).join(',')})`);
      queryParams.push(...userRoomIds);

      if (room_id) {
        conditions.push(`e.room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }

      if (expense_type_id) {
        conditions.push(`e.expense_type_id = $${paramIndex++}`);
        queryParams.push(expense_type_id);
      }

      if (payer_id) {
        conditions.push(`e.payer_id = $${paramIndex++}`);
        queryParams.push(payer_id);
      }

      if (start_date) {
        conditions.push(`e.expense_date >= $${paramIndex++}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        conditions.push(`e.expense_date <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      if (status) {
        conditions.push(`e.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 查询费用列表
      const expensesQuery = `
        SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.payer_id, 
               e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.created_at,
               e.calculation_method, e.meter_type, e.current_reading, e.previous_reading, e.unit_price,
               et.name as expense_type_name, et.icon as expense_type_icon,
               u.username as payer_username, u.name as payer_name,
               r.name as room_name
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        JOIN users u ON e.payer_id = u.id
        JOIN rooms r ON e.room_id = r.id
        ${whereClause}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const expensesResult = await pool.query(expensesQuery, queryParams);
      const expenses = expensesResult.rows;

      // 查询总数
      const countQuery = `SELECT COUNT(*) FROM expenses e ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);

      // 批量获取所有费用的分摊信息，避免N+1查询问题
      if (expenses.length > 0) {
        const expenseIds = expenses.map(expense => expense.id);
        const splitsQuery = `
          SELECT es.id, es.user_id, es.amount, es.is_paid, es.paid_date, es.created_at,
                 es.expense_id,
                 u.username, u.name
          FROM expense_splits es
          JOIN users u ON es.user_id = u.id
          WHERE es.expense_id = ANY($1)
          ORDER BY u.username
        `;
        
        const splitsResult = await pool.query(splitsQuery, [expenseIds]);
        
        // 将分摊信息按费用ID分组
        const splitsByExpenseId = {};
        splitsResult.rows.forEach(split => {
          if (!splitsByExpenseId[split.expense_id]) {
            splitsByExpenseId[split.expense_id] = [];
          }
          splitsByExpenseId[split.expense_id].push(split);
        });
        
        // 为每个费用添加分摊信息
        expenses.forEach(expense => {
          expense.splits = splitsByExpenseId[expense.id] || [];
        });
      }

      logger.info(`获取费用列表成功，共 ${totalCount} 条记录`);

      res.success(200, '获取费用列表成功', {
        expenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      logger.error('获取费用列表失败:', error);
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用详情
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 查询费用基本信息
      const expenseResult = await pool.query(
        `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.payer_id, 
                e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.creator_id, e.created_at, e.updated_at,
                e.calculation_method, e.meter_type, e.current_reading, e.previous_reading, e.unit_price,
                et.name as expense_type_name, et.icon as expense_type_icon,
                u.username as payer_username, u.name as payer_name,
                r.name as room_name
         FROM expenses e
         JOIN expense_types et ON e.expense_type_id = et.id
         JOIN users u ON e.payer_id = u.id
         JOIN rooms r ON e.room_id = r.id
         WHERE e.id = $1`,
        [id]
      );

      if (expenseResult.rows.length === 0) {
        return res.error(404, '费用记录不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限查看该费用（必须是寝室成员）
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.error(403, '您没有权限查看该费用记录');
      }

      // 查询分摊详情
      const splitsResult = await pool.query(
        `SELECT es.id, es.user_id, es.amount, es.is_paid, es.paid_date, es.created_at,
                u.username, u.name
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY u.username`,
        [id]
      );

      expense.splits = splitsResult.rows;

      logger.info(`获取费用详情成功: ${expense.title} (ID: ${expense.id})`);

      res.success(200, '获取费用详情成功', expense);

    } catch (error) {
      logger.error('获取费用详情失败:', error);
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 更新费用记录
  async updateExpense(req, res) {
    const startTime = Date.now();
    const requestId = `update-expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[${requestId}] 开始更新费用记录`, {
      requestId,
      userId: req.user.sub,
      expenseId: req.params.id,
      body: { ...req.body, password: undefined } // 不记录敏感信息
    });

    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        amount, 
        expense_type_id, 
        payer_id, 
        split_type, 
        split_details,
        expense_date,
        receipt_image_url,
        tags,
        status,
        // 新增读数计算方式相关字段
        calculation_method,
        meter_type,
        current_reading,
        previous_reading,
        unit_price,
        // 新增分摊人员选择相关字段
        selected_members
      } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用是否存在
      const expenseResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 更新费用记录失败: 费用记录不存在`, {
          requestId,
          expenseId: id
        });
        
        return res.error(404, '费用记录不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限更新费用（创建者或支付者）
      if (expense.creator_id !== userId && expense.payer_id !== userId) {
        logger.warn(`[${requestId}] 更新费用记录失败: 用户没有权限更新该费用记录`, {
          requestId,
          userId,
          expenseId: id,
          creatorId: expense.creator_id,
          payerId: expense.payer_id
        });
        
        return res.status(403).json({
          success: false,
          message: '只有费用创建者或支付者可以更新费用记录'
        });
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 更新费用记录失败: 用户不是该寝室的成员`, {
          requestId,
          userId,
          roomId: expense.room_id
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 验证selected_members参数
      if (selected_members && !Array.isArray(selected_members)) {
        logger.warn(`[${requestId}] 更新费用记录失败: selected_members参数必须是数组`, {
          requestId,
          selected_members
        });
        
        return res.status(400).json({
          success: false,
          message: 'selected_members参数必须是数组'
        });
      }

      // 如果是读数计算方式，验证必填字段
      let calculatedAmount = amount;
      if (calculation_method === 'reading') {
        if (!meter_type || current_reading === undefined || previous_reading === undefined || !unit_price) {
          logger.warn(`[${requestId}] 更新费用记录失败: 读数计算方式缺少必填字段`, {
            requestId,
            missingFields: {
              meter_type: !meter_type,
              current_reading: current_reading === undefined,
              previous_reading: previous_reading === undefined,
              unit_price: !unit_price
            }
          });
          
          return res.status(400).json({
            success: false,
            message: '读数计算方式需要提供表计类型、本次读数、上次读数和单价'
          });
        }
        
        // 验证读数是否合理
        if (parseFloat(current_reading) < parseFloat(previous_reading)) {
          logger.warn(`[${requestId}] 更新费用记录失败: 本次读数小于上次读数`, {
            requestId,
            current_reading,
            previous_reading
          });
          
          return res.status(400).json({
            success: false,
            message: '本次读数不能小于上次读数'
          });
        }
        
        // 计算用量和总费用
        const usage = PrecisionCalculator.subtract(parseFloat(current_reading), parseFloat(previous_reading));
        calculatedAmount = PrecisionCalculator.multiply(usage, parseFloat(unit_price));
        
        // 如果前端提供了金额，检查是否与计算结果一致
        if (amount && Math.abs(PrecisionCalculator.subtract(calculatedAmount, parseFloat(amount))) > 0.01) {
          logger.warn(`[${requestId}] 更新费用记录失败: 计算金额与提供金额不一致`, {
            requestId,
            calculatedAmount,
            providedAmount: amount
          });
          
          return res.status(400).json({
            success: false,
            message: `计算金额(${calculatedAmount})与提供金额(${amount})不一致`
          });
        }
      }

      // 开始事务
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 构建更新字段
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (title !== undefined) {
          updateFields.push(`title = $${paramIndex++}`);
          updateValues.push(title);
        }

        if (description !== undefined) {
          updateFields.push(`description = $${paramIndex++}`);
          updateValues.push(description);
        }

        if (amount !== undefined) {
          updateFields.push(`amount = $${paramIndex++}`);
          updateValues.push(calculatedAmount !== undefined ? calculatedAmount : amount);
        }

        if (expense_type_id !== undefined) {
          updateFields.push(`expense_type_id = $${paramIndex++}`);
          updateValues.push(expense_type_id);
        }

        if (payer_id !== undefined) {
          updateFields.push(`payer_id = $${paramIndex++}`);
          updateValues.push(payer_id);
        }

        if (split_type !== undefined) {
          updateFields.push(`split_type = $${paramIndex++}`);
          updateValues.push(split_type);
        }

        if (expense_date !== undefined) {
          updateFields.push(`expense_date = $${paramIndex++}`);
          updateValues.push(expense_date);
        }

        if (receipt_image_url !== undefined) {
          updateFields.push(`receipt_image_url = $${paramIndex++}`);
          updateValues.push(receipt_image_url);
        }

        if (tags !== undefined) {
          updateFields.push(`tags = $${paramIndex++}`);
          updateValues.push(tags);
        }

        if (status !== undefined) {
          updateFields.push(`status = $${paramIndex++}`);
          updateValues.push(status);
        }

        // 添加读数计算方式相关字段
        if (calculation_method !== undefined) {
          updateFields.push(`calculation_method = $${paramIndex++}`);
          updateValues.push(calculation_method);
        }

        if (meter_type !== undefined) {
          updateFields.push(`meter_type = $${paramIndex++}`);
          updateValues.push(meter_type);
        }

        if (current_reading !== undefined) {
          updateFields.push(`current_reading = $${paramIndex++}`);
          updateValues.push(current_reading);
        }

        if (previous_reading !== undefined) {
          updateFields.push(`previous_reading = $${paramIndex++}`);
          updateValues.push(previous_reading);
        }

        if (unit_price !== undefined) {
          updateFields.push(`unit_price = $${paramIndex++}`);
          updateValues.push(unit_price);
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        // 执行更新
        const updateQuery = `
          UPDATE expenses 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, title, description, amount, expense_type_id, room_id, payer_id, 
                   split_type, expense_date, receipt_image_url, tags, status, updated_at
        `;

        const result = await client.query(updateQuery, updateValues);
        const updatedExpense = result.rows[0];
        
        logger.info(`[${requestId}] 费用记录更新成功`, {
          requestId,
          expenseId: updatedExpense.id,
          title: updatedExpense.title
        });

        // 如果分摊类型或金额发生变化，需要更新分摊记录
        if (split_type !== undefined || amount !== undefined) {
          // 删除原有分摊记录
          await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);
          
          logger.info(`[${requestId}] 原有分摊记录已删除`, {
            requestId,
            expenseId: id
          });

          // 重新创建分摊记录
          let splitRecords = [];
          const finalAmount = amount !== undefined ? amount : expense.amount;
          const finalSplitType = split_type !== undefined ? split_type : expense.split_type;
          
          if (finalSplitType === 'equal') {
            // 平均分摊 - 使用尾差处理机制确保分摊总额等于实际金额
            let membersQuery = `SELECT user_id FROM room_members WHERE room_id = $1`;
            let membersParams = [expense.room_id];
            
            // 如果指定了selected_members，只分摊给选中的成员
            if (selected_members && selected_members.length > 0) {
              membersQuery += ` AND user_id = ANY($2)`;
              membersParams.push(selected_members);
              logger.info(`[${requestId}] 使用指定成员进行平均分摊`, {
                requestId,
                selected_members
              });
            }
            
            const membersResult = await client.query(membersQuery, membersParams);
            const members = membersResult.rows;
            
            if (members.length === 0) {
              logger.warn(`[${requestId}] 更新费用记录失败: 没有找到有效的分摊成员`, {
                requestId,
                roomId: expense.room_id,
                selected_members
              });
              
              await client.query('ROLLBACK');
              return res.status(400).json({
                success: false,
                message: '没有找到有效的分摊成员'
              });
            }
            
            // 使用尾差处理机制确保分摊总额等于实际金额
            const sharesArray = members.map(() => 1); // 每人一份
            const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(finalAmount), sharesArray);
            
            for (let i = 0; i < members.length; i++) {
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, created_at, updated_at) 
                 VALUES ($1, $2, $3, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount`,
                [id, members[i].user_id, splitAmounts[i]]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
            
            logger.info(`[${requestId}] 平均分摊记录创建成功`, {
              requestId,
              expenseId: id,
              memberCount: members.length
            });
          } else if (finalSplitType === 'custom' && split_details && split_details.length > 0) {
            // 自定义分摊 - 使用尾差处理机制确保分摊总额等于实际金额
            
            // 验证分摊金额总和
            const totalAmount = split_details.reduce((sum, detail) => 
              PrecisionCalculator.add(sum, parseFloat(detail.amount)), 0
            );
            
            // 如果分摊金额总和与实际金额不一致，按比例调整
            if (Math.abs(PrecisionCalculator.subtract(totalAmount, parseFloat(finalAmount))) > 0.01) {
              // 按比例调整每个分摊金额
              const ratio = PrecisionCalculator.divide(parseFloat(finalAmount), totalAmount);
              split_details = split_details.map(detail => ({
                ...detail,
                amount: PrecisionCalculator.multiply(parseFloat(detail.amount), ratio)
              }));
              
              logger.info(`[${requestId}] 自定义分摊金额按比例调整`, {
                requestId,
                originalTotal: totalAmount,
                targetAmount: parseFloat(finalAmount),
                ratio
              });
            }
            
            // 使用尾差处理机制确保分摊总额等于实际金额
            const sharesArray = split_details.map(detail => parseFloat(detail.amount));
            const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(finalAmount), sharesArray);
            
            for (let i = 0; i < split_details.length; i++) {
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, created_at, updated_at) 
                 VALUES ($1, $2, $3, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount`,
                [id, split_details[i].user_id, splitAmounts[i]]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
            
            logger.info(`[${requestId}] 自定义分摊记录创建成功`, {
              requestId,
              expenseId: id,
              memberCount: split_details.length
            });
          } else if (finalSplitType === 'percentage' && split_details && split_details.length > 0) {
            // 百分比分摊 - 使用尾差处理机制确保分摊总额等于实际金额
            
            // 验证百分比总和
            let totalPercentage = split_details.reduce((sum, detail) => 
              PrecisionCalculator.add(sum, parseFloat(detail.percentage)), 0
            );
            
            // 如果百分比总和不为100%，按比例调整
            if (Math.abs(PrecisionCalculator.subtract(totalPercentage, 100)) > 0.01) {
              // 按比例调整每个百分比
              split_details = split_details.map(detail => ({
                ...detail,
                percentage: PrecisionCalculator.divide(
                  PrecisionCalculator.multiply(parseFloat(detail.percentage), 100), 
                  totalPercentage
                )
              }));
              
              logger.info(`[${requestId}] 百分比分摊按比例调整`, {
                requestId,
                originalTotal: totalPercentage,
                targetPercentage: 100
              });
            }
            
            // 使用尾差处理机制计算分摊金额
            const sharesArray = split_details.map(detail => parseFloat(detail.percentage));
            const splitAmounts = PrecisionCalculator.preciseSplitAmount(parseFloat(finalAmount), sharesArray);
            
            for (let i = 0; i < split_details.length; i++) {
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, created_at, updated_at) 
                 VALUES ($1, $2, $3, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount`,
                [id, split_details[i].user_id, splitAmounts[i]]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
            
            logger.info(`[${requestId}] 百分比分摊记录创建成功`, {
              requestId,
              expenseId: id,
              memberCount: split_details.length
            });
          } else {
            logger.error(`[${requestId}] 更新费用记录失败: 无效的分摊类型或缺少分摊详情`, {
              requestId,
              split_type: finalSplitType,
              has_split_details: !!split_details,
              split_details_length: split_details ? split_details.length : 0
            });
            
            throw new Error('无效的分摊类型或缺少分摊详情');
          }
        }

        await client.query('COMMIT');

        // 获取完整的费用信息
        const fullExpenseResult = await pool.query(
          `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.payer_id, 
                  e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.created_at, e.updated_at,
                  e.calculation_method, e.meter_type, e.current_reading, e.previous_reading, e.unit_price,
                  et.name as expense_type_name, et.icon as expense_type_icon,
                  u.username as payer_username, u.name as payer_name
           FROM expenses e
           JOIN expense_types et ON e.expense_type_id = et.id
           JOIN users u ON e.payer_id = u.id
           WHERE e.id = $1`,
          [id]
        );

        const fullExpense = fullExpenseResult.rows[0];
        const duration = Date.now() - startTime;

        logger.info(`[${requestId}] 费用记录更新成功`, {
          requestId,
          expenseId: fullExpense.id,
          title: fullExpense.title,
          amount: fullExpense.amount,
          splitType: fullExpense.split_type,
          splitRecordCount: splitRecords ? splitRecords.length : 0,
          duration
        });

        res.success(200, '费用记录更新成功', fullExpense);

      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`[${requestId}] 更新费用记录事务失败`, {
          requestId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[${requestId}] 费用记录更新失败`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration
      });
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 删除费用记录
  async deleteExpense(req, res) {
    const startTime = Date.now();
    const requestId = `delete-expense-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    logger.info(`[${requestId}] 开始删除费用记录`, {
      requestId,
      userId: req.user.sub,
      expenseId: req.params.id
    });

    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用是否存在
      const expenseResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 删除费用记录失败: 费用记录不存在`, {
          requestId,
          expenseId: id,
          userId
        });
        
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限删除费用（只有创建者可以删除）
      if (expense.creator_id !== userId) {
        logger.warn(`[${requestId}] 删除费用记录失败: 权限不足`, {
          requestId,
          expenseId: id,
          userId,
          creatorId: expense.creator_id
        });
        
        return res.error(403, '只有费用创建者可以删除费用记录');
      }

      // 开始事务
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 删除分摊记录
        const deleteSplitsResult = await client.query(
          'DELETE FROM expense_splits WHERE expense_id = $1 RETURNING id',
          [id]
        );
        
        logger.info(`[${requestId}] 费用分摊记录已删除`, {
          requestId,
          expenseId: id,
          deletedSplitCount: deleteSplitsResult.rows.length
        });

        // 删除费用记录
        await client.query('DELETE FROM expenses WHERE id = $1', [id]);

        await client.query('COMMIT');
        
        const duration = Date.now() - startTime;
        
        logger.info(`[${requestId}] 费用记录删除成功`, {
          requestId,
          expenseId: id,
          title: expense.title,
          deletedSplitCount: deleteSplitsResult.rows.length,
          duration
        });

        res.success(200, '费用记录删除成功');

      } catch (error) {
        await client.query('ROLLBACK');
        
        logger.error(`[${requestId}] 删除费用记录事务失败`, {
          requestId,
          expenseId: id,
          error: error.message,
          stack: error.stack
        });
        
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 费用记录删除失败`, {
        requestId,
        expenseId: req.params.id,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 确认支付分摊金额
  async confirmSplitPayment(req, res) {
    const startTime = Date.now();
    const requestId = `confirm-payment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    logger.info(`[${requestId}] 开始确认支付分摊金额`, {
      requestId,
      userId: req.user.sub,
      splitId: req.params.id,
      paidDate: req.body.paid_date
    });

    try {
      const { id } = req.params;
      const { paid_date } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证分摊记录是否存在
      const splitResult = await pool.query(
        `SELECT es.*, e.room_id 
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         WHERE es.id = $1`,
        [id]
      );

      if (splitResult.rows.length === 0) {
        logger.warn(`[${requestId}] 确认支付失败: 分摊记录不存在`, {
          requestId,
          splitId: id,
          userId
        });
        
        return res.error(404, '分摊记录不存在');
      }

      const split = splitResult.rows[0];

      // 验证用户是否有权限确认支付（只有分摊人本人可以确认）
      if (split.user_id !== userId) {
        logger.warn(`[${requestId}] 确认支付失败: 权限不足`, {
          requestId,
          splitId: id,
          userId,
          splitUserId: split.user_id
        });
        
        return res.error(403, '只有分摊人本人可以确认支付');
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, split.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 确认支付失败: 用户不是寝室成员`, {
          requestId,
          splitId: id,
          userId,
          roomId: split.room_id
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 检查是否已经支付
      if (split.is_paid) {
        logger.warn(`[${requestId}] 确认支付失败: 分摊已支付`, {
          requestId,
          splitId: id,
          userId,
          paidDate: split.paid_date
        });
        
        return res.error(400, '该分摊已确认支付');
      }

      // 更新支付状态
      const updateResult = await pool.query(
        `UPDATE expense_splits 
         SET is_paid = TRUE, paid_date = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, expense_id, user_id, amount, is_paid, paid_date`,
        [paid_date || new Date().toISOString().split('T')[0], id]
      );

      const updatedSplit = updateResult.rows[0];
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 分摊支付确认成功`, {
        requestId,
        splitId: updatedSplit.id,
        expenseId: updatedSplit.expense_id,
        userId,
        amount: updatedSplit.amount,
        paidDate: updatedSplit.paid_date,
        duration
      });

      res.success(200, '支付确认成功', updatedSplit);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 分摊支付确认失败`, {
        requestId,
        splitId: req.params.id,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 智能分摊计算
  async calculateSmartSplit(req, res) {
    const startTime = Date.now();
    const requestId = `smart-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    logger.info(`[${requestId}] 开始智能分摊计算`, {
      requestId,
      userId: req.user.sub,
      requestData: {
        room_id: req.body.room_id,
        amount: req.body.amount,
        split_type: req.body.split_type,
        split_details_count: req.body.split_details ? req.body.split_details.length : 0
      }
    });

    try {
      const { room_id, amount, split_type, split_details } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!room_id || !amount || !split_type) {
        logger.warn(`[${requestId}] 智能分摊计算失败: 缺少必填字段`, {
          requestId,
          userId,
          room_id,
          amount,
          split_type
        });
        
        return res.error(400, '缺少必填字段');
      }

      // 验证金额是否为有效数字
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        logger.warn(`[${requestId}] 智能分摊计算失败: 无效的金额`, {
          requestId,
          userId,
          amount
        });
        
        return res.error(400, '金额必须是大于0的数字');
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 智能分摊计算失败: 用户不是寝室成员`, {
          requestId,
          userId,
          room_id
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 获取寝室成员
      const membersResult = await pool.query(
        `SELECT u.id, u.username, u.name 
         FROM room_members rm
         JOIN users u ON rm.user_id = u.id
         WHERE rm.room_id = $1
         ORDER BY u.username`,
        [room_id]
      );

      const members = membersResult.rows;
      const totalAmount = parseFloat(amount);
      
      logger.info(`[${requestId}] 获取寝室成员成功`, {
        requestId,
        roomId: room_id,
        memberCount: members.length
      });

      // 根据分摊类型计算分摊结果
      let splitResult = [];

      if (split_type === 'equal') {
        // 平均分摊
        const splitAmount = PrecisionCalculator.divide(totalAmount, members.length);
        
        for (const member of members) {
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: PrecisionCalculator.formatCurrency(splitAmount)
          });
        }
        
        logger.info(`[${requestId}] 平均分摊计算完成`, {
          requestId,
          totalAmount,
          memberCount: members.length,
          splitAmount
        });
      } else if (split_type === 'custom' && split_details && split_details.length > 0) {
        // 自定义分摊
        const splitDetailsMap = new Map();
        
        // 将分摊详情转换为Map
        for (const detail of split_details) {
          if (!detail.user_id || isNaN(parseFloat(detail.amount))) {
            logger.warn(`[${requestId}] 智能分摊计算失败: 无效的自定义分摊详情`, {
              requestId,
              detail
            });
            
            return res.error(400, '分摊详情包含无效数据');
          }
          
          splitDetailsMap.set(detail.user_id, parseFloat(detail.amount));
        }
        
        // 为每个成员计算分摊金额
        for (const member of members) {
          const amount = splitDetailsMap.get(member.id) || 0;
          
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: PrecisionCalculator.formatCurrency(amount)
          });
        }
        
        logger.info(`[${requestId}] 自定义分摊计算完成`, {
          requestId,
          totalAmount,
          memberCount: members.length,
          splitDetailsCount: split_details.length
        });
      } else if (split_type === 'percentage' && split_details && split_details.length > 0) {
        // 百分比分摊
        const splitDetailsMap = new Map();
        let totalPercentage = 0;
        
        // 将分摊详情转换为Map并验证百分比总和
        for (const detail of split_details) {
          if (!detail.user_id || isNaN(parseFloat(detail.percentage))) {
            logger.warn(`[${requestId}] 智能分摊计算失败: 无效的百分比分摊详情`, {
              requestId,
              detail
            });
            
            return res.error(400, '分摊详情包含无效数据');
          }
          
          const percentage = parseFloat(detail.percentage);
          splitDetailsMap.set(detail.user_id, percentage);
          totalPercentage += percentage;
        }
        
        // 检查百分比总和是否接近100%
        if (Math.abs(totalPercentage - 100) > 0.01) {
          logger.warn(`[${requestId}] 百分比分摊总和不为100%`, {
            requestId,
            totalPercentage
          });
        }
        
        // 为每个成员计算分摊金额
        for (const member of members) {
          const percentage = splitDetailsMap.get(member.id) || 0;
          const amount = PrecisionCalculator.divide(PrecisionCalculator.multiply(totalAmount, percentage), 100);
          
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: PrecisionCalculator.formatCurrency(amount),
            percentage: percentage
          });
        }
        
        logger.info(`[${requestId}] 百分比分摊计算完成`, {
          requestId,
          totalAmount,
          memberCount: members.length,
          splitDetailsCount: split_details.length,
          totalPercentage
        });
      } else if (split_type === 'presence_days') {
        // 按在寝天数分摊
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
          logger.warn(`[${requestId}] 智能分摊计算失败: 按在寝天数分摊缺少日期参数`, {
            requestId,
            startDate,
            endDate
          });
          
          return res.error(400, '按在寝天数分摊需要提供开始日期和结束日期');
        }
        
        try {
          const presenceDaysSplit = await PresenceDaySplitService.calculateSplit(
            room_id,
            totalAmount,
            startDate,
            endDate
          );
          
          splitResult = presenceDaysSplit.map(split => ({
            user_id: split.user_id,
            username: split.username,
            name: split.name,
            amount: PrecisionCalculator.formatCurrency(split.amount),
            presence_days: split.presence_days,
            total_days: split.total_days
          }));
          
          logger.info(`[${requestId}] 按在寝天数分摊计算完成`, {
            requestId,
            totalAmount,
            startDate,
            endDate,
            splitCount: splitResult.length
          });
        } catch (error) {
          logger.error(`[${requestId}] 按在寝天数分摊计算失败`, {
            requestId,
            error: error.message,
            stack: error.stack
          });
          
          return res.error(500, '按在寝天数分摊计算失败: ' + error.message);
        }
      } else {
        logger.warn(`[${requestId}] 智能分摊计算失败: 无效的分摊类型`, {
          requestId,
          split_type,
          has_split_details: !!split_details,
          split_details_count: split_details ? split_details.length : 0
        });
        
        return res.error(400, '无效的分摊类型或缺少分摊详情');
      }

      // 计算总和验证
      const calculatedTotal = splitResult.reduce((sum, item) => PrecisionCalculator.add(sum, parseFloat(item.amount)), 0);
      const difference = PrecisionCalculator.subtract(totalAmount, calculatedTotal);
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 智能分摊计算成功`, {
        requestId,
        roomId: room_id,
        totalAmount,
        splitType: split_type,
        splitCount: splitResult.length,
        calculatedTotal,
        difference,
        duration
      });

      res.success(200, '智能分摊计算成功', {
        room_id,
        total_amount: totalAmount,
        split_type,
        split_details: splitResult,
        calculated_total: PrecisionCalculator.formatCurrency(calculatedTotal),
        difference: PrecisionCalculator.formatCurrency(difference)
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 智能分摊计算失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用收款码
  async getExpenseQrCode(req, res) {
    const startTime = Date.now();
    const requestId = `qr-code-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      const { qr_type } = req.query; // wechat 或 alipay

      logger.info(`[${requestId}] 开始获取费用收款码`, {
        requestId,
        userId,
        expenseId,
        qr_type
      });

      // 验证收款码类型
      if (!qr_type || !['wechat', 'alipay'].includes(qr_type)) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 无效的收款码类型`, {
          requestId,
          userId,
          expenseId,
          qr_type
        });
        
        return res.error(400, '收款码类型必须是wechat或alipay');
      }

      // 检查费用是否存在
      const expenseCheck = await client.query(
        `SELECT e.*, r.name as room_name, u.username as creator_name
         FROM expenses e
         JOIN rooms r ON e.room_id = r.id
         JOIN users u ON e.created_by = u.id
         WHERE e.id = $1`,
        [expenseId]
      );

      if (expenseCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 费用不存在`, {
          requestId,
          userId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseCheck.rows[0];

      // 检查用户是否有权限查看此费用
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [expense.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 用户没有权限查看此费用`, {
          requestId,
          userId,
          expenseId,
          roomId: expense.room_id
        });
        
        return res.error(403, '您没有权限查看此费用');
      }

      // 获取费用分摊信息
      const splitDetails = await client.query(
        `SELECT es.*, u.username as user_name
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1`,
        [expenseId]
      );

      // 获取当前用户的分摊信息
      const userSplit = splitDetails.rows.find(split => split.user_id == userId);
      
      if (!userSplit) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 用户不在此费用的分摊中`, {
          requestId,
          userId,
          expenseId,
          splitCount: splitDetails.rows.length
        });
        
        return res.error(403, '您不在此费用的分摊中');
      }

      // 检查用户是否已支付
      if (userSplit.is_paid) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 用户已支付此费用`, {
          requestId,
          userId,
          expenseId,
          isPaid: userSplit.is_paid
        });
        
        return res.error(400, '您已支付此费用');
      }

      // 获取收款人的收款码
      const payeeQrCode = await client.query(
        `SELECT uqc.qr_image_url
         FROM user_qr_codes uqc
         WHERE uqc.user_id = $1 AND uqc.qr_type = $2 AND uqc.is_active = TRUE
         LIMIT 1`,
        [expense.payer_id, qr_type]
      );

      if (payeeQrCode.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用收款码失败: 收款人未设置默认收款码`, {
          requestId,
          userId,
          expenseId,
          payeeId: expense.payer_id,
          qr_type
        });
        
        return res.error(404, `收款人未设置默认的${qr_type === 'wechat' ? '微信' : '支付宝'}收款码`);
      }

      // 构建支付信息
      const paymentInfo = {
        expense_id: expense.id,
        expense_title: expense.title,
        expense_description: expense.description,
        room_name: expense.room_name,
        creator_name: expense.creator_name,
        total_amount: expense.amount,
        user_amount: userSplit.amount,
        qr_type: qr_type,
        qr_image_url: payeeQrCode.rows[0].qr_image_url,
        payee_id: expense.payer_id,
        payer_id: userId,
        created_at: expense.created_at,
        expense_date: expense.expense_date
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用收款码成功`, {
        requestId,
        userId,
        expenseId,
        qr_type,
        userAmount: userSplit.amount,
        duration
      });

      res.success(200, '获取费用收款码成功', { payment_info: paymentInfo });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用收款码失败`, {
        requestId,
        userId: req.user.sub,
        expenseId: req.params.expenseId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取费用收款码失败', error.message);
    } finally {
      client.release();
    }
  }

  // 确认费用支付
  async confirmExpensePayment(req, res) {
    const startTime = Date.now();
    const requestId = `confirm-payment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      const { payment_method, transaction_id, payment_time } = req.body;

      logger.info(`[${requestId}] 开始确认费用支付`, {
        requestId,
        userId,
        expenseId,
        payment_method,
        transaction_id,
        payment_time
      });

      // 验证必填字段
      if (!payment_method || !transaction_id || !payment_time) {
        logger.warn(`[${requestId}] 确认费用支付失败: 缺少必填字段`, {
          requestId,
          userId,
          expenseId,
          payment_method,
          transaction_id,
          payment_time
        });
        
        return res.error(400, '请提供完整的支付信息');
      }

      // 验证支付方式
      if (!['wechat', 'alipay', 'cash', 'bank_transfer'].includes(payment_method)) {
        logger.warn(`[${requestId}] 确认费用支付失败: 无效的支付方式`, {
          requestId,
          userId,
          expenseId,
          payment_method
        });
        
        return res.error(400, '无效的支付方式');
      }

      // 检查费用是否存在
      const expenseCheck = await client.query(
        `SELECT e.*, r.name as room_name
         FROM expenses e
         JOIN rooms r ON e.room_id = r.id
         WHERE e.id = $1`,
        [expenseId]
      );

      if (expenseCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认费用支付失败: 费用不存在`, {
          requestId,
          userId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseCheck.rows[0];

      // 检查用户是否有权限支付此费用
      const permissionCheck = await client.query(
        `SELECT 1 FROM room_members 
         WHERE room_id = $1 AND user_id = $2`,
        [expense.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认费用支付失败: 用户没有权限支付此费用`, {
          requestId,
          userId,
          expenseId,
          roomId: expense.room_id
        });
        
        return res.error(403, '您没有权限支付此费用');
      }

      // 获取用户的分摊信息
      const splitCheck = await client.query(
        `SELECT * FROM expense_splits 
         WHERE expense_id = $1 AND user_id = $2`,
        [expenseId, userId]
      );

      if (splitCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 确认费用支付失败: 用户不在此费用的分摊中`, {
          requestId,
          userId,
          expenseId
        });
        
        return res.error(403, '您不在此费用的分摊中');
      }

      const userSplit = splitCheck.rows[0];

      // 检查用户是否已支付
      const existingPayment = await client.query(
        `SELECT 1 FROM payments p
         JOIN bill_expenses be ON p.bill_id = be.bill_id
         WHERE be.expense_id = $1 AND p.user_id = $2`,
        [expenseId, userId]
      );

      if (existingPayment.rows.length > 0) {
        logger.warn(`[${requestId}] 确认费用支付失败: 用户已支付此费用`, {
          requestId,
          userId,
          expenseId,
          paymentCount: existingPayment.rows.length
        });
        
        return res.error(400, '您已支付此费用');
      }

      await client.query('BEGIN');

      // 创建账单记录（如果不存在）
      let billId;
      const existingBill = await client.query(
        `SELECT id FROM bills WHERE title = $1 AND creator_id = $2`,
        [`费用-${expenseId}`, userId]
      );
      
      if (existingBill.rows.length === 0) {
        const billResult = await client.query(
          `INSERT INTO bills (room_id, title, total_amount, due_date, creator_id, status)
           VALUES ($1, $2, $3, $4, $5, 'COMPLETED')
           RETURNING id`,
          [expense.room_id, `费用-${expenseId}`, userSplit.amount, new Date(), userId]
        );
        billId = billResult.rows[0].id;
        
        logger.info(`[${requestId}] 创建新账单记录`, {
          requestId,
          userId,
          expenseId,
          billId,
          amount: userSplit.amount
        });
        
        // 创建账单费用关联
        await client.query(
          `INSERT INTO bill_expenses (bill_id, expense_id) VALUES ($1, $2)`,
          [billId, expenseId]
        );
      } else {
        billId = existingBill.rows[0].id;
        
        logger.info(`[${requestId}] 使用现有账单记录`, {
          requestId,
          userId,
          expenseId,
          billId
        });
      }

      // 创建支付记录
      const paymentResult = await client.query(
        `INSERT INTO payments 
         (bill_id, user_id, payer_id, amount, payment_method, transaction_id, payment_time, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
         RETURNING *`,
        [billId, userId, userId, userSplit.amount, payment_method, transaction_id, payment_time]
      );

      logger.info(`[${requestId}] 创建支付记录成功`, {
        requestId,
        userId,
        expenseId,
        billId,
        paymentId: paymentResult.rows[0].id,
        amount: userSplit.amount,
        payment_method
      });

      // 检查是否所有用户都已支付
      const allUsersCount = await client.query(
        `SELECT COUNT(*) as count FROM expense_splits WHERE expense_id = $1`,
        [expenseId]
      );

      const paidUsersCount = await client.query(
        `SELECT COUNT(DISTINCT p.user_id) as count FROM payments p
         JOIN bill_expenses be ON p.bill_id = be.bill_id
         WHERE be.expense_id = $1 AND p.status = 'completed'`,
        [expenseId]
      );

      // 如果所有用户都已支付，更新费用状态
      if (parseInt(allUsersCount.rows[0].count) === parseInt(paidUsersCount.rows[0].count)) {
        await client.query(
          `UPDATE expenses 
           SET status = 'paid', updated_at = NOW()
           WHERE id = $1`,
          [expenseId]
        );
        
        logger.info(`[${requestId}] 费用状态更新为已支付`, {
          requestId,
          userId,
          expenseId,
          allUsersCount: allUsersCount.rows[0].count,
          paidUsersCount: paidUsersCount.rows[0].count
        });
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 确认费用支付成功`, {
        requestId,
        userId,
        expenseId,
        billId,
        paymentId: paymentResult.rows[0].id,
        amount: userSplit.amount,
        payment_method,
        duration
      });

      res.success(200, '支付确认成功', { 
        payment: paymentResult.rows[0],
        message: '支付确认成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 确认费用支付失败`, {
        requestId,
        userId: req.user.sub,
        expenseId: req.params.expenseId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '确认费用支付失败', error.message);
    } finally {
      client.release();
    }
  }

  // 获取费用支付状态
  async getExpensePaymentStatus(req, res) {
    const startTime = Date.now();
    const requestId = `payment-status-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;

      logger.info(`[${requestId}] 开始获取费用支付状态`, {
        requestId,
        userId,
        expenseId
      });

      // 检查费用是否存在
      const expenseCheck = await client.query(
        `SELECT e.*, r.name as room_name
         FROM expenses e
         JOIN rooms r ON e.room_id = r.id
         WHERE e.id = $1`,
        [expenseId]
      );

      if (expenseCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用支付状态失败: 费用不存在`, {
          requestId,
          userId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseCheck.rows[0];

      // 检查用户是否有权限查看此费用
      const permissionCheck = await client.query(
        `SELECT 1 FROM user_room_relations 
         WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [expense.room_id, userId]
      );

      if (permissionCheck.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用支付状态失败: 用户没有权限查看此费用`, {
          requestId,
          userId,
          expenseId,
          roomId: expense.room_id
        });
        
        return res.error(403, '您没有权限查看此费用');
      }

      // 获取费用分摊信息
      const splitDetails = await client.query(
        `SELECT es.*, u.username as user_name
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1`,
        [expenseId]
      );

      // 获取支付记录
      const paymentRecords = await client.query(
        `SELECT ep.*, u.username as user_name
         FROM payments ep
         JOIN users u ON ep.user_id = u.id
         WHERE ep.bill_id = $1
         ORDER BY ep.created_at DESC`,
        [expenseId]
      );

      // 构建支付状态信息
      const paymentStatus = {
        expense_id: expense.id,
        expense_title: expense.title,
        total_amount: expense.amount,
        status: expense.status,
        created_at: expense.created_at,
        expense_date: expense.expense_date,
        splits: splitDetails.rows,
        payments: paymentRecords.rows,
        paid_count: splitDetails.rows.filter(split => split.is_paid).length,
        total_count: splitDetails.rows.length,
        paid_amount: splitDetails.rows
          .filter(split => split.is_paid)
          .reduce((sum, split) => PrecisionCalculator.add(sum, parseFloat(split.amount)), 0)
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用支付状态成功`, {
        requestId,
        userId,
        expenseId,
        paidCount: paymentStatus.paid_count,
        totalCount: paymentStatus.total_count,
        paidAmount: paymentStatus.paid_amount,
        duration
      });

      res.success(200, '获取费用支付状态成功', { payment_status: paymentStatus });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用支付状态失败`, {
        requestId,
        userId: req.user.sub,
        expenseId: req.params.expenseId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取费用支付状态失败', error.message);
    } finally {
      client.release();
    }
  }

  // 获取用户费用支付记录
  async getUserExpensePayments(req, res) {
    const startTime = Date.now();
    const requestId = `user-payments-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const userId = req.user.sub;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      logger.info(`[${requestId}] 开始获取用户费用支付记录`, {
        requestId,
        userId,
        page,
        limit,
        status
      });

      // 构建查询条件
      let whereClause = 'WHERE ep.user_id = $1';
      const queryParams = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND ep.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // 获取支付记录
      const paymentsQuery = `
        SELECT ep.*, e.title as expense_title, r.name as room_name
        FROM expense_payments ep
        JOIN expenses e ON ep.expense_id = e.id
        JOIN rooms r ON e.room_id = r.id
        ${whereClause}
        ORDER BY ep.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const paymentsResult = await client.query(paymentsQuery, queryParams);

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM expense_payments ep
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取用户费用支付记录成功`, {
        requestId,
        userId,
        page,
        limit,
        status,
        total,
        returned: paymentsResult.rows.length,
        duration
      });

      res.success(200, '获取用户费用支付记录成功', {
        payments: paymentsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取用户费用支付记录失败`, {
        requestId,
        userId: req.user.sub,
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取用户费用支付记录失败', error.message);
    } finally {
      client.release();
    }
  }

  // 获取费用统计
  async getExpenseStats(req, res) {
    const startTime = Date.now();
    const requestId = `expense-stats-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { roomId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始获取费用统计`, {
        requestId,
        userId,
        roomId,
        startDate,
        endDate
      });

      // 验证用户是否是寝室成员
      const membershipResult = await client.query(
        'SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用统计失败: 用户不是该寝室的成员`, {
          requestId,
          userId,
          roomId
        });
        
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 构建日期条件
      let dateCondition = '';
      const queryParams = [roomId];
      let paramIndex = 2;

      if (startDate) {
        dateCondition += ` AND e.expense_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        dateCondition += ` AND e.expense_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      // 获取总费用统计
      const totalStatsQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COALESCE(AVG(e.amount), 0) as average_amount
        FROM expenses e
        WHERE e.room_id = $1 ${dateCondition}
      `;

      const totalStatsResult = await client.query(totalStatsQuery, queryParams);

      // 获取按费用类型分组的统计
      const typeStatsQuery = `
        SELECT 
          et.name as type_name,
          et.icon as type_icon,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        WHERE e.room_id = $1 ${dateCondition}
        GROUP BY et.id, et.name, et.icon
        ORDER BY total_amount DESC
      `;

      const typeStatsResult = await client.query(typeStatsQuery, queryParams);

      // 获取按用户分组的统计（作为付款人）
      const payerStatsQuery = `
        SELECT 
          u.id as user_id,
          u.username,
          u.name,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        JOIN users u ON e.payer_id = u.id
        WHERE e.room_id = $1 ${dateCondition}
        GROUP BY u.id, u.username, u.name
        ORDER BY total_amount DESC
      `;

      const payerStatsResult = await client.query(payerStatsQuery, queryParams);

      // 获取按月份分组的统计
      const monthlyStatsQuery = `
        SELECT 
          TO_CHAR(e.expense_date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        WHERE e.room_id = $1 ${dateCondition}
        GROUP BY TO_CHAR(e.expense_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthlyStatsResult = await client.query(monthlyStatsQuery, queryParams);

      // 获取最近10笔费用
      const recentExpensesQuery = `
        SELECT 
          e.id,
          e.title,
          e.amount,
          e.expense_date,
          e.status,
          et.name as type_name,
          et.icon as type_icon,
          u.username as payer_username
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        JOIN users u ON e.payer_id = u.id
        WHERE e.room_id = $1 ${dateCondition}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT 10
      `;

      const recentExpensesResult = await client.query(recentExpensesQuery, queryParams);

      // 构建响应数据
      const statsData = {
        room_id: roomId,
        date_range: {
          start_date: startDate || null,
          end_date: endDate || null
        },
        summary: {
          total_expenses: parseInt(totalStatsResult.rows[0].total_expenses),
          total_amount: PrecisionCalculator.round(parseFloat(totalStatsResult.rows[0].total_amount), 2),
          average_amount: PrecisionCalculator.round(parseFloat(totalStatsResult.rows[0].average_amount), 2)
        },
        by_type: typeStatsResult.rows,
        by_payer: payerStatsResult.rows,
        by_month: monthlyStatsResult.rows,
        recent_expenses: recentExpensesResult.rows
      };
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用统计成功`, {
        requestId,
        userId,
        roomId,
        startDate,
        endDate,
        totalExpenses: statsData.summary.total_expenses,
        totalAmount: statsData.summary.total_amount,
        typeCount: typeStatsResult.rows.length,
        payerCount: payerStatsResult.rows.length,
        monthCount: monthlyStatsResult.rows.length,
        recentCount: recentExpensesResult.rows.length,
        duration
      });

      res.success(200, '获取费用统计成功', statsData);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用统计失败`, {
        requestId,
        userId: req.user.sub,
        roomId: req.params.roomId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取费用统计失败', error.message);
    } finally {
      client.release();
    }
  }

  // 审核费用
  async reviewExpense(req, res) {
    const startTime = Date.now();
    const requestId = `review-expense-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { status, review_notes } = req.body;
      const reviewerId = req.user.sub; // 从认证中间件获取审核人ID
      
      logger.info(`[${requestId}] 开始审核费用`, {
        requestId,
        reviewerId,
        expenseId: id,
        status,
        review_notes
      });

      // 验证费用是否存在
      const expenseResult = await client.query(
        'SELECT * FROM expenses WHERE id = $1',
        [id]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 审核费用失败: 费用不存在`, {
          requestId,
          expenseId: id,
          reviewerId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证费用状态是否为待审核
      if (expense.status !== 'pending') {
        logger.warn(`[${requestId}] 审核费用失败: 费用状态不是待审核`, {
          requestId,
          expenseId: id,
          currentStatus: expense.status
        });
        
        return res.error(400, '只能审核待审核状态的费用');
      }

      // 验证审核状态值
      if (!['approved', 'rejected'].includes(status)) {
        logger.warn(`[${requestId}] 审核费用失败: 无效的审核状态`, {
          requestId,
          expenseId: id,
          status
        });
        
        return res.error(400, '审核状态必须是approved或rejected');
      }

      // 开始事务
      await client.query('BEGIN');

      // 更新费用状态和审核信息
      const updateResult = await client.query(
        `UPDATE expenses 
         SET status = $1, reviewer_id = $2, review_notes = $3, review_date = NOW(), updated_at = NOW()
         WHERE id = $4
         RETURNING id, title, amount, status, reviewer_id, review_notes, review_date`,
        [status, reviewerId, review_notes, id]
      );

      const updatedExpense = updateResult.rows[0];

      // 如果审核通过，创建分摊记录
      if (status === 'approved') {
        // 获取费用分摊信息
        const splitDetails = await client.query(
          'SELECT * FROM expense_split_details WHERE expense_id = $1',
          [id]
        );

        if (splitDetails.rows.length > 0) {
          // 创建分摊记录
          for (const detail of splitDetails.rows) {
            await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, created_at, updated_at) 
               VALUES ($1, $2, $3, NOW(), NOW())`,
              [id, detail.user_id, detail.amount]
            );
          }

          logger.info(`[${requestId}] 创建费用分摊记录成功`, {
            requestId,
            expenseId: id,
            splitCount: splitDetails.rows.length
          });
        }
      }

      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 费用审核成功`, {
        requestId,
        reviewerId,
        expenseId: updatedExpense.id,
        title: updatedExpense.title,
        amount: updatedExpense.amount,
        status: updatedExpense.status,
        review_notes: updatedExpense.review_notes,
        duration
      });

      res.success(200, '费用审核成功', updatedExpense);

    } catch (error) {
      await client.query('ROLLBACK');
      
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 费用审核失败`, {
        requestId,
        reviewerId: req.user.sub,
        expenseId: req.params.id,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    } finally {
      client.release();
    }
  }

  // 获取费用类型列表
  async getExpenseTypes(req, res) {
    const startTime = Date.now();
    const requestId = `get-expense-types-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      logger.info(`[${requestId}] 开始获取费用类型列表`, {
        requestId
      });

      // 从数据库获取费用类型
      const result = await pool.query(
        `SELECT DISTINCT category 
         FROM expenses 
         WHERE category IS NOT NULL 
         ORDER BY category ASC`
      );

      const expenseTypes = result.rows.map(row => row.category);

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用类型列表成功`, {
        requestId,
        count: expenseTypes.length,
        duration
      });

      res.success(200, '获取费用类型列表成功', expenseTypes);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用类型列表失败`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取寝室成员列表
  async getRoomMembers(req, res) {
    const startTime = Date.now();
    const requestId = `room-members-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { room_id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID
      
      logger.info(`[${requestId}] 开始获取寝室成员列表`, {
        requestId,
        userId,
        room_id
      });

      // 验证用户是否属于该寝室
      const roomMemberResult = await client.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, room_id]
      );

      if (roomMemberResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取寝室成员列表失败: 用户不属于该寝室`, {
          requestId,
          userId,
          room_id
        });
        
        return res.error(403, '您不属于该寝室，无法查看寝室成员');
      }

      // 获取寝室所有活跃成员
      const membersResult = await client.query(
        `SELECT u.id, u.username, u.name, u.avatar_url, rm.created_at as joined_at
         FROM users u
         JOIN room_members rm ON u.id = rm.user_id
         WHERE rm.room_id = $1
         ORDER BY rm.created_at`,
        [room_id]
      );
      
      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取寝室成员列表成功`, {
        requestId,
        userId,
        room_id,
        memberCount: membersResult.rows.length,
        duration
      });

      res.success(200, '获取寝室成员列表成功', membersResult.rows);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取寝室成员列表失败`, {
        requestId,
        userId: req.user.sub,
        room_id: req.params.room_id,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取寝室成员列表失败', error.message);
    } finally {
      client.release();
    }
  }

  // 获取费用趋势数据
  async getExpenseTrends(req, res) {
    const startTime = Date.now();
    const requestId = `expense-trends-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { 
        period = 'month', 
        roomId, 
        startDate, 
        endDate 
      } = req.query;
      
      logger.info(`[${requestId}] 开始获取费用趋势数据`, {
        requestId,
        period,
        roomId,
        startDate,
        endDate
      });

      // 构建日期范围查询条件
      let dateFilter = '';
      const queryParams = [];
      
      if (startDate) {
        dateFilter += ` AND expense_date >= $${queryParams.length + 1}`;
        queryParams.push(startDate);
      }
      
      if (endDate) {
        dateFilter += ` AND expense_date <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      // 如果指定了roomId，只查询该寝室的数据
      let roomFilter = '';
      if (roomId) {
        roomFilter += ` AND room_id = $${queryParams.length + 1}`;
        queryParams.push(roomId);
      }

      // 根据时间周期分组
      let dateGroupBy = '';
      switch (period) {
        case 'week':
          dateGroupBy = "DATE_TRUNC('week', expense_date)";
          break;
        case 'month':
          dateGroupBy = "DATE_TRUNC('month', expense_date)";
          break;
        case 'quarter':
          dateGroupBy = "DATE_TRUNC('quarter', expense_date)";
          break;
        case 'year':
          dateGroupBy = "DATE_TRUNC('year', expense_date)";
          break;
        default:
          dateGroupBy = "DATE_TRUNC('month', expense_date)";
      }

      const query = `
        SELECT 
          ${dateGroupBy} as period,
          SUM(amount) as total_amount,
          COUNT(*) as expense_count,
          AVG(amount) as avg_amount
        FROM expenses
        WHERE status != 'deleted'
        ${dateFilter}
        ${roomFilter}
        GROUP BY ${dateGroupBy}
        ORDER BY period ASC
      `;

      const result = await pool.query(query, queryParams);

      // 处理趋势数据，转换为前端需要的格式
      const trends = result.rows.map(row => ({
        period: row.period,
        totalAmount: parseFloat(row.total_amount),
        expenseCount: parseInt(row.expense_count),
        avgAmount: parseFloat(row.avg_amount)
      }));

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用趋势数据成功`, {
        requestId,
        period,
        roomId,
        dataPoints: trends.length,
        duration
      });

      res.success(200, '获取费用趋势数据成功', {
        trends,
        period,
        roomId,
        startDate,
        endDate
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用趋势数据失败`, {
        requestId,
        period: req.query.period,
        roomId: req.query.roomId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用统计
  async getExpenseStatistics(req, res) {
    const startTime = Date.now();
    const requestId = `get-expense-statistics-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { 
        roomId, 
        startDate, 
        endDate,
        period = 'month'
      } = req.query;
      
      logger.info(`[${requestId}] 开始获取费用统计数据`, {
        requestId,
        roomId,
        startDate,
        endDate,
        period
      });

      // 构建查询条件
      let dateFilter = '';
      const queryParams = [];
      
      if (startDate) {
        dateFilter += ` AND expense_date >= $${queryParams.length + 1}`;
        queryParams.push(startDate);
      }
      
      if (endDate) {
        dateFilter += ` AND expense_date <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      let roomFilter = '';
      if (roomId) {
        roomFilter += ` AND room_id = $${queryParams.length + 1}`;
        queryParams.push(roomId);
      }

      // 获取总览统计
      const overviewQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM expenses
        WHERE status != 'deleted'
        ${dateFilter}
        ${roomFilter}
      `;

      const overviewResult = await pool.query(overviewQuery, queryParams);
      const overview = overviewResult.rows[0];

      // 获取按类型统计的数据
      const categoryStatsQuery = `
        SELECT 
          COALESCE(category, '未分类') as category,
          COUNT(*) as expense_count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM expenses
        WHERE status != 'deleted'
        ${dateFilter}
        ${roomFilter}
        GROUP BY category
        ORDER BY total_amount DESC
        LIMIT 10
      `;

      const categoryStatsResult = await pool.query(categoryStatsQuery, queryParams);
      const categoryStats = categoryStatsResult.rows.map(row => ({
        category: row.category,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        avgAmount: parseFloat(row.avg_amount)
      }));

      // 获取趋势数据
      let dateGroupBy = '';
      switch (period) {
        case 'week':
          dateGroupBy = "DATE_TRUNC('week', expense_date)";
          break;
        case 'month':
          dateGroupBy = "DATE_TRUNC('month', expense_date)";
          break;
        case 'quarter':
          dateGroupBy = "DATE_TRUNC('quarter', expense_date)";
          break;
        case 'year':
          dateGroupBy = "DATE_TRUNC('year', expense_date)";
          break;
        default:
          dateGroupBy = "DATE_TRUNC('month', expense_date)";
      }

      const trendsQuery = `
        SELECT 
          ${dateGroupBy} as period,
          SUM(amount) as total_amount,
          COUNT(*) as expense_count,
          AVG(amount) as avg_amount
        FROM expenses
        WHERE status != 'deleted'
        ${dateFilter}
        ${roomFilter}
        GROUP BY ${dateGroupBy}
        ORDER BY period ASC
        LIMIT 12
      `;

      const trendsResult = await pool.query(trendsQuery, queryParams);
      const trends = trendsResult.rows.map(row => ({
        period: row.period,
        totalAmount: parseFloat(row.total_amount),
        expenseCount: parseInt(row.expense_count),
        avgAmount: parseFloat(row.avg_amount)
      }));

      // 获取用户消费排行
      const userStatsQuery = `
        SELECT 
          u.id,
          u.username,
          u.name,
          COUNT(e.id) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COALESCE(AVG(e.amount), 0) as avg_amount
        FROM users u
        LEFT JOIN expenses e ON u.id = e.payer_id
        WHERE e.status != 'deleted' OR e.status IS NULL
        ${dateFilter.replace('AND', 'AND e.id IS NOT NULL AND')}
        ${roomFilter.replace('AND', 'AND e.id IS NOT NULL AND')}
        GROUP BY u.id, u.username, u.name
        HAVING COUNT(e.id) > 0
        ORDER BY total_amount DESC
        LIMIT 10
      `;

      const userStatsResult = await pool.query(userStatsQuery, queryParams);
      const userStats = userStatsResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        name: row.name,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        avgAmount: parseFloat(row.avg_amount)
      }));

      const response = {
        overview: {
          totalExpenses: parseInt(overview.total_expenses),
          totalAmount: parseFloat(overview.total_amount) || 0,
          avgAmount: parseFloat(overview.avg_amount) || 0,
          minAmount: parseFloat(overview.min_amount) || 0,
          maxAmount: parseFloat(overview.max_amount) || 0,
          completedCount: parseInt(overview.completed_count),
          pendingCount: parseInt(overview.pending_count),
          cancelledCount: parseInt(overview.cancelled_count)
        },
        categoryStats,
        trends,
        userStats,
        filters: {
          roomId,
          startDate,
          endDate,
          period
        }
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用统计数据成功`, {
        requestId,
        roomId,
        totalExpenses: response.overview.totalExpenses,
        totalAmount: response.overview.totalAmount,
        duration
      });

      res.success(200, '获取费用统计数据成功', response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用统计数据失败`, {
        requestId,
        roomId: req.query.roomId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用分类统计
  async getExpenseCategoryStats(req, res) {
    const startTime = Date.now();
    const requestId = `expense-category-stats-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { 
        roomId, 
        startDate, 
        endDate 
      } = req.query;
      
      logger.info(`[${requestId}] 开始获取费用分类统计`, {
        requestId,
        roomId,
        startDate,
        endDate
      });

      // 构建查询条件
      let dateFilter = '';
      const queryParams = [];
      
      if (startDate) {
        dateFilter += ` AND expense_date >= $${queryParams.length + 1}`;
        queryParams.push(startDate);
      }
      
      if (endDate) {
        dateFilter += ` AND expense_date <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      let roomFilter = '';
      if (roomId) {
        roomFilter += ` AND room_id = $${queryParams.length + 1}`;
        queryParams.push(roomId);
      }

      // 统计各分类的数据
      const query = `
        SELECT 
          COALESCE(category, '未分类') as category,
          SUM(amount) as total_amount,
          COUNT(*) as expense_count,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM expenses
        WHERE status != 'deleted'
        ${dateFilter}
        ${roomFilter}
        GROUP BY category
        ORDER BY total_amount DESC
      `;

      const result = await pool.query(query, queryParams);

      // 处理统计数据，转换为前端需要的格式
      const categories = result.rows.map(row => ({
        category: row.category,
        totalAmount: parseFloat(row.total_amount),
        expenseCount: parseInt(row.expense_count),
        avgAmount: parseFloat(row.avg_amount),
        minAmount: parseFloat(row.min_amount),
        maxAmount: parseFloat(row.max_amount),
        percentage: 0 // 将在后面计算
      }));

      // 计算总金额和百分比
      const totalAmount = categories.reduce((sum, cat) => sum + cat.totalAmount, 0);
      categories.forEach(cat => {
        cat.percentage = totalAmount > 0 ? (cat.totalAmount / totalAmount * 100) : 0;
      });

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用分类统计成功`, {
        requestId,
        roomId,
        categoryCount: categories.length,
        totalAmount,
        duration
      });

      res.success(200, '获取费用分类统计成功', {
        categories,
        summary: {
          totalAmount,
          totalCount: categories.reduce((sum, cat) => sum + cat.expenseCount, 0),
          categoryCount: categories.length
        },
        roomId,
        startDate,
        endDate
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用分类统计失败`, {
        requestId,
        roomId: req.query.roomId,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取寝室成员列表
  async getRoomMembers(req, res) {
    const startTime = Date.now();
    const requestId = `get-room-members-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { room_id } = req.params;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始获取寝室成员列表`, {
        requestId,
        roomId: room_id,
        userId
      });

      // 验证用户是否是该寝室的成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取寝室成员列表失败: 用户不是该寝室的成员`, {
          requestId,
          roomId: room_id,
          userId
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 获取寝室成员列表
      const membersResult = await pool.query(
        `SELECT u.id, u.username, u.name, u.email, u.phone, 
                r.role as room_role, r.joined_at,
                COALESCE(es.paid_count, 0) as expense_count,
                COALESCE(es.total_paid, 0) as total_paid
         FROM users u
         JOIN user_room_relations r ON u.id = r.user_id
         LEFT JOIN (
           SELECT 
             user_id,
             COUNT(*) as paid_count,
             SUM(amount) as total_paid
           FROM expense_splits 
           WHERE is_paid = TRUE
           GROUP BY user_id
         ) es ON u.id = es.user_id
         WHERE r.room_id = $1 AND r.is_active = TRUE
         ORDER BY r.joined_at ASC`,
        [room_id]
      );

      const members = membersResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        phone: row.phone,
        roomRole: row.room_role,
        joinedAt: row.joined_at,
        expenseCount: parseInt(row.expense_count),
        totalPaid: parseFloat(row.total_paid)
      }));

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取寝室成员列表成功`, {
        requestId,
        roomId: room_id,
        memberCount: members.length,
        duration
      });

      res.success(200, '获取寝室成员列表成功', {
        members,
        roomId: room_id,
        totalMembers: members.length
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取寝室成员列表失败`, {
        requestId,
        roomId: req.params.room_id,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用统计
  async getExpenseStats(req, res) {
    const startTime = Date.now();
    const requestId = `get-expense-stats-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { roomId } = req.params;
      const userId = req.user.sub;
      const { start_date, end_date } = req.query;
      
      logger.info(`[${requestId}] 开始获取费用统计`, {
        requestId,
        roomId,
        userId,
        start_date,
        end_date
      });

      // 验证用户是否是该寝室的成员
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用统计失败: 用户不是该寝室的成员`, {
          requestId,
          roomId,
          userId
        });
        
        return res.error(403, '您不是该寝室的成员');
      }

      // 构建日期过滤条件
      let dateFilter = '';
      const queryParams = [roomId];
      
      if (start_date) {
        dateFilter += ` AND expense_date >= $${queryParams.length + 1}`;
        queryParams.push(start_date);
      }
      
      if (end_date) {
        dateFilter += ` AND expense_date <= $${queryParams.length + 1}`;
        queryParams.push(end_date);
      }

      // 获取费用统计
      const statsQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM expenses
        WHERE room_id = $1 ${dateFilter}
      `;

      const result = await pool.query(statsQuery, queryParams);
      const stats = result.rows[0];

      // 获取按类型统计的数据
      const typeStatsQuery = `
        SELECT 
          et.name as type_name,
          COUNT(*) as expense_count,
          SUM(e.amount) as total_amount,
          AVG(e.amount) as avg_amount
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        WHERE e.room_id = $1 ${dateFilter}
        GROUP BY et.id, et.name
        ORDER BY total_amount DESC
      `;

      const typeStatsResult = await pool.query(typeStatsQuery, [roomId]);
      const typeStats = typeStatsResult.rows.map(row => ({
        typeName: row.type_name,
        expenseCount: parseInt(row.expense_count),
        totalAmount: parseFloat(row.total_amount),
        avgAmount: parseFloat(row.avg_amount)
      }));

      const response = {
        overview: {
          totalExpenses: parseInt(stats.total_expenses),
          totalAmount: parseFloat(stats.total_amount) || 0,
          avgAmount: parseFloat(stats.avg_amount) || 0,
          minAmount: parseFloat(stats.min_amount) || 0,
          maxAmount: parseFloat(stats.max_amount) || 0,
          completedCount: parseInt(stats.completed_count),
          pendingCount: parseInt(stats.pending_count),
          cancelledCount: parseInt(stats.cancelled_count)
        },
        byType: typeStats,
        roomId,
        startDate: start_date,
        endDate: end_date
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用统计成功`, {
        requestId,
        roomId,
        totalExpenses: response.overview.totalExpenses,
        totalAmount: response.overview.totalAmount,
        duration
      });

      res.success(200, '获取费用统计成功', response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用统计失败`, {
        requestId,
        roomId: req.params.roomId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 确认分摊
  async confirmSplitPayment(req, res) {
    const startTime = Date.now();
    const requestId = `confirm-split-payment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      const { split_id, payment_method, transaction_id } = req.body;
      
      logger.info(`[${requestId}] 开始确认分摊支付`, {
        requestId,
        expenseId,
        splitId: split_id,
        userId,
        payment_method,
        transaction_id
      });

      // 验证必填字段
      if (!payment_method || !transaction_id) {
        logger.warn(`[${requestId}] 确认分摊支付失败: 缺少必填字段`, {
          requestId,
          expenseId,
          splitId: split_id,
          userId
        });
        
        return res.error(400, '请提供支付方式和交易ID');
      }

      // 开始事务
      await client.query('BEGIN');

      // 验证分摊记录是否存在且属于当前用户
      const splitCheck = await client.query(
        `SELECT es.*, e.title, e.amount as expense_amount
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         WHERE es.id = $1 AND es.expense_id = $2 AND es.user_id = $3`,
        [split_id, expenseId, userId]
      );

      if (splitCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 确认分摊支付失败: 分摊记录不存在或无权操作`, {
          requestId,
          expenseId,
          splitId: split_id,
          userId
        });
        
        return res.error(404, '分摊记录不存在或无权操作');
      }

      const split = splitCheck.rows[0];

      // 更新分摊记录状态
      const updateResult = await client.query(
        `UPDATE expense_splits 
         SET is_paid = TRUE, 
             paid_date = NOW(), 
             payment_method = $1, 
             transaction_id = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [payment_method, transaction_id, split_id]
      );

      // 记录支付信息
      const paymentResult = await client.query(
        `INSERT INTO expense_payments 
         (expense_id, user_id, split_id, amount, payment_method, transaction_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW(), NOW())
         RETURNING *`,
        [expenseId, userId, split_id, split.amount, payment_method, transaction_id]
      );

      await client.query('COMMIT');

      const response = {
        split: updateResult.rows[0],
        payment: paymentResult.rows[0]
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 确认分摊支付成功`, {
        requestId,
        expenseId,
        splitId: split_id,
        amount: split.amount,
        duration
      });

      res.success(200, '确认分摊支付成功', response);

    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 确认分摊支付失败`, {
        requestId,
        expenseId: req.params.expenseId,
        splitId: req.body.split_id,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    } finally {
      client.release();
    }
  }

  // 智能计算分摊
  async calculateSmartSplit(req, res) {
    const startTime = Date.now();
    const requestId = `calculate-smart-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      const { split_method, members, preferences } = req.body;
      
      logger.info(`[${requestId}] 开始智能计算分摊`, {
        requestId,
        expenseId,
        userId,
        split_method,
        members
      });

      // 验证费用是否存在
      const expenseResult = await pool.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 智能计算分摊失败: 费用不存在`, {
          requestId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户权限
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 智能计算分摊失败: 用户无权操作此费用`, {
          requestId,
          expenseId,
          userId
        });
        
        return res.error(403, '您无权操作此费用');
      }

      // 智能分摊计算逻辑
      let splitResult = [];
      const totalAmount = parseFloat(expense.amount);
      
      if (split_method === 'equal') {
        // 平均分摊
        const memberCount = members.length;
        const baseAmount = Math.floor(totalAmount / memberCount * 100) / 100; // 保留两位小数
        let remainingAmount = totalAmount;
        
        for (let i = 0; i < memberCount; i++) {
          const amount = i === memberCount - 1 ? 
            remainingAmount : baseAmount;
          splitResult.push({
            user_id: members[i],
            amount: amount,
            percentage: (amount / totalAmount * 100).toFixed(2)
          });
          remainingAmount -= amount;
        }
      } else if (split_method === 'by_area') {
        // 按面积分摊（需要用户体重数据）
        // 这里简化处理，实际应该从用户配置中获取
        const memberCount = members.length;
        const avgAmount = totalAmount / memberCount;
        
        for (const memberId of members) {
          splitResult.push({
            user_id: memberId,
            amount: avgAmount,
            percentage: (avgAmount / totalAmount * 100).toFixed(2)
          });
        }
      } else if (split_method === 'percentage') {
        // 按百分比分摊
        let totalPercentage = 0;
        
        for (const member of members) {
          const percentage = parseFloat(member.percentage);
          const amount = (totalAmount * percentage / 100);
          splitResult.push({
            user_id: member.user_id,
            amount: amount,
            percentage: percentage.toFixed(2)
          });
          totalPercentage += percentage;
        }
        
        // 调整误差，确保总和等于总金额
        if (Math.abs(totalPercentage - 100) > 0.01) {
          const lastItem = splitResult[splitResult.length - 1];
          lastItem.amount = totalAmount - splitResult
            .slice(0, -1)
            .reduce((sum, item) => sum + item.amount, 0);
          lastItem.percentage = ((lastItem.amount / totalAmount) * 100).toFixed(2);
        }
      }

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 智能计算分摊成功`, {
        requestId,
        expenseId,
        method: split_method,
        memberCount: splitResult.length,
        duration
      });

      res.success(200, '智能计算分摊成功', {
        expense_id: expenseId,
        split_method,
        splits: splitResult,
        total_amount: totalAmount,
        calculated_at: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 智能计算分摊失败`, {
        requestId,
        expenseId: req.params.expenseId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取费用二维码
  async getExpenseQrCode(req, res) {
    const startTime = Date.now();
    const requestId = `get-expense-qrcode-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始生成费用二维码`, {
        requestId,
        expenseId,
        userId
      });

      // 验证费用是否存在
      const expenseResult = await pool.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 生成费用二维码失败: 费用不存在`, {
          requestId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户权限
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 生成费用二维码失败: 用户无权查看此费用`, {
          requestId,
          expenseId,
          userId
        });
        
        return res.error(403, '您无权查看此费用');
      }

      // 生成二维码内容（简化处理）
      const qrData = {
        expense_id: expenseId,
        title: expense.title,
        amount: expense.amount,
        room_id: expense.room_id,
        payer_id: expense.payer_id,
        expense_date: expense.expense_date,
        status: expense.status
      };

      // 将数据编码为URL参数（实际项目中应该使用专门的二维码库）
      const qrContent = JSON.stringify(qrData);
      const encodedData = Buffer.from(qrContent).toString('base64');
      const qrUrl = `expense://pay?data=${encodedData}`;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 生成费用二维码成功`, {
        requestId,
        expenseId,
        userId,
        duration
      });

      res.success(200, '获取费用二维码成功', {
        expenseId,
        qr_code_url: qrUrl,
        qr_data: qrData,
        expire_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时有效期
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 生成费用二维码失败`, {
        requestId,
        expenseId: req.params.expenseId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 创建费用分摊
  async createExpenseSplit(req, res) {
    const startTime = Date.now();
    const requestId = `create-expense-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { id: expenseId } = req.params;
      const { splits } = req.body;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始创建费用分摊`, {
        requestId,
        expenseId,
        userId,
        splits
      });

      // 验证费用是否存在
      const expenseResult = await client.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 创建费用分摊失败: 费用不存在`, {
          requestId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户权限
      const membershipResult = await client.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 创建费用分摊失败: 用户无权操作此费用`, {
          requestId,
          expenseId,
          userId
        });
        
        return res.error(403, '您无权操作此费用');
      }

      // 验证分摊参数
      if (!splits || !Array.isArray(splits) || splits.length === 0) {
        logger.warn(`[${requestId}] 创建费用分摊失败: 无效的分摊参数`, {
          requestId,
          expenseId,
          splits
        });
        
        return res.error(400, '请提供有效的分摊参数');
      }

      // 开始事务
      await client.query('BEGIN');

      // 验证总金额
      const totalAmount = splits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
      if (Math.abs(totalAmount - expense.amount) > 0.01) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 创建费用分摊失败: 分摊金额不匹配`, {
          requestId,
          expenseId,
          expenseAmount: expense.amount,
          splitTotal: totalAmount
        });
        
        return res.error(400, `分摊金额总和(${totalAmount})与费用金额(${expense.amount})不匹配`);
      }

      // 删除现有的分摊记录
      await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);

      // 创建新的分摊记录
      const createdSplits = [];
      for (const split of splits) {
        const result = await client.query(
          `INSERT INTO expense_splits 
           (expense_id, user_id, amount, is_paid, created_at, updated_at)
           VALUES ($1, $2, $3, FALSE, NOW(), NOW())
           RETURNING *`,
          [expenseId, split.user_id, split.amount]
        );
        createdSplits.push(result.rows[0]);
      }

      // 更新费用状态
      await client.query(
        'UPDATE expenses SET status = $1, updated_at = NOW() WHERE id = $2',
        ['pending', expenseId]
      );

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 创建费用分摊成功`, {
        requestId,
        expenseId,
        splitCount: createdSplits.length,
        duration
      });

      res.success(200, '创建费用分摊成功', {
        expense_id: expenseId,
        splits: createdSplits
      });

    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 创建费用分摊失败`, {
        requestId,
        expenseId: req.params.id,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    } finally {
      client.release();
    }
  }

  // 获取费用分摊记录
  async getExpenseSplits(req, res) {
    const startTime = Date.now();
    const requestId = `get-expense-splits-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { expenseId } = req.params;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始获取费用分摊记录`, {
        requestId,
        expenseId,
        userId
      });

      // 验证费用是否存在
      const expenseResult = await pool.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用分摊记录失败: 费用不存在`, {
          requestId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证用户权限
      const membershipResult = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取费用分摊记录失败: 用户无权查看此费用`, {
          requestId,
          expenseId,
          userId
        });
        
        return res.error(403, '您无权查看此费用');
      }

      // 获取分摊记录
      const splitsResult = await pool.query(
        `SELECT es.*, u.username, u.name as user_name, u.avatar_url
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY es.created_at ASC`,
        [expenseId]
      );

      const splits = splitsResult.rows.map(row => ({
        id: row.id,
        expenseId: row.expense_id,
        userId: row.user_id,
        username: row.username,
        userName: row.user_name,
        avatarUrl: row.avatar_url,
        amount: parseFloat(row.amount),
        isPaid: row.is_paid,
        paidDate: row.paid_date,
        paymentMethod: row.payment_method,
        transactionId: row.transaction_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用分摊记录成功`, {
        requestId,
        expenseId,
        splitCount: splits.length,
        duration
      });

      res.success(200, '获取费用分摊记录成功', {
        expense: {
          id: expense.id,
          title: expense.title,
          amount: parseFloat(expense.amount),
          status: expense.status
        },
        splits,
        totalSplits: splits.length,
        paidSplits: splits.filter(s => s.isPaid).length
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用分摊记录失败`, {
        requestId,
        expenseId: req.params.expenseId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 获取用户费用分摊记录
  async getUserExpenseSplit(req, res) {
    const startTime = Date.now();
    const requestId = `get-user-expense-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    try {
      const { expenseId, userId: targetUserId } = req.params;
      const currentUserId = req.user.sub;
      
      logger.info(`[${requestId}] 开始获取用户费用分摊记录`, {
        requestId,
        expenseId,
        targetUserId,
        currentUserId
      });

      // 验证费用是否存在
      const expenseResult = await pool.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取用户费用分摊记录失败: 费用不存在`, {
          requestId,
          expenseId
        });
        
        return res.error(404, '费用不存在');
      }

      const expense = expenseResult.rows[0];

      // 验证当前用户权限
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [currentUserId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取用户费用分摊记录失败: 当前用户无权查看此费用`, {
          requestId,
          expenseId,
          currentUserId
        });
        
        return res.error(403, '您无权查看此费用');
      }

      // 获取指定用户的分摊记录
      const splitResult = await pool.query(
        `SELECT es.*, u.username, u.name as user_name, u.avatar_url,
                p.title as expense_title, p.amount as expense_amount
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         JOIN expenses p ON es.expense_id = p.id
         WHERE es.expense_id = $1 AND es.user_id = $2`,
        [expenseId, targetUserId]
      );

      if (splitResult.rows.length === 0) {
        logger.warn(`[${requestId}] 获取用户费用分摊记录失败: 分摊记录不存在`, {
          requestId,
          expenseId,
          targetUserId
        });
        
        return res.error(404, '用户分摊记录不存在');
      }

      const split = splitResult.rows[0];

      const response = {
        split: {
          id: split.id,
          expenseId: split.expense_id,
          userId: split.user_id,
          username: split.username,
          userName: split.user_name,
          avatarUrl: split.avatar_url,
          amount: parseFloat(split.amount),
          isPaid: split.is_paid,
          paidDate: split.paid_date,
          paymentMethod: split.payment_method,
          transactionId: split.transaction_id,
          createdAt: split.created_at,
          updatedAt: split.updated_at
        },
        expense: {
          id: split.expense_id,
          title: split.expense_title,
          amount: parseFloat(split.expense_amount)
        }
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取用户费用分摊记录成功`, {
        requestId,
        expenseId,
        targetUserId,
        amount: split.amount,
        isPaid: split.is_paid,
        duration
      });

      res.success(200, '获取用户费用分摊记录成功', response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取用户费用分摊记录失败`, {
        requestId,
        expenseId: req.params.expenseId,
        targetUserId: req.params.userId,
        currentUserId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    }
  }

  // 确认分摊
  async confirmSplit(req, res) {
    const startTime = Date.now();
    const requestId = `confirm-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { splitId } = req.params;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始确认分摊`, {
        requestId,
        splitId,
        userId
      });

      // 开始事务
      await client.query('BEGIN');

      // 验证分摊记录是否存在且属于当前用户
      const splitCheck = await client.query(
        `SELECT es.*, e.title, e.room_id, e.status as expense_status
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         WHERE es.id = $1 AND es.user_id = $2`,
        [splitId, userId]
      );

      if (splitCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 确认分摊失败: 分摊记录不存在或无权操作`, {
          requestId,
          splitId,
          userId
        });
        
        return res.error(404, '分摊记录不存在或无权操作');
      }

      const split = splitCheck.rows[0];

      // 如果已经确认过，返回错误
      if (split.is_paid) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 确认分摊失败: 分摊已经确认`, {
          requestId,
          splitId,
          userId
        });
        
        return res.error(400, '分摊已经确认');
      }

      // 更新分摊状态
      const updateResult = await client.query(
        `UPDATE expense_splits 
         SET is_paid = TRUE, 
             paid_date = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [splitId]
      );

      await client.query('COMMIT');

      const updatedSplit = updateResult.rows[0];
      const response = {
        split: {
          id: updatedSplit.id,
          expenseId: updatedSplit.expense_id,
          userId: updatedSplit.user_id,
          amount: parseFloat(updatedSplit.amount),
          isPaid: updatedSplit.is_paid,
          paidDate: updatedSplit.paid_date,
          createdAt: updatedSplit.created_at,
          updatedAt: updatedSplit.updated_at
        },
        expense: {
          id: split.expense_id,
          title: split.title,
          status: split.expense_status
        }
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 确认分摊成功`, {
        requestId,
        splitId,
        userId,
        amount: split.amount,
        duration
      });

      res.success(200, '确认分摊成功', response);

    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 确认分摊失败`, {
        requestId,
        splitId: req.params.splitId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    } finally {
      client.release();
    }
  }

  // 结算分摊
  async settleSplit(req, res) {
    const startTime = Date.now();
    const requestId = `settle-split-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const client = await pool.connect();
    
    try {
      const { splitId } = req.params;
      const { settlement_method, notes } = req.body;
      const userId = req.user.sub;
      
      logger.info(`[${requestId}] 开始结算分摊`, {
        requestId,
        splitId,
        userId,
        settlement_method,
        notes
      });

      // 验证必填字段
      if (!settlement_method) {
        logger.warn(`[${requestId}] 结算分摊失败: 缺少必填字段`, {
          requestId,
          splitId,
          userId
        });
        
        return res.error(400, '请提供结算方式');
      }

      // 开始事务
      await client.query('BEGIN');

      // 验证分摊记录是否存在且属于当前用户
      const splitCheck = await client.query(
        `SELECT es.*, e.title, e.room_id, e.status as expense_status,
                payer.name as payer_name
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         JOIN users payer ON e.payer_id = payer.id
         WHERE es.id = $1 AND es.user_id = $2`,
        [splitId, userId]
      );

      if (splitCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 结算分摊失败: 分摊记录不存在或无权操作`, {
          requestId,
          splitId,
          userId
        });
        
        return res.error(404, '分摊记录不存在或无权操作');
      }

      const split = splitCheck.rows[0];

      // 验证分摊状态
      if (!split.is_paid) {
        await client.query('ROLLBACK');
        logger.warn(`[${requestId}] 结算分摊失败: 分摊未确认支付`, {
          requestId,
          splitId,
          userId
        });
        
        return res.error(400, '请先确认支付再进行结算');
      }

      // 更新分摊记录状态为已结算
      const updateResult = await client.query(
        `UPDATE expense_splits 
         SET is_settled = TRUE,
             settlement_method = $1,
             settlement_notes = $2,
             settled_date = NOW(),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [settlement_method, notes || '', splitId]
      );

      await client.query('COMMIT');

      const updatedSplit = updateResult.rows[0];
      const response = {
        split: {
          id: updatedSplit.id,
          expenseId: updatedSplit.expense_id,
          userId: updatedSplit.user_id,
          amount: parseFloat(updatedSplit.amount),
          isPaid: updatedSplit.is_paid,
          isSettled: updatedSplit.is_settled,
          paidDate: updatedSplit.paid_date,
          settlementMethod: updatedSplit.settlement_method,
          settlementNotes: updatedSplit.settlement_notes,
          settledDate: updatedSplit.settled_date,
          createdAt: updatedSplit.created_at,
          updatedAt: updatedSplit.updated_at
        },
        expense: {
          id: split.expense_id,
          title: split.title,
          status: split.expense_status,
          payerName: split.payer_name
        }
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 结算分摊成功`, {
        requestId,
        splitId,
        userId,
        amount: split.amount,
        settlement_method,
        duration
      });

      res.success(200, '结算分摊成功', response);

    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 结算分摊失败`, {
        requestId,
        splitId: req.params.splitId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '服务器内部错误', error.message);
    } finally {
      client.release();
    }
  }
}

module.exports = new ExpenseController();