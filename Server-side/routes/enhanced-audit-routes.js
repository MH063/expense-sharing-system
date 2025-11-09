const express = require('express');
const { authenticateToken } = require('../middleware/tokenManager');
const { EnhancedAuditController } = require('../controllers/enhanced-audit-controller');

const router = express.Router();
const enhancedAuditController = new EnhancedAuditController();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户活动日志
router.get('/user-activity', enhancedAuditController.getUserActivityLogs);

// 获取数据变更审计日志
router.get('/data-changes', enhancedAuditController.getDataChangeAudits);

// 获取系统审计日志
router.get('/system-events', enhancedAuditController.getSystemAuditLogs);

// 记录用户活动（用于测试）
router.post('/log-user-activity', enhancedAuditController.logUserActivity);

// 记录数据变更（用于测试）
router.post('/log-data-change', enhancedAuditController.logDataChange);

// 记录系统事件（用于测试）
router.post('/log-system-event', enhancedAuditController.logSystemEvent);

module.exports = router;