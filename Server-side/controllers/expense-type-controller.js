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
    new winston.transports.File({ filename: 'logs/expense-type-controller.log' })
  ]
});

// 费用类型控制器
class ExpenseTypeController {
  constructor() {
    this.logger = logger;
  }

  // 创建费用类型
  async createExpenseType(req, res) {
    try {
      const { name, description, icon, color, is_default } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证必填字段
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }

      // 验证用户是否有权限创建费用类型（管理员）
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = userResult.rows[0];

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有管理员可以创建费用类型'
        });
      }

      // 检查费用类型名称是否已存在
      const existingTypeResult = await pool.query(
        'SELECT * FROM expense_types WHERE name = $1',
        [name]
      );

      if (existingTypeResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '费用类型名称已存在'
        });
      }

      // 插入费用类型
      const expenseTypeResult = await pool.query(
        `INSERT INTO expense_types 
         (name, description, icon, color, is_default, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
         RETURNING id, name, description, icon, color, is_default, created_at, updated_at`,
        [
          name,
          description || '',
          icon || '',
          color || '#000000',
          is_default || false
        ]
      );

      const expenseType = expenseTypeResult.rows[0];

      logger.info(`费用类型创建成功: ${name} (ID: ${expenseType.id})`);

      res.status(201).json({
        success: true,
        message: '费用类型创建成功',
        data: expenseType
      });

    } catch (error) {
      logger.error('费用类型创建失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取费用类型列表
  async getExpenseTypes(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // 查询费用类型列表
      const expenseTypesResult = await pool.query(
        `SELECT id, name, description, icon, color, is_default, created_at, updated_at
         FROM expense_types
         ORDER BY is_default DESC, name ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const expenseTypes = expenseTypesResult.rows;

      // 查询总数
      const countResult = await pool.query('SELECT COUNT(*) FROM expense_types');
      const totalCount = parseInt(countResult.rows[0].count);

      logger.info(`获取费用类型列表成功，共 ${totalCount} 条记录`);

      res.status(200).json({
        success: true,
        message: '获取费用类型列表成功',
        data: {
          expenseTypes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取费用类型列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取费用类型详情
  async getExpenseTypeById(req, res) {
    try {
      const { id } = req.params;

      // 查询费用类型
      const expenseTypeResult = await pool.query(
        'SELECT id, name, description, icon, color, is_default, created_at, updated_at FROM expense_types WHERE id = $1',
        [id]
      );

      if (expenseTypeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用类型不存在'
        });
      }

      const expenseType = expenseTypeResult.rows[0];

      logger.info(`获取费用类型详情成功: ${expenseType.name} (ID: ${expenseType.id})`);

      res.status(200).json({
        success: true,
        message: '获取费用类型详情成功',
        data: expenseType
      });

    } catch (error) {
      logger.error('获取费用类型详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新费用类型
  async updateExpenseType(req, res) {
    try {
      const { id } = req.params;
      const { name, description, icon, color, is_default } = req.body;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用类型是否存在
      const expenseTypeResult = await pool.query('SELECT * FROM expense_types WHERE id = $1', [id]);

      if (expenseTypeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用类型不存在'
        });
      }

      // 验证用户是否有权限更新费用类型（管理员）
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = userResult.rows[0];

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有管理员可以更新费用类型'
        });
      }

      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        // 检查费用类型名称是否已存在（排除当前ID）
        const existingTypeResult = await pool.query(
          'SELECT * FROM expense_types WHERE name = $1 AND id != $2',
          [name, id]
        );

        if (existingTypeResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: '费用类型名称已存在'
          });
        }

        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }

      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }

      if (icon !== undefined) {
        updateFields.push(`icon = $${paramIndex++}`);
        updateValues.push(icon);
      }

      if (color !== undefined) {
        updateFields.push(`color = $${paramIndex++}`);
        updateValues.push(color);
      }

      if (is_default !== undefined) {
        updateFields.push(`is_default = $${paramIndex++}`);
        updateValues.push(is_default);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      // 执行更新
      const updateQuery = `
        UPDATE expense_types 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, icon, color, is_default, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);
      const updatedExpenseType = result.rows[0];

      logger.info(`费用类型更新成功: ${updatedExpenseType.name} (ID: ${updatedExpenseType.id})`);

      res.status(200).json({
        success: true,
        message: '费用类型更新成功',
        data: updatedExpenseType
      });

    } catch (error) {
      logger.error('费用类型更新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除费用类型
  async deleteExpenseType(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.sub; // 从认证中间件获取用户ID

      // 验证费用类型是否存在
      const expenseTypeResult = await pool.query('SELECT * FROM expense_types WHERE id = $1', [id]);

      if (expenseTypeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用类型不存在'
        });
      }

      const expenseType = expenseTypeResult.rows[0];

      // 验证用户是否有权限删除费用类型（管理员）
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = userResult.rows[0];

      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有管理员可以删除费用类型'
        });
      }

      // 检查是否有费用记录使用该类型
      const expenseCountResult = await pool.query(
        'SELECT COUNT(*) FROM expenses WHERE expense_type_id = $1',
        [id]
      );

      const expenseCount = parseInt(expenseCountResult.rows[0].count);

      if (expenseCount > 0) {
        return res.status(409).json({
          success: false,
          message: '无法删除该费用类型，已有费用记录使用该类型'
        });
      }

      // 删除费用类型
      await pool.query('DELETE FROM expense_types WHERE id = $1', [id]);

      logger.info(`费用类型删除成功: ${expenseType.name} (ID: ${expenseType.id})`);

      res.status(200).json({
        success: true,
        message: '费用类型删除成功'
      });

    } catch (error) {
      logger.error('费用类型删除失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new ExpenseTypeController();