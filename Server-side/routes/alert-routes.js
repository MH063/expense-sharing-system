const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

// 所有告警路由都需要管理员权限
router.use(authenticateToken);

// 获取未解决的告警
router.get('/unresolved', alertController.getUnresolvedAlerts);

// 获取所有告警（包括已解决的）
router.get('/all', alertController.getAllAlerts);

// 解决告警
router.post('/resolve/:id', alertController.resolveAlert);

// 执行系统检查
router.post('/check-system', alertController.performSystemCheck);

// 获取告警统计
router.get('/stats', alertController.getAlertStats);

module.exports = router;