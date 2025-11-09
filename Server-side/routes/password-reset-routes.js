/**
 * 密码重置路由
 * 处理用户密码重置相关的API请求
 */

const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/password-reset-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const checkRole = require('../middleware/role-middleware');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

// 请求密码重置
router.post('/request', roleAwareRateLimiter('password-reset-request'), passwordResetController.requestPasswordReset);

// 验证重置令牌
router.get('/verify/:token', passwordResetController.verifyResetToken);

// 重置密码
router.post('/reset', roleAwareRateLimiter('password-reset'), passwordResetController.resetPassword);

// 检查重置令牌状态
router.get('/status/:token', passwordResetController.checkResetTokenStatus);

// 取消密码重置请求
router.delete('/cancel/:token', authenticateToken, passwordResetController.cancelPasswordReset);

// 获取密码重置历史
router.get('/history', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetHistory);

// 验证密码强度
router.post('/validate-strength', passwordResetController.validatePasswordStrength);

// 检查邮箱是否已注册
router.post('/check-email', roleAwareRateLimiter('check-email'), passwordResetController.checkEmailExists);

// 发送重置验证码
router.post('/send-verification-code', roleAwareRateLimiter('send-verification-code'), passwordResetController.sendResetVerificationCode);

// 验证重置验证码
router.post('/verify-code', roleAwareRateLimiter('verify-code'), passwordResetController.verifyResetCode);

// 通过验证码重置密码
router.post('/reset-by-code', roleAwareRateLimiter('reset-by-code'), passwordResetController.resetPasswordByCode);

// 获取密码重置配置
router.get('/config', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfig);

// 更新密码重置配置
router.put('/config', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetConfig);

// 获取密码重置统计
router.get('/stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetStats);

// 获取密码重置日志
router.get('/logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetLogs);

// 导出密码重置日志
router.get('/logs/export', authenticateToken, checkRole(['admin']), passwordResetController.exportPasswordResetLogs);

// 批量取消密码重置请求
router.post('/batch-cancel', authenticateToken, checkRole(['admin']), passwordResetController.batchCancelPasswordReset);

// 获取用户密码重置请求
router.get('/user/:userId', authenticateToken, checkRole(['admin']), passwordResetController.getUserPasswordResetRequests);

// 清理过期的重置令牌
router.delete('/cleanup-expired', authenticateToken, checkRole(['admin']), passwordResetController.cleanupExpiredTokens);

// 获取密码重置安全设置
router.get('/security-settings', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetSecuritySettings);

// 更新密码重置安全设置
router.put('/security-settings', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetSecuritySettings);

// 获取密码重置模板
router.get('/template/:type', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTemplate);

// 更新密码重置模板
router.put('/template/:type', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetTemplate);

// 预览密码重置邮件
router.get('/preview-email/:type', authenticateToken, checkRole(['admin']), passwordResetController.previewPasswordResetEmail);

// 测试密码重置邮件发送
router.post('/test-email', authenticateToken, checkRole(['admin']), passwordResetController.testPasswordResetEmail);

// 获取密码重置频率限制
router.get('/rate-limit', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetRateLimit);

// 更新密码重置频率限制
router.put('/rate-limit', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetRateLimit);

// 获取密码重置IP白名单
router.get('/ip-whitelist', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetIpWhitelist);

// 更新密码重置IP白名单
router.put('/ip-whitelist', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetIpWhitelist);

// 检查IP是否在白名单中
router.post('/check-ip-whitelist', authenticateToken, checkRole(['admin']), passwordResetController.checkIpInWhitelist);

// 获取密码重置黑名单
router.get('/blacklist', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetBlacklist);

// 更新密码重置黑名单
router.put('/blacklist', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetBlacklist);

// 检查项目是否在黑名单中
router.post('/check-blacklist', authenticateToken, checkRole(['admin']), passwordResetController.checkItemInBlacklist);

// 获取密码重置审计日志
router.get('/audit-logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetAuditLogs);

// 导出密码重置审计日志
router.get('/audit-logs/export', authenticateToken, checkRole(['admin']), passwordResetController.exportPasswordResetAuditLogs);

// 获取密码重置报告
router.get('/report', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetReport);

// 生成密码重置报告
router.post('/report/generate', authenticateToken, checkRole(['admin']), passwordResetController.generatePasswordResetReport);

// 获取密码重置分析数据
router.get('/analytics', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetAnalytics);

module.exports = router;