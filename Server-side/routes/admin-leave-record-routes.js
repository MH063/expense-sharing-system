const express = require('express');
const router = express.Router();
const { query, param, body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth-middleware');
const { logger } = require('../config/logger');

// 中间件：验证请求参数
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route GET /admin/leave-records
 * @desc 获取请假记录列表（管理端）
 * @access Admin
 */
router.get('/', 
  authenticateToken,
  isAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的正整数'),
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']).withMessage('状态无效'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
    query('room_id').optional().isInt({ min: 1 }).withMessage('寝室ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, user_id, room_id } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND lr.status = $${paramIndex++}`;
        queryParams.push(status);
      }

      if (user_id) {
        whereClause += ` AND lr.user_id = $${paramIndex++}`;
        queryParams.push(user_id);
      }

      if (room_id) {
        whereClause += ` AND lr.room_id = $${paramIndex++}`;
        queryParams.push(room_id);
      }

      // 查询请假记录列表
      const queryText = `
        SELECT 
          lr.*, 
          u.username AS user_name,
          r.name AS room_name
        FROM leave_records lr
        JOIN users u ON lr.user_id = u.id
        JOIN rooms r ON lr.room_id = r.id
        WHERE 1=1 ${whereClause}
        ORDER BY lr.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await db.query(queryText, [...queryParams, parseInt(limit), parseInt(offset)]);

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM leave_records lr
        WHERE 1=1 ${whereClause}
      `;

      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      logger.info(`管理员获取请假记录列表，共${result.rowCount}条记录`);

      res.status(200).json({
        success: true,
        message: '获取请假记录列表成功',
        data: {
          records: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取请假记录列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

module.exports = router;