const express = require('express');
const router = express.Router();
const adminSessionController = require('../controllers/adminSession-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { checkRole } = require('../middleware/permission-middleware');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { auditLogger } = require('../middleware/auditLogger');

// 获取所有活跃会话列表
router.get('/active', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }), // 15分钟内最多100次请求
  auditLogger('view_active_sessions'),
  adminSessionController.getActiveSessions
);

// 获取会话详情
router.get('/:sessionId', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_details'),
  adminSessionController.getSessionDetails
);

// 获取用户的所有会话
router.get('/user/:userId', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_user_sessions'),
  adminSessionController.getUserSessions
);

// 撤销指定会话
router.post('/:sessionId/revoke', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('revoke_session'),
  adminSessionController.revokeSession
);

// 批量撤销会话
router.post('/batch-revoke', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  auditLogger('batch_revoke_sessions'),
  adminSessionController.revokeMultipleSessions
);

// 撤销用户的所有会话
router.post('/user/:userId/revoke-all', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  auditLogger('revoke_user_all_sessions'),
  adminSessionController.revokeUserAllSessions
);

// 延长会话有效期
router.post('/:sessionId/extend', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('extend_session'),
  adminSessionController.extendSession
);

// 获取会话活动日志
router.get('/:sessionId/activity-logs', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_activity_logs'),
  adminSessionController.getSessionActivityLogs
);

// 获取会话统计信息
router.get('/statistics', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('view_session_statistics'),
  adminSessionController.getSessionStatistics
);

// 获取可疑会话列表
router.get('/suspicious', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_suspicious_sessions'),
  adminSessionController.getSuspiciousSessions
);

// 标记会话为可疑
router.post('/:sessionId/mark-suspicious', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('mark_session_suspicious'),
  adminSessionController.markSessionAsSuspicious
);

// 获取会话地理位置信息
router.get('/:sessionId/location', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_location'),
  adminSessionController.getSessionLocation
);

// 获取会话设备信息
router.get('/:sessionId/device-info', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_device_info'),
  adminSessionController.getSessionDeviceInfo
);

// 获取会话安全信息
router.get('/:sessionId/security-info', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_security_info'),
  adminSessionController.getSessionSecurityInfo
);

// 强制用户重新认证
router.post('/user/:userId/force-reauth', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }),
  auditLogger('force_user_reauthentication'),
  adminSessionController.forceUserReauthentication
);

// 获取会话访问模式
router.get('/:sessionId/access-pattern', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_access_pattern'),
  adminSessionController.getSessionAccessPattern
);

// 设置会话访问限制
router.post('/:sessionId/access-restrictions', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('set_session_access_restrictions'),
  adminSessionController.setSessionAccessRestrictions
);

// 获取会话异常行为
router.get('/:sessionId/anomalies', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_anomalies'),
  adminSessionController.getSessionAnomalies
);

// 获取会话风险评估
router.get('/:sessionId/risk-assessment', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }),
  auditLogger('view_session_risk_assessment'),
  adminSessionController.getSessionRiskAssessment
);

// 导出会话数据
router.get('/export', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  auditLogger('export_session_data'),
  adminSessionController.exportSessionData
);

// 获取会话配置
router.get('/config', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }),
  auditLogger('view_session_config'),
  adminSessionController.getSessionConfig
);

// 更新会话配置
router.put('/config', 
  authenticateToken, 
  checkRole(['admin', 'super_admin']), 
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  auditLogger('update_session_config'),
  adminSessionController.updateSessionConfig
);

module.exports = router;