const { pool } = require('../config/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'logs/expense-type-controller.log' })]
});

class ExpenseTypeController {
  constructor() {
    this.logger = logger;
  }

  async createExpenseType(req, res) {
    try {
      const { name, description, icon, color } = req.body;
      const userId = req.user && (req.user.sub || req.user.id);

      if (!name) {
        return res.status(400).json({ success: false, message: '费用类型名称为必填项' });
      }
      if (!userId) {
        return res.status(401).json({ success: false, message: '未授权' });
      }

      // 重名检查（用户自定义与系统默认都不允许同名）
      const dup = await pool.query('SELECT 1 FROM expense_types WHERE name = $1', [name]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: '费用类型名称已存在' });
      }

      const insertSql = `
        INSERT INTO expense_types
          (name, description, icon, color, is_default, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, name, description, icon, color, is_default, created_by, created_at, updated_at
      `;
      const values = [name, description || '', icon || 'default', color || '#000000', false, userId];
      const result = await pool.query(insertSql, values);
      const expenseType = result.rows[0];

      logger.info(`费用类型创建成功: ${name} (ID: ${expenseType.id})`);
      return res.status(201).json({ success: true, message: '费用类型创建成功', data: expenseType });
    } catch (error) {
      logger.error('费用类型创建失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  async getExpenseTypes(req, res) {
    try {
      const pageRaw = req.query.page || '1';
      const limitRaw = req.query.limit || '20';
      const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
      const limit = Math.max(parseInt(limitRaw, 10) || 20, 1);
      const offset = (page - 1) * limit;

      const filters = [];
      const params = [];
      let p = 1;

      if (req.query.name) {
        filters.push(`name ILIKE $${p++}`);
        params.push(`%${req.query.name}%`);
      }
      if (req.query.created_by) {
        filters.push(`created_by = $${p++}`);
        params.push(req.query.created_by);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const listSql = `
        SELECT id, name, description, icon, color, is_default, created_by, created_at, updated_at
        FROM expense_types
        ${whereClause}
        ORDER BY is_default DESC, name ASC
        LIMIT $${p++} OFFSET $${p++}
      `;
      const countSql = `SELECT COUNT(*)::int AS count FROM expense_types ${whereClause}`;

      const listParams = params.slice();
      listParams.push(limit, offset);

      const [listResult, countResult] = await Promise.all([
        pool.query(listSql, listParams),
        pool.query(countSql, params)
      ]);

      const total = countResult.rows[0].count;
      return res.status(200).json({
        success: true,
        message: '获取费用类型列表成功',
        data: {
          expenseTypes: listResult.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取费用类型列表失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  async getExpenseTypeById(req, res) {
    try {
      const { id } = req.params;
      // 非 UUID 直接按不存在处理，避免 22P02 报错
      if (!/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(id)) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }
      const result = await pool.query(
        'SELECT id, name, description, icon, color, is_default, created_by, created_at, updated_at FROM expense_types WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }
      return res.status(200).json({ success: true, message: '获取费用类型详情成功', data: result.rows[0] });
    } catch (error) {
      logger.error('获取费用类型详情失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  async updateExpenseType(req, res) {
    try {
      const { id } = req.params;
      const { name, description, icon, color, is_default } = req.body;
      const userId = req.user && (req.user.sub || req.user.id);

      // 非 UUID 直接不存在
      if (!/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(id)) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }

      const existed = await pool.query('SELECT * FROM expense_types WHERE id = $1', [id]);
      if (existed.rows.length === 0) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }
      const current = existed.rows[0];
      if (current.is_default) {
        return res.status(403).json({ success: false, message: '不能修改系统默认费用类型' });
      }
      if (!userId || String(current.created_by) !== String(userId)) {
        return res.status(403).json({ success: false, message: '只有费用类型创建者可以修改费用类型信息' });
      }

      const sets = [];
      const values = [];
      let i = 1;
      if (name !== undefined) {
        // 重名检查（排除自身）
        const dup = await pool.query('SELECT 1 FROM expense_types WHERE name = $1 AND id <> $2', [name, id]);
        if (dup.rows.length > 0) {
          return res.status(409).json({ success: false, message: '费用类型名称已存在' });
        }
        sets.push(`name = $${i++}`); values.push(name);
      }
      if (description !== undefined) { sets.push(`description = $${i++}`); values.push(description); }
      if (icon !== undefined) { sets.push(`icon = $${i++}`); values.push(icon); }
      if (color !== undefined) { sets.push(`color = $${i++}`); values.push(color); }
      if (is_default !== undefined) { sets.push(`is_default = $${i++}`); values.push(is_default); }
      sets.push('updated_at = NOW()');
      values.push(id);

      const sql = `UPDATE expense_types SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, name, description, icon, color, is_default, created_by, created_at, updated_at`;
      const result = await pool.query(sql, values);
      return res.status(200).json({ success: true, message: '费用类型信息更新成功', data: result.rows[0] });
    } catch (error) {
      logger.error('费用类型更新失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  async deleteExpenseType(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user && (req.user.sub || req.user.id);

      // 非 UUID 直接不存在
      if (!/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(id)) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }

      const existed = await pool.query('SELECT * FROM expense_types WHERE id = $1', [id]);
      if (existed.rows.length === 0) {
        return res.status(404).json({ success: false, message: '费用类型不存在' });
      }
      const current = existed.rows[0];
      if (current.is_default) {
        return res.status(403).json({ success: false, message: '不能删除系统默认费用类型' });
      }
      if (!userId || String(current.created_by) !== String(userId)) {
        return res.status(403).json({ success: false, message: '只有费用类型创建者可以删除费用类型' });
      }

      const used = await pool.query('SELECT 1 FROM expenses WHERE expense_type_id = $1 LIMIT 1', [id]);
      if (used.rows.length > 0) {
        return res.status(409).json({ success: false, message: '该费用类型正在被使用，不能删除' });
      }

      await pool.query('DELETE FROM expense_types WHERE id = $1', [id]);
      return res.status(200).json({ success: true, message: '费用类型删除成功' });
    } catch (error) {
      logger.error('费用类型删除失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }

  async getDefaultExpenseTypes(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, name, description, icon, color, is_default, created_by, created_at, updated_at FROM expense_types WHERE is_default = TRUE AND created_by IS NULL ORDER BY name ASC'
      );
      return res.status(200).json({ success: true, message: '获取默认费用类型列表成功', data: result.rows });
    } catch (error) {
      logger.error('获取默认费用类型失败:', error);
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
}

module.exports = new ExpenseTypeController();