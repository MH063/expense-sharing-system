/**
 * 用户路由
 * 处理用户相关的HTTP请求
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const userService = require('../services/database/user-service');
const { authenticateToken } = require('../middleware/tokenManager');
const enhancedCacheMiddleware = require('../middleware/enhanced-cache-middleware');
const { completeInputValidation, basicValidation } = require('../middleware/input-validator');
const { ipLimiter, userLimiter, apiLimiter } = require('../middleware/rate-limiter');

const router = express.Router();

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
router.get('/me', 
  ipLimiter,  // IP速率限制
  basicValidation,  // 先进行参数验证
  authenticateToken,  // 再进行身份认证
  enhancedCacheMiddleware.smartUserCache.getUser, 
  async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

/**
 * 更新当前用户信息
 * PUT /api/users/me
 */
router.put('/me', 
  ipLimiter,  // IP速率限制
  completeInputValidation,  // 先进行参数验证
  authenticateToken,  // 再进行身份认证
  enhancedCacheMiddleware.smartUserCache.clearUser,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('请提供有效的邮箱地址')
      .normalizeEmail(),
    
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('姓名长度必须在1-100个字符之间')
      .trim(),
    
    body('avatar')
      .optional()
      .isURL()
      .withMessage('头像必须是有效的URL'),
    
    body('phone')
      .optional()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('请提供有效的中国手机号码')
  ],
  async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, name, avatar, phone } = req.body;
    
    // 验证数据
    if (!username && !email && !name && !avatar && !phone) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个要更新的字段'
      });
    }
    
    // 检查用户名是否已存在（如果要更新用户名）
    if (username) {
      const existingUser = await userService.findByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
    }
    
    // 检查邮箱是否已存在（如果要更新邮箱）
    if (email) {
      const existingUser = await userService.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: '邮箱已存在'
        });
      }
    }
    
    // 更新用户信息
    const updatedUser = await userService.updateUser(userId, {
      username,
      email,
      name,
      avatar,
      phone
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    });
  }
});

/**
 * 获取用户所属的房间
 * GET /api/users/rooms
 */
router.get('/rooms', 
  ipLimiter,  // IP速率限制
  basicValidation,  // 先进行参数验证
  authenticateToken,  // 再进行身份认证
  enhancedCacheMiddleware.smartUserCache.getUserRooms,
  async (req, res) => {
  try {
    const userId = req.user.id;
    const rooms = await userService.getUserRooms(userId);
    
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('获取用户房间失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户房间失败',
      error: error.message
    });
  }
});

/**
 * 获取房间中的用户
 * GET /api/users/room/:roomId/users
 */
router.get('/room/:roomId/users', 
  ipLimiter,  // IP速率限制
  basicValidation,  // 先进行参数验证
  [
    param('roomId')
      .isInt({ min: 1 })
      .withMessage('房间ID必须是正整数')
      .toInt()
  ],
  authenticateToken,  // 再进行身份认证
  enhancedCacheMiddleware.smartRoomCache.getRoomMembers,
  async (req, res) => {
  try {
    const { roomId } = req.params;
    const users = await userService.getRoomUsers(roomId);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('获取房间用户失败:', error);
    res.status(500).json({
      success: false,
      message: '获取房间用户失败',
      error: error.message
    });
  }
});

/**
 * 批量获取用户信息
 * POST /api/users/batch
 */
router.post('/batch', 
  ipLimiter,  // IP速率限制
  completeInputValidation,  // 先进行参数验证
  [
    body('userIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('用户ID数组必须包含1-50个用户')
      .custom((value) => {
        return value.every(id => Number.isInteger(id) && id > 0);
      })
      .withMessage('所有用户ID必须是正整数')
  ],
  userLimiter,  // 用户速率限制
  apiLimiter,  // API级速率限制（更严格）
  authenticateToken,  // 再进行身份认证
  async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的用户ID数组'
      });
    }
    
    // 限制批量查询数量，防止查询过多数据
    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: '批量查询用户数量不能超过50个'
      });
    }
    
    const users = await userService.getUsersBatch(userIds);
    
    // 将Map转换为数组
    const usersArray = Array.from(users.values());
    
    res.json({
      success: true,
      data: usersArray
    });
  } catch (error) {
    console.error('批量获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取用户信息失败',
      error: error.message
    });
  }
});

module.exports = router;