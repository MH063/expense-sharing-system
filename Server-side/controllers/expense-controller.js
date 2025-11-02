const { pool } = require('../config/db');
const winston = require('winston');

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
    try {
      const { 
        title, 
        description, 
        amount, 
        expense_type_id, 
        room_id, 
        paid_by, 
        split_type, 
        split_details,
        expense_date,
        receipt_image_url,
        tags
      } = req.body;
      const creatorId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!title || !amount || !expense_type_id || !room_id || !paid_by || !split_type) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [creatorId, room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 验证费用类型是否存在
      const expenseTypeResult = await pool.query(
        'SELECT * FROM expense_types WHERE id = $1',
        [expense_type_id]
      );

      if (expenseTypeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用类型不存在'
        });
      }

      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 插入费用记录
        const expenseResult = await client.query(
          `INSERT INTO expenses 
           (title, description, amount, expense_type_id, room_id, paid_by, split_type, 
            expense_date, receipt_image_url, tags, creator_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) 
           RETURNING id, title, description, amount, expense_type_id, room_id, paid_by, 
                    split_type, expense_date, receipt_image_url, tags, creator_id, created_at`,
          [
            title, 
            description || '', 
            amount, 
            expense_type_id, 
            room_id, 
            paid_by, 
            split_type, 
            expense_date || new Date().toISOString().split('T')[0], 
            receipt_image_url || '', 
            tags || [], 
            creatorId
          ]
        );

        const expense = expenseResult.rows[0];

        // 根据分摊类型创建分摊记录
        let splitRecords = [];
        
        if (split_type === 'equal') {
          // 平均分摊
          const membersResult = await client.query(
            `SELECT user_id FROM user_room_relations 
             WHERE room_id = $1 AND is_active = TRUE`,
            [room_id]
          );
          
          const members = membersResult.rows;
          const splitAmount = parseFloat(amount) / members.length;
          
          for (const member of members) {
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, split_type, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, NOW(), NOW()) 
               RETURNING id, expense_id, user_id, amount, split_type`,
              [expense.id, member.user_id, splitAmount, split_type]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
        } else if (split_type === 'custom' && split_details && split_details.length > 0) {
          // 自定义分摊
          for (const detail of split_details) {
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, split_type, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, NOW(), NOW()) 
               RETURNING id, expense_id, user_id, amount, split_type`,
              [expense.id, detail.user_id, detail.amount, split_type]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
        } else if (split_type === 'percentage' && split_details && split_details.length > 0) {
          // 百分比分摊
          for (const detail of split_details) {
            const splitAmount = parseFloat(amount) * parseFloat(detail.percentage) / 100;
            const splitRecord = await client.query(
              `INSERT INTO expense_splits 
               (expense_id, user_id, amount, split_type, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, NOW(), NOW()) 
               RETURNING id, expense_id, user_id, amount, split_type`,
              [expense.id, detail.user_id, splitAmount, split_type]
            );
            splitRecords.push(splitRecord.rows[0]);
          }
        } else {
          throw new Error('无效的分摊类型或缺少分摊详情');
        }

        await client.query('COMMIT');

        // 获取完整的费用信息
        const fullExpenseResult = await pool.query(
          `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.paid_by, 
                  e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.creator_id, e.created_at,
                  et.name as expense_type_name, et.icon as expense_type_icon,
                  u.username as paid_by_username, u.name as paid_by_name
           FROM expenses e
           JOIN expense_types et ON e.expense_type_id = et.id
           JOIN users u ON e.paid_by = u.id
           WHERE e.id = $1`,
          [expense.id]
        );

        const fullExpense = fullExpenseResult.rows[0];
        fullExpense.splits = splitRecords;

        logger.info(`费用记录创建成功: ${title} (ID: ${expense.id})`);

        res.status(201).json({
          success: true,
          message: '费用记录创建成功',
          data: fullExpense
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('费用记录创建失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        paid_by, 
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
        'SELECT room_id FROM user_room_relations WHERE user_id = $1 AND is_active = TRUE',
        [userId]
      );
      
      const userRoomIds = userRoomsResult.rows.map(row => row.room_id);
      
      if (userRoomIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: '获取费用列表成功',
          data: {
            expenses: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0
            }
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

      if (paid_by) {
        conditions.push(`e.paid_by = $${paramIndex++}`);
        queryParams.push(paid_by);
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
        SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.paid_by, 
               e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.created_at,
               et.name as expense_type_name, et.icon as expense_type_icon,
               u.username as paid_by_username, u.name as paid_by_name,
               r.name as room_name
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        JOIN users u ON e.paid_by = u.id
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

      logger.info(`获取费用列表成功，共 ${totalCount} 条记录`);

      res.status(200).json({
        success: true,
        message: '获取费用列表成功',
        data: {
          expenses,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取费用列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取费用详情
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 查询费用基本信息
      const expenseResult = await pool.query(
        `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.paid_by, 
                e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.creator_id, e.created_at, e.updated_at,
                et.name as expense_type_name, et.icon as expense_type_icon,
                u.username as paid_by_username, u.name as paid_by_name,
                r.name as room_name
         FROM expenses e
         JOIN expense_types et ON e.expense_type_id = et.id
         JOIN users u ON e.paid_by = u.id
         JOIN rooms r ON e.room_id = r.id
         WHERE e.id = $1`,
        [id]
      );

      if (expenseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限查看该费用（必须是寝室成员）
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看该费用记录'
        });
      }

      // 查询分摊详情
      const splitsResult = await pool.query(
        `SELECT es.id, es.user_id, es.amount, es.split_type, es.is_paid, es.paid_date, es.created_at,
                u.username, u.name
         FROM expense_splits es
         JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY u.username`,
        [id]
      );

      expense.splits = splitsResult.rows;

      logger.info(`获取费用详情成功: ${expense.title} (ID: ${expense.id})`);

      res.status(200).json({
        success: true,
        message: '获取费用详情成功',
        data: expense
      });

    } catch (error) {
      logger.error('获取费用详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新费用记录
  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        amount, 
        expense_type_id, 
        paid_by, 
        split_type, 
        split_details,
        expense_date,
        receipt_image_url,
        tags,
        status
      } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用是否存在
      const expenseResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

      if (expenseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限更新费用（创建者或支付者）
      if (expense.creator_id !== userId && expense.paid_by !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有费用创建者或支付者可以更新费用记录'
        });
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, expense.room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
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
          updateValues.push(amount);
        }

        if (expense_type_id !== undefined) {
          updateFields.push(`expense_type_id = $${paramIndex++}`);
          updateValues.push(expense_type_id);
        }

        if (paid_by !== undefined) {
          updateFields.push(`paid_by = $${paramIndex++}`);
          updateValues.push(paid_by);
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

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        // 执行更新
        const updateQuery = `
          UPDATE expenses 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, title, description, amount, expense_type_id, room_id, paid_by, 
                   split_type, expense_date, receipt_image_url, tags, status, updated_at
        `;

        const result = await client.query(updateQuery, updateValues);
        const updatedExpense = result.rows[0];

        // 如果分摊类型或金额发生变化，需要更新分摊记录
        if (split_type !== undefined || amount !== undefined) {
          // 删除原有分摊记录
          await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);

          // 重新创建分摊记录
          let splitRecords = [];
          const finalAmount = amount !== undefined ? amount : expense.amount;
          const finalSplitType = split_type !== undefined ? split_type : expense.split_type;
          
          if (finalSplitType === 'equal') {
            // 平均分摊
            const membersResult = await client.query(
              `SELECT user_id FROM user_room_relations 
               WHERE room_id = $1 AND is_active = TRUE`,
              [expense.room_id]
            );
            
            const members = membersResult.rows;
            const splitAmount = parseFloat(finalAmount) / members.length;
            
            for (const member of members) {
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, split_type, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount, split_type`,
                [id, member.user_id, splitAmount, finalSplitType]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
          } else if (finalSplitType === 'custom' && split_details && split_details.length > 0) {
            // 自定义分摊
            for (const detail of split_details) {
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, split_type, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount, split_type`,
                [id, detail.user_id, detail.amount, finalSplitType]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
          } else if (finalSplitType === 'percentage' && split_details && split_details.length > 0) {
            // 百分比分摊
            for (const detail of split_details) {
              const splitAmount = parseFloat(finalAmount) * parseFloat(detail.percentage) / 100;
              const splitRecord = await client.query(
                `INSERT INTO expense_splits 
                 (expense_id, user_id, amount, split_type, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, NOW(), NOW()) 
                 RETURNING id, expense_id, user_id, amount, split_type`,
                [id, detail.user_id, splitAmount, finalSplitType]
              );
              splitRecords.push(splitRecord.rows[0]);
            }
          } else {
            throw new Error('无效的分摊类型或缺少分摊详情');
          }
        }

        await client.query('COMMIT');

        // 获取完整的费用信息
        const fullExpenseResult = await pool.query(
          `SELECT e.id, e.title, e.description, e.amount, e.expense_type_id, e.room_id, e.paid_by, 
                  e.split_type, e.expense_date, e.receipt_image_url, e.tags, e.status, e.created_at, e.updated_at,
                  et.name as expense_type_name, et.icon as expense_type_icon,
                  u.username as paid_by_username, u.name as paid_by_name
           FROM expenses e
           JOIN expense_types et ON e.expense_type_id = et.id
           JOIN users u ON e.paid_by = u.id
           WHERE e.id = $1`,
          [id]
        );

        const fullExpense = fullExpenseResult.rows[0];

        logger.info(`费用记录更新成功: ${fullExpense.title} (ID: ${fullExpense.id})`);

        res.status(200).json({
          success: true,
          message: '费用记录更新成功',
          data: fullExpense
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('费用记录更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除费用记录
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用是否存在
      const expenseResult = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

      if (expenseResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }

      const expense = expenseResult.rows[0];

      // 验证用户是否有权限删除费用（只有创建者可以删除）
      if (expense.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有费用创建者可以删除费用记录'
        });
      }

      // 开始事务
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 删除分摊记录
        await client.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);

        // 删除费用记录
        await client.query('DELETE FROM expenses WHERE id = $1', [id]);

        await client.query('COMMIT');

        logger.info(`费用记录删除成功: ${expense.title} (ID: ${expense.id})`);

        res.status(200).json({
          success: true,
          message: '费用记录删除成功'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('费用记录删除失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 确认支付分摊金额
  async confirmSplitPayment(req, res) {
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
        return res.status(404).json({
          success: false,
          message: '分摊记录不存在'
        });
      }

      const split = splitResult.rows[0];

      // 验证用户是否有权限确认支付（只有分摊人本人可以确认）
      if (split.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: '只有分摊人本人可以确认支付'
        });
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, split.room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 更新支付状态
      const updateResult = await pool.query(
        `UPDATE expense_splits 
         SET is_paid = TRUE, paid_date = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, expense_id, user_id, amount, split_type, is_paid, paid_date`,
        [paid_date || new Date().toISOString().split('T')[0], id]
      );

      const updatedSplit = updateResult.rows[0];

      logger.info(`分摊支付确认成功: 分摊ID ${updatedSplit.id}, 用户ID ${userId}`);

      res.status(200).json({
        success: true,
        message: '支付确认成功',
        data: updatedSplit
      });

    } catch (error) {
      logger.error('分摊支付确认失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 智能分摊计算
  async calculateSmartSplit(req, res) {
    try {
      const { room_id, amount, split_type, split_details } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!room_id || !amount || !split_type) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }

      // 验证用户是否是寝室成员
      const membershipResult = await pool.query(
        'SELECT * FROM user_room_relations WHERE user_id = $1 AND room_id = $2 AND is_active = TRUE',
        [userId, room_id]
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 获取寝室成员
      const membersResult = await pool.query(
        `SELECT u.id, u.username, u.name 
         FROM user_room_relations urr
         JOIN users u ON urr.user_id = u.id
         WHERE urr.room_id = $1 AND urr.is_active = TRUE
         ORDER BY u.username`,
        [room_id]
      );

      const members = membersResult.rows;
      const totalAmount = parseFloat(amount);

      // 根据分摊类型计算分摊结果
      let splitResult = [];

      if (split_type === 'equal') {
        // 平均分摊
        const splitAmount = totalAmount / members.length;
        
        for (const member of members) {
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: splitAmount.toFixed(2)
          });
        }
      } else if (split_type === 'custom' && split_details && split_details.length > 0) {
        // 自定义分摊
        const splitDetailsMap = new Map();
        
        // 将分摊详情转换为Map
        for (const detail of split_details) {
          splitDetailsMap.set(detail.user_id, parseFloat(detail.amount));
        }
        
        // 为每个成员计算分摊金额
        for (const member of members) {
          const amount = splitDetailsMap.get(member.id) || 0;
          
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: amount.toFixed(2)
          });
        }
      } else if (split_type === 'percentage' && split_details && split_details.length > 0) {
        // 百分比分摊
        const splitDetailsMap = new Map();
        
        // 将分摊详情转换为Map
        for (const detail of split_details) {
          splitDetailsMap.set(detail.user_id, parseFloat(detail.percentage));
        }
        
        // 为每个成员计算分摊金额
        for (const member of members) {
          const percentage = splitDetailsMap.get(member.id) || 0;
          const amount = totalAmount * percentage / 100;
          
          splitResult.push({
            user_id: member.id,
            username: member.username,
            name: member.name,
            amount: amount.toFixed(2),
            percentage: percentage
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: '无效的分摊类型或缺少分摊详情'
        });
      }

      // 计算总和验证
      const calculatedTotal = splitResult.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      const difference = Math.abs(totalAmount - calculatedTotal).toFixed(2);

      logger.info(`智能分摊计算成功: 寝室ID ${room_id}, 总金额 ${totalAmount}, 分摊类型 ${split_type}`);

      res.status(200).json({
        success: true,
        message: '智能分摊计算成功',
        data: {
          room_id,
          total_amount: totalAmount,
          split_type,
          split_details: splitResult,
          calculated_total: calculatedTotal.toFixed(2),
          difference
        }
      });

    } catch (error) {
      logger.error('智能分摊计算失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new ExpenseController();