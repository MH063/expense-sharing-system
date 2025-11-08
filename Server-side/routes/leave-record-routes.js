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