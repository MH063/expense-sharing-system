/**
 * 用户路由
 * 处理用户相关的HTTP请求
 */

const express = require('express');
const userService = require('../services/database/user-service');
const { authenticateToken } = require('../middleware/tokenManager');
const enhancedCacheMiddleware = require('../middleware/enhanced-cache-middleware');

const router = express.Router();

/**
 * 获取当前用户信息
 * GET /api/users/me
 */
router.get('/me', authenticateToken, enhancedCacheMiddleware.smartUserCache.getUser, async (req, res) => {
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
router.put('/me', authenticateToken, enhancedCacheMiddleware.smartUserCache.clearUser, async (req, res) => {
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
router.get('/rooms', authenticateToken, enhancedCacheMiddleware.smartUserCache.getUserRooms, async (req, res) => {
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
router.get('/room/:roomId/users', authenticateToken, enhancedCacheMiddleware.smartRoomCache.getRoomMembers, async (req, res) => {
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
router.post('/batch', authenticateToken, async (req, res) => {
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