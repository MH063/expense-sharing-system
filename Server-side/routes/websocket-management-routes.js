/**
 * WebSocket 管理路由（占位）
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const websocketManager = require('../config/websocket');

router.get('/stats', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  const stats = websocketManager.getStats();
  res.status(200).json({ success: true, data: stats });
});

router.post('/broadcast', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  const { message = { type: 'system', data: { message: 'test' } } } = req.body || {};
  websocketManager.broadcast(message);
  res.status(200).json({ success: true, message: '已广播占位消息' });
});

module.exports = router;