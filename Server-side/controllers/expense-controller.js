const { pool } = require('../config/db');
const websocketEvents = require('../services/websocket-events');
const winston = require('winston');

// 费用控制器
class ExpenseController {
  constructor() {
    this.logger = winston.createLogger({
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
  }

  // 创建费用记录
  async createExpense(req, res) {
    try {
      const { amount, category, description, payerId, roomId, splitAlgorithm, splitParameters } = req.body;
      const userId = req.user.id; // 从认证中间件获取用户ID

      // 插入费用记录
      const [result] = await pool.query(
        `INSERT INTO expenses (amount, category, description, payer_id, room_id, split_algorithm, split_parameters) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [amount, category, description, payerId, roomId, splitAlgorithm, JSON.stringify(splitParameters)]
      );

      const expenseId = result.insertId;

      // 获取创建的费用记录
      const [expenseRows] = await pool.query(
        'SELECT * FROM expenses WHERE id = ?',
        [expenseId]
      );

      const expense = expenseRows[0];

      // 通过WebSocket发送费用创建事件
      await websocketEvents.handleExpenseCreated(expense);

      this.logger.info(`费用记录创建成功: ${expenseId}`);

      res.status(201).json({
        success: true,
        message: '费用记录创建成功',
        data: expense
      });
    } catch (error) {
      this.logger.error(`创建费用记录失败: ${error.message}`);
      res.status(500).json({
        success: false,
        message: '创建费用记录失败',
        error: error.message
      });
    }
  }

  // 更新费用记录
  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { amount, category, description, splitAlgorithm, splitParameters } = req.body;

      // 更新费用记录
      await pool.query(
        `UPDATE expenses 
         SET amount = ?, category = ?, description = ?, split_algorithm = ?, split_parameters = ?
         WHERE id = ?`,
        [amount, category, description, splitAlgorithm, JSON.stringify(splitParameters), id]
      );

      // 获取更新后的费用记录
      const [expenseRows] = await pool.query(
        'SELECT * FROM expenses WHERE id = ?',
        [id]
      );

      const expense = expenseRows[0];

      // 通过WebSocket发送费用更新事件
      await websocketEvents.handleExpenseUpdated(expense);

      this.logger.info(`费用记录更新成功: ${id}`);

      res.status(200).json({
        success: true,
        message: '费用记录更新成功',
        data: expense
      });
    } catch (error) {
      this.logger.error(`更新费用记录失败: ${error.message}`);
      res.status(500).json({
        success: false,
        message: '更新费用记录失败',
        error: error.message
      });
    }
  }

  // 获取费用记录列表
  async getExpenses(req, res) {
    try {
      const { roomId } = req.query;
      const userId = req.user.id;

      let expenses;
      if (roomId) {
        // 获取指定寝室的费用记录
        [expenses] = await pool.query(
          'SELECT * FROM expenses WHERE room_id = ? ORDER BY created_at DESC',
          [roomId]
        );
      } else {
        // 获取用户相关的费用记录
        [expenses] = await pool.query(
          `SELECT e.* FROM expenses e 
           JOIN rooms r ON e.room_id = r.id
           JOIN user_room_relations urr ON r.id = urr.room_id
           WHERE urr.user_id = ? AND urr.is_active = TRUE
           ORDER BY e.created_at DESC`,
          [userId]
        );
      }

      res.status(200).json({
        success: true,
        data: expenses
      });
    } catch (error) {
      this.logger.error(`获取费用记录列表失败: ${error.message}`);
      res.status(500).json({
        success: false,
        message: '获取费用记录列表失败',
        error: error.message
      });
    }
  }

  // 获取费用记录详情
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;

      const [expenseRows] = await pool.query(
        `SELECT e.*, r.name as room_name, u.name as payer_name 
         FROM expenses e
         JOIN rooms r ON e.room_id = r.id
         JOIN users u ON e.payer_id = u.id
         WHERE e.id = ?`,
        [id]
      );

      if (expenseRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }

      const expense = expenseRows[0];

      res.status(200).json({
        success: true,
        data: expense
      });
    } catch (error) {
      this.logger.error(`获取费用记录详情失败: ${error.message}`);
      res.status(500).json({
        success: false,
        message: '获取费用记录详情失败',
        error: error.message
      });
    }
  }

  // 删除费用记录
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;

      // 删除费用记录
      await pool.query('DELETE FROM expenses WHERE id = ?', [id]);

      // 同时删除相关的分摊记录
      await pool.query('DELETE FROM expense_splits WHERE expense_id = ?', [id]);

      this.logger.info(`费用记录删除成功: ${id}`);

      res.status(200).json({
        success: true,
        message: '费用记录删除成功'
      });
    } catch (error) {
      this.logger.error(`删除费用记录失败: ${error.message}`);
      res.status(500).json({
        success: false,
        message: '删除费用记录失败',
        error: error.message
      });
    }
  }
}

module.exports = new ExpenseController();