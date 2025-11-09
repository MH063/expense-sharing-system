/**
 * 暴力破解防护监控面板路由
 * 提供实时监控和统计信息
 */

const express = require('express');
const { getRedisClient } = require('../services/cache-service');
const { logger } = require('../config/logger');
const { isAdmin } = require('../middleware/auth-middleware');
const router = express.Router();

/**
 * 获取暴力破解防护统计信息
 */
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    // 获取所有暴力破解相关的键
    const keys = await redisClient.keys('brute_force:*');
    
    // 分类统计
    const stats = {
      blockedIps: [],
      blockedUsers: [],
      activeIps: [],
      activeUsers: [],
      totalAttempts: 0
    };
    
    // 处理每个键
    for (const key of keys) {
      const value = await redisClient.get(key);
      
      if (key.startsWith('brute_force:blocked:ip:')) {
        const ip = key.replace('brute_force:blocked:ip:', '');
        stats.blockedIps.push({ ip, timestamp: value });
      } else if (key.startsWith('brute_force:blocked:user:')) {
        const username = key.replace('brute_force:blocked:user:', '');
        stats.blockedUsers.push({ username, timestamp: value });
      } else if (key.startsWith('brute_force:ip:')) {
        const ip = key.replace('brute_force:ip:', '');
        stats.activeIps.push({ ip, attempts: parseInt(value) });
        stats.totalAttempts += parseInt(value);
      } else if (key.startsWith('brute_force:user:')) {
        const username = key.replace('brute_force:user:', '');
        stats.activeUsers.push({ username, attempts: parseInt(value) });
        stats.totalAttempts += parseInt(value);
      }
    }
    
    // 排序
    stats.activeIps.sort((a, b) => b.attempts - a.attempts);
    stats.activeUsers.sort((a, b) => b.attempts - a.attempts);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取暴力破解防护统计信息时出错', { error: error.message });
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

/**
 * 获取详细的监控日志
 */
router.get('/logs', isAdmin, async (req, res) => {
  try {
    // 这里应该从日志系统获取暴力破解防护相关的日志
    // 为了简化，我们返回一个示例结构
    const logs = [
      {
        timestamp: new Date().toISOString(),
        event: 'LOGIN_ATTEMPT',
        ip: '192.168.1.100',
        username: 'testuser',
        details: '登录尝试'
      },
      {
        timestamp: new Date().toISOString(),
        event: 'FAILURE_RECORDED',
        ip: '192.168.1.100',
        username: 'testuser',
        details: '记录失败尝试'
      }
    ];
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('获取暴力破解防护日志时出错', { error: error.message });
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    });
  }
});

/**
 * 获取当前被封禁的IP列表
 */
router.get('/blocked/ips', isAdmin, async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    // 获取所有IP封禁键
    const keys = await redisClient.keys('brute_force:blocked:ip:*');
    
    // 获取每个封禁的详细信息
    const blockedIps = [];
    for (const key of keys) {
      const ip = key.replace('brute_force:blocked:ip:', '');
      const blockedAt = await redisClient.get(key);
      const countKey = `brute_force:ip:${ip}`;
      const attemptCount = await redisClient.get(countKey) || 0;
      
      blockedIps.push({
        ip,
        blockedAt,
        attemptCount: parseInt(attemptCount),
        key
      });
    }
    
    res.json({
      success: true,
      data: blockedIps
    });
  } catch (error) {
    logger.error('获取被封禁IP列表时出错', { error: error.message });
    res.status(500).json({
      success: false,
      message: '获取被封禁IP列表失败'
    });
  }
});

/**
 * 获取当前被封禁的用户列表
 */
router.get('/blocked/users', isAdmin, async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    // 获取所有用户封禁键
    const keys = await redisClient.keys('brute_force:blocked:user:*');
    
    // 获取每个封禁的详细信息
    const blockedUsers = [];
    for (const key of keys) {
      const username = key.replace('brute_force:blocked:user:', '');
      const blockedAt = await redisClient.get(key);
      const countKey = `brute_force:user:${username}`;
      const attemptCount = await redisClient.get(countKey) || 0;
      
      blockedUsers.push({
        username,
        blockedAt,
        attemptCount: parseInt(attemptCount),
        key
      });
    }
    
    res.json({
      success: true,
      data: blockedUsers
    });
  } catch (error) {
    logger.error('获取被封禁用户列表时出错', { error: error.message });
    res.status(500).json({
      success: false,
      message: '获取被封禁用户列表失败'
    });
  }
});

/**
 * 解除IP封禁
 */
router.post('/unblock/ip/:ip', isAdmin, async (req, res) => {
  try {
    const { ip } = req.params;
    const redisClient = getRedisClient();
    
    // 删除IP计数和封禁记录
    const ipKey = `brute_force:ip:${ip}`;
    const blockKey = `brute_force:blocked:ip:${ip}`;
    
    await redisClient.del(ipKey);
    await redisClient.del(blockKey);
    
    logger.info('解除IP封禁', { ip });
    
    res.json({
      success: true,
      message: `IP ${ip} 已解除封禁`
    });
  } catch (error) {
    logger.error('解除IP封禁时出错', { error: error.message, ip: req.params.ip });
    res.status(500).json({
      success: false,
      message: '解除封禁失败'
    });
  }
});

/**
 * 解除用户封禁
 */
router.post('/unblock/user/:username', isAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const redisClient = getRedisClient();
    
    // 删除用户计数和封禁记录
    const userKey = `brute_force:user:${username}`;
    const blockKey = `brute_force:blocked:user:${username}`;
    
    await redisClient.del(userKey);
    await redisClient.del(blockKey);
    
    logger.info('解除用户封禁', { username });
    
    res.json({
      success: true,
      message: `用户 ${username} 已解除封禁`
    });
  } catch (error) {
    logger.error('解除用户封禁时出错', { error: error.message, username: req.params.username });
    res.status(500).json({
      success: false,
      message: '解除封禁失败'
    });
  }
});

module.exports = router;