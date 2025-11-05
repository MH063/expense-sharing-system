const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { authenticateToken, checkRole } = require('../middleware/tokenManager');

/**
 * 运行异常检测
 * POST /api/abnormal-expenses/detect
 */
router.post('/detect', authenticateToken, checkRole('admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 获取所有启用的检测规则
    const rulesQuery = `
      SELECT * FROM abnormal_expense_rules 
      WHERE is_active = true
    `;
    const rulesResult = await client.query(rulesQuery);
    
    if (rulesResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: '没有启用的检测规则'
      });
    }
    
    // 获取最近的费用记录
    const expensesQuery = `
      SELECT e.*, et.name as type_name, u.username 
      FROM expenses e
      JOIN expense_types et ON e.type_id = et.id
      JOIN users u ON e.paid_by = u.id
      WHERE e.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY e.created_at DESC
    `;
    const expensesResult = await client.query(expensesQuery);
    
    let detectedAbnormalExpenses = [];
    
    // 对每条费用记录应用规则检测
    for (const expense of expensesResult.rows) {
      for (const rule of rulesResult.rows) {
        let isAbnormal = false;
        let reason = '';
        
        // 根据规则类型进行检测
        switch (rule.rule_type) {
          case 'amount_threshold':
            if (parseFloat(expense.amount) > parseFloat(rule.threshold_value)) {
              isAbnormal = true;
              reason = `金额超过阈值 ${rule.threshold_value}`;
            }
            break;
            
          case 'frequency_check':
            // 检查同一用户在短期内的消费频率
            const frequencyQuery = `
              SELECT COUNT(*) as count
              FROM expenses
              WHERE paid_by = $1 
                AND type_id = $2 
                AND created_at >= NOW() - INTERVAL '7 days'
            `;
            const frequencyResult = await client.query(frequencyQuery, [expense.paid_by, expense.type_id]);
            
            if (parseInt(frequencyResult.rows[0].count) > parseInt(rule.threshold_value)) {
              isAbnormal = true;
              reason = `7天内同类消费次数超过阈值 ${rule.threshold_value}`;
            }
            break;
            
          case 'time_pattern':
            // 检查异常时间消费（如深夜）
            const expenseHour = new Date(expense.created_at).getHours();
            if (expenseHour >= 23 || expenseHour <= 5) {
              isAbnormal = true;
              reason = '异常时间消费（深夜或凌晨）';
            }
            break;
            
          case 'category_anomaly':
            // 检查用户不常消费的类别
            const categoryQuery = `
              SELECT COUNT(*) as count
              FROM expenses
              WHERE paid_by = $1 AND type_id = $2
            `;
            const categoryResult = await client.query(categoryQuery, [expense.paid_by, expense.type_id]);
            
            if (parseInt(categoryResult.rows[0].count) <= 2) {
              isAbnormal = true;
              reason = '用户不常消费的类别';
            }
            break;
        }
        
        // 如果检测到异常，添加到结果中
        if (isAbnormal) {
          // 检查是否已存在相同的异常记录
          const existingQuery = `
            SELECT id FROM abnormal_expenses
            WHERE expense_id = $1 AND rule_id = $2
          `;
          const existingResult = await client.query(existingQuery, [expense.id, rule.id]);
          
          if (existingResult.rows.length === 0) {
            // 插入新的异常记录
            const insertQuery = `
              INSERT INTO abnormal_expenses (expense_id, rule_id, reason, status, created_at)
              VALUES ($1, $2, $3, 'pending', NOW())
              RETURNING *
            `;
            const insertResult = await client.query(insertQuery, [expense.id, rule.id, reason]);
            
            detectedAbnormalExpenses.push({
              ...insertResult.rows[0],
              expense: {
                ...expense,
                type_name: expense.type_name,
                username: expense.username
              },
              rule: {
                id: rule.id,
                name: rule.name,
                rule_type: rule.rule_type
              }
            });
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    // 记录检测日志
    logger.info(`异常检测完成，发现 ${detectedAbnormalExpenses.length} 个新异常`);
    
    res.json({
      success: true,
      message: `检测完成，发现 ${detectedAbnormalExpenses.length} 个新的异常费用`,
      data: {
        detectedCount: detectedAbnormalExpenses.length,
        abnormalExpenses: detectedAbnormalExpenses
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('异常检测失败:', error);
    res.status(500).json({
      success: false,
      message: '异常检测失败',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * 获取异常费用列表
 * GET /api/abnormal-expenses
 */
router.get('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type_id } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT ae.*, e.amount, e.description, e.created_at as expense_date,
             et.name as type_name, u.username as paid_by_name,
             r.name as rule_name, r.rule_type
      FROM abnormal_expenses ae
      JOIN expenses e ON ae.expense_id = e.id
      JOIN expense_types et ON e.type_id = et.id
      JOIN users u ON e.paid_by = u.id
      JOIN abnormal_expense_rules r ON ae.rule_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND ae.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (type_id) {
      query += ` AND e.type_id = $${paramIndex++}`;
      params.push(type_id);
    }
    
    query += ` ORDER BY ae.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total
      FROM abnormal_expenses ae
      JOIN expenses e ON ae.expense_id = e.id
      WHERE 1=1
    `;
    
    let countParams = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND ae.status = $${countParamIndex++}`;
      countParams.push(status);
    }
    
    if (type_id) {
      countQuery += ` AND e.type_id = $${countParamIndex++}`;
      countParams.push(type_id);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems,
          totalPages
        }
      }
    });
    
  } catch (error) {
    logger.error('获取异常费用列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取异常费用列表失败',
      error: error.message
    });
  }
});

/**
 * 获取异常费用统计
 * GET /api/abnormal-expenses/stats
 */
router.get('/stats', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    // 获取各状态异常费用数量
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM abnormal_expenses
      GROUP BY status
    `;
    const statusResult = await pool.query(statusQuery);
    
    // 获取各规则类型异常费用数量
    const ruleTypeQuery = `
      SELECT r.rule_type, COUNT(*) as count
      FROM abnormal_expenses ae
      JOIN abnormal_expense_rules r ON ae.rule_id = r.id
      GROUP BY r.rule_type
    `;
    const ruleTypeResult = await pool.query(ruleTypeQuery);
    
    // 获取最近7天的异常费用趋势
    const trendQuery = `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM abnormal_expenses
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const trendResult = await pool.query(trendQuery);
    
    // 获取总异常费用金额
    const amountQuery = `
      SELECT SUM(e.amount) as total_amount
      FROM abnormal_expenses ae
      JOIN expenses e ON ae.expense_id = e.id
      WHERE ae.status = 'pending'
    `;
    const amountResult = await pool.query(amountQuery);
    
    res.json({
      success: true,
      data: {
        statusStats: statusResult.rows,
        ruleTypeStats: ruleTypeResult.rows,
        trendStats: trendResult.rows,
        totalPendingAmount: amountResult.rows[0].total_amount || 0
      }
    });
    
  } catch (error) {
    logger.error('获取异常费用统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取异常费用统计失败',
      error: error.message
    });
  }
});

/**
 * 更新异常费用状态
 * PUT /api/abnormal-expenses/:id/status
 */
router.put('/:id/status', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    if (!['pending', 'reviewed', 'resolved', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }
    
    const query = `
      UPDATE abnormal_expenses
      SET status = $1, note = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, note, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '异常费用记录不存在'
      });
    }
    
    logger.info(`异常费用状态已更新: ID=${id}, 状态=${status}`);
    
    res.json({
      success: true,
      message: '状态更新成功',
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('更新异常费用状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新异常费用状态失败',
      error: error.message
    });
  }
});

module.exports = router;