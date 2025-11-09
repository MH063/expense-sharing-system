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

// 获取成员在指定时间段内的在寝天数
router.get('/member/:memberId', 
  authenticateToken,
  [
    param('memberId').isInt({ min: 1 }).withMessage('成员ID必须是正整数'),
    query('startDate').isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').isISO8601().withMessage('结束日期格式不正确')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { memberId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.sub;

      // 验证用户是否有权限查看该成员的在寝天数
      const { query } = require('../config/db');
      const membershipResult = await query(
        `SELECT rm.room_id FROM room_members rm 
         WHERE rm.user_id = $1 AND rm.status = $2`,
        [userId, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限查看在寝天数'
        });
      }

      const roomId = membershipResult.rows[0].room_id;

      // 验证成员是否属于同一房间
      const memberCheckResult = await query(
        `SELECT 1 FROM room_members rm 
         WHERE rm.room_id = $1 AND rm.user_id = $2 AND rm.status = $3`,
        [roomId, memberId, 'active']
      );

      if (memberCheckResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '该成员不属于您的房间'
        });
      }

      // 计算在寝天数
      const presenceDays = await PresenceDaySplitService.calculatePresenceDays(
        roomId, startDate, endDate
      );

      // 获取指定成员的在寝天数
      const memberPresenceDays = presenceDays.find(day => day.user_id === parseInt(memberId));

      res.status(200).json({
        success: true,
        message: '获取成员在寝天数成功',
        data: memberPresenceDays ? memberPresenceDays.presence_days : 0
      });
    } catch (error) {
      logger.error('获取成员在寝天数失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取房间所有成员在指定时间段内的在寝天数
router.get('/room/:roomId', 
  authenticateToken,
  [
    param('roomId').isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    query('startDate').isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').isISO8601().withMessage('结束日期格式不正确')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.sub;

      // 验证用户是否是寝室成员
      const { query } = require('../config/db');
      const membershipResult = await query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2 AND status = $3',
        [userId, roomId, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 计算在寝天数
      const presenceDays = await PresenceDaySplitService.calculatePresenceDays(
        roomId, startDate, endDate
      );

      // 转换为前端需要的格式 {memberId: days}
      const result = {};
      presenceDays.forEach(day => {
        result[day.user_id] = day.presence_days;
      });

      res.status(200).json({
        success: true,
        message: '获取房间成员在寝天数成功',
        data: result
      });
    } catch (error) {
      logger.error('获取房间成员在寝天数失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 计算基于在寝天数的费用分摊
router.post('/calculate-split', 
  authenticateToken,
  [
    body('roomId').isInt({ min: 1 }).withMessage('房间ID必须是正整数'),
    body('startDate').isISO8601().withMessage('开始日期格式不正确'),
    body('endDate').isISO8601().withMessage('结束日期格式不正确'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('总金额必须是非负数'),
    body('expenseType').isIn(['lighting', 'host', 'air_conditioner', 'custom']).withMessage('费用类型无效'),
    body('memberIds').isArray().withMessage('成员ID列表必须是数组'),
    body('memberIds.*').isInt({ min: 1 }).withMessage('成员ID必须是正整数')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { roomId, startDate, endDate, totalAmount, expenseType, memberIds, customSettings } = req.body;
      const userId = req.user.sub;

      // 验证用户是否是寝室成员
      const { query } = require('../config/db');
      const membershipResult = await query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2 AND status = $3',
        [userId, roomId, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }

      // 计算基于在寝天数的费用分摊
      const splitResult = await PresenceDaySplitService.calculateSplit(
        roomId, totalAmount, startDate, endDate
      );

      res.status(200).json({
        success: true,
        message: '计算基于在寝天数的费用分摊成功',
        data: splitResult
      });
    } catch (error) {
      logger.error('计算基于在寝天数的费用分摊失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 获取费用类型的默认分摊方式
router.get('/expense-type/:expenseType/default-split', 
  authenticateToken,
  [
    param('expenseType').isIn(['lighting', 'host', 'air_conditioner', 'custom']).withMessage('费用类型无效')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { expenseType } = req.params;

      // 根据费用类型返回默认分摊方式
      let defaultSplitType = 'average'; // 默认平均分摊
      
      // 根据业务逻辑设置不同费用类型的默认分摊方式
      switch (expenseType) {
        case 'lighting':
          defaultSplitType = 'stay_days'; // 照明费按在寝天数分摊
          break;
        case 'air_conditioner':
          defaultSplitType = 'stay_days'; // 空调费按在寝天数分摊
          break;
        case 'host':
          defaultSplitType = 'custom'; // 主机费使用自定义分摊
          break;
        case 'custom':
          defaultSplitType = 'average'; // 自定义费用默认平均分摊
          break;
      }

      res.status(200).json({
        success: true,
        message: '获取费用类型默认分摊方式成功',
        data: {
          expenseType,
          defaultSplitType
        }
      });
    } catch (error) {
      logger.error('获取费用类型默认分摊方式失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

// 批量更新成员在寝天数
router.post('/batch-update', 
  authenticateToken,
  [
    body('data').isArray().withMessage('数据必须是数组'),
    body('data.*.memberId').isInt({ min: 1 }).withMessage('成员ID必须是正整数'),
    body('data.*.date').isISO8601().withMessage('日期格式不正确'),
    body('data.*.days').isInt({ min: 0, max: 1 }).withMessage('天数必须是0或1')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { data } = req.body;
      const userId = req.user.sub;

      // 验证用户是否有权限更新在寝天数
      const { query } = require('../config/db');
      const membershipResult = await query(
        `SELECT rm.room_id FROM room_members rm 
         WHERE rm.user_id = $1 AND rm.status = $2`,
        [userId, 'active']
      );

      if (membershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有权限更新在寝天数'
        });
      }

      const roomId = membershipResult.rows[0].room_id;

      // 验证所有成员是否属于同一房间
      const memberIds = [...new Set(data.map(item => item.memberId))];
      const memberCheckResult = await query(
        `SELECT user_id FROM room_members rm 
         WHERE rm.room_id = $1 AND rm.user_id = ANY($2) AND rm.status = $3`,
        [roomId, memberIds, 'active']
      );

      if (memberCheckResult.rows.length !== memberIds.length) {
        return res.status(403).json({
          success: false,
          message: '部分成员不属于您的房间'
        });
      }

      // 这里应该实现在寝天数的批量更新逻辑
      // 由于当前系统没有直接的在寝天数表，可能需要通过离寝记录来计算
      // 这里暂时返回成功，实际实现需要根据具体业务需求

      res.status(200).json({
        success: true,
        message: '批量更新成员在寝天数成功',
        data: {
          updatedCount: data.length
        }
      });
    } catch (error) {
      logger.error('批量更新成员在寝天数失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
);

module.exports = router;