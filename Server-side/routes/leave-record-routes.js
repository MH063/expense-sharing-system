const express = require('express');
const router = express.Router();
const PresenceDaySplitService = require('../services/presence-day-split-service');
const { authenticateToken } = require('../middleware/auth-middleware');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

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

// 获取请假记录详情
router.get('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('记录ID格式不正确')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      // 查询请假记录详情
      const { query } = require('../config/db');
      const recordResult = await query(
        `SELECT lr.*, u.username, r.name as room_name
         FROM leave_records lr
         JOIN users u ON lr.user_id = u.id
         JOIN rooms r ON lr.room_id = r.id
         WHERE lr.id = $1 AND lr.user_id = $2`,
        [id, userId]
      );

      if (recordResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的请假记录'
        });
      }

      logger.info(`用户 ${userId} 获取请假记录详情成功: ${id}`);

      res.status(200).json({
        success: true,
        message: '获取请假记录详情成功',
        data: recordResult.rows[0]
      });
    } catch (error) {
      logger.error('获取请假记录详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 创建离寝记录
router.post('/', 
  authenticateToken,
  [
    body('room_id').isInt({ min: 1 }).withMessage('寝室ID必须是正整数'),
    body('start_date').isISO8601().withMessage('开始日期格式不正确'),
    body('end_date').isISO8601().withMessage('结束日期格式不正确'),
    body('leave_type').isIn(['home', 'travel', 'sick', 'other']).withMessage('离寝类型无效'),
    body('reason').optional().isString().withMessage('离寝原因必须是字符串')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { room_id, start_date, end_date, leave_type, reason } = req.body;
      const userId = req.user.sub;

      // 验证用户是否是寝室成员
      const { query } = require('../config/db');
      const membershipResult = await query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2 AND status = $3',
        [userId, room_id, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 创建离寝记录
      const leaveRecord = await PresenceDaySplitService.createLeaveRecord(
        userId, room_id, start_date, end_date, leave_type, reason
      );

      logger.info(`用户 ${userId} 创建离寝记录成功: ${leaveRecord.id}`);

      res.status(201).json({
        success: true,
        message: '离寝记录创建成功',
        data: leaveRecord
      });
    } catch (error) {
      logger.error('创建离寝记录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取用户离寝记录
router.get('/', 
  authenticateToken,
  [
    query('room_id').optional().isInt({ min: 1 }).withMessage('寝室ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.sub;
      const { room_id } = req.query;

      let roomId = room_id;
      
      // 如果没有提供room_id，查询用户所在的寝室
      if (!roomId) {
        const { query } = require('../config/db');
        const roomResult = await query(
          'SELECT room_id FROM room_members WHERE user_id = $1 AND status = $2 LIMIT 1',
          [userId, 'active']
        );
        
        if (roomResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: '未找到用户所属寝室'
          });
        }
        
        roomId = roomResult.rows[0].room_id;
      }

      // 获取离寝记录
      const leaveRecords = await PresenceDaySplitService.getLeaveRecords(userId, roomId);

      res.status(200).json({
        success: true,
        message: '获取离寝记录成功',
        data: leaveRecords
      });
    } catch (error) {
      logger.error('获取离寝记录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 更新离寝记录状态
router.put('/:id/status', 
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('记录ID必须是正整数'),
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('状态无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.sub;

      // 更新离寝记录状态
      const updatedRecord = await PresenceDaySplitService.updateLeaveRecordStatus(
        parseInt(id), status, userId
      );

      logger.info(`用户 ${userId} 更新离寝记录 ${id} 状态为 ${status}`);

      res.status(200).json({
        success: true,
        message: '离寝记录状态更新成功',
        data: updatedRecord
      });
    } catch (error) {
      logger.error('更新离寝记录状态失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 删除请假记录
router.delete('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('记录ID格式不正确')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      // 查询请假记录详情
      const { query } = require('../config/db');
      const recordResult = await query(
        'SELECT * FROM leave_records WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (recordResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的请假记录'
        });
      }

      // 检查记录状态，只有pending状态的记录才能删除
      const record = recordResult.rows[0];
      if (record.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '只有待审批的请假记录才能删除'
        });
      }

      // 删除请假记录
      await query('DELETE FROM leave_records WHERE id = $1', [id]);

      logger.info(`用户 ${userId} 删除请假记录成功: ${id}`);

      res.status(200).json({
        success: true,
        message: '删除请假记录成功'
      });
    } catch (error) {
      logger.error('删除请假记录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取请假类型列表
router.get('/types',
  authenticateToken,
  async (req, res) => {
    try {
      // 定义请假类型列表
      const leaveTypes = [
        {
          key: 'home',
          name: '回家',
          description: '回家休假'
        },
        {
          key: 'travel',
          name: '旅行',
          description: '外出旅行'
        },
        {
          key: 'sick',
          name: '病假',
          description: '因病请假'
        },
        {
          key: 'other',
          name: '其他',
          description: '其他原因'
        }
      ];

      logger.info('用户获取请假类型列表');

      res.status(200).json({
        success: true,
        message: '获取请假类型列表成功',
        data: leaveTypes
      });
    } catch (error) {
      logger.error('获取请假类型列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取请假统计
router.get('/stats',
  authenticateToken,
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('room_id').optional().isInt({ min: 1 }).withMessage('寝室ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.sub;
      const { start_date, end_date, room_id } = req.query;

      let roomId = room_id;
      
      // 如果没有提供room_id，查询用户所在的寝室
      if (!roomId) {
        const { query } = require('../config/db');
        const roomResult = await query(
          'SELECT room_id FROM room_members WHERE user_id = $1 AND status = $2 LIMIT 1',
          [userId, 'active']
        );
        
        if (roomResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: '未找到用户所属寝室'
          });
        }
        
        roomId = roomResult.rows[0].room_id;
      }

      // 构建查询条件
      let whereClause = 'WHERE lr.room_id = $1';
      const queryParams = [roomId];
      let paramIndex = 2;

      if (start_date) {
        whereClause += ` AND lr.start_date >= $${paramIndex++}`;
        queryParams.push(start_date);
      }

      if (end_date) {
        whereClause += ` AND lr.end_date <= $${paramIndex++}`;
        queryParams.push(end_date);
      }

      // 查询统计信息
      const { query } = require('../config/db');
      const statsResult = await query(
        `SELECT 
          COUNT(*) AS total_records,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count
        FROM leave_records lr
        ${whereClause}`,
        queryParams
      );

      // 查询按类型统计
      const typeStatsResult = await query(
        `SELECT 
          leave_type AS type,
          COUNT(*) AS count
        FROM leave_records lr
        ${whereClause}
        GROUP BY leave_type
        ORDER BY count DESC`,
        queryParams
      );

      const stats = statsResult.rows[0];
      stats.type_stats = typeStatsResult.rows;

      logger.info(`用户 ${userId} 获取请假统计`);

      res.status(200).json({
        success: true,
        message: '获取请假统计成功',
        data: stats
      });
    } catch (error) {
      logger.error('获取请假统计失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 计算在寝天数
router.post('/presence-days/calculate', 
  authenticateToken,
  [
    body('room_id').isInt({ min: 1 }).withMessage('寝室ID必须是正整数'),
    body('start_date').isISO8601().withMessage('开始日期格式不正确'),
    body('end_date').isISO8601().withMessage('结束日期格式不正确')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { room_id, start_date, end_date } = req.body;
      const userId = req.user.sub;

      // 验证用户是否是寝室成员
      const { query } = require('../config/db');
      const membershipResult = await query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2 AND status = $3',
        [userId, room_id, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 计算在寝天数
      const presenceDays = await PresenceDaySplitService.calculatePresenceDays(
        room_id, start_date, end_date
      );

      res.status(200).json({
        success: true,
        message: '计算在寝天数成功',
        data: presenceDays
      });
    } catch (error) {
      logger.error('计算在寝天数失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

module.exports = router;