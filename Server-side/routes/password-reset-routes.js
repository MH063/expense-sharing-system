/**
 * 密码重置路由
 * 处理用户密码重置相关的API请求
 */

const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/password-reset-controller');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/role-based-access');
const roleAwareRateLimiter = require('../middleware/role-aware-rate-limiter');

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

// 获取密码重置趋势数据
router.get('/trends', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTrends);

// 获取密码重置性能指标
router.get('/performance-metrics', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetPerformanceMetrics);

// 获取密码重置健康状态
router.get('/health-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetHealthStatus);

// 执行密码重置健康检查
router.post('/health-check', authenticateToken, checkRole(['admin']), passwordResetController.performPasswordResetHealthCheck);

// 获取密码重置错误统计
router.get('/error-stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetErrorStats);

// 获取密码重置错误日志
router.get('/error-logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetErrorLogs);

// 清理密码重置错误日志
router.delete('/error-logs/cleanup', authenticateToken, checkRole(['admin']), passwordResetController.cleanupPasswordResetErrorLogs);

// 获取密码重置缓存状态
router.get('/cache-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetCacheStatus);

// 清理密码重置缓存
router.delete('/cache/clear', authenticateToken, checkRole(['admin']), passwordResetController.clearPasswordResetCache);

// 预热密码重置缓存
router.post('/cache/warmup', authenticateToken, checkRole(['admin']), passwordResetController.warmupPasswordResetCache);

// 获取密码重置队列状态
router.get('/queue-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetQueueStatus);

// 处理密码重置队列
router.post('/queue/process', authenticateToken, checkRole(['admin']), passwordResetController.processPasswordResetQueue);

// 清空密码重置队列
router.delete('/queue/clear', authenticateToken, checkRole(['admin']), passwordResetController.clearPasswordResetQueue);

// 获取密码重置任务状态
router.get('/task/:taskId/status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskStatus);

// 取消密码重置任务
router.delete('/task/:taskId/cancel', authenticateToken, checkRole(['admin']), passwordResetController.cancelPasswordResetTask);

// 重试密码重置任务
router.post('/task/:taskId/retry', authenticateToken, checkRole(['admin']), passwordResetController.retryPasswordResetTask);

// 获取密码重置任务列表
router.get('/tasks', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskList);

// 创建密码重置任务
router.post('/tasks', authenticateToken, checkRole(['admin']), passwordResetController.createPasswordResetTask);

// 更新密码重置任务
router.put('/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetTask);

// 删除密码重置任务
router.delete('/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.deletePasswordResetTask);

// 获取密码重置任务详情
router.get('/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskDetail);

// 批量处理密码重置任务
router.post('/tasks/batch', authenticateToken, checkRole(['admin']), passwordResetController.batchProcessPasswordResetTasks);

// 获取密码重置任务统计
router.get('/tasks/stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskStats);

// 获取密码重置任务日志
router.get('/task/:taskId/logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskLogs);

// 导出密码重置任务日志
router.get('/task/:taskId/logs/export', authenticateToken, checkRole(['admin']), passwordResetController.exportPasswordResetTaskLogs);

// 获取密码重置任务报告
router.get('/task/:taskId/report', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetTaskReport);

// 生成密码重置任务报告
router.post('/task/:taskId/report/generate', authenticateToken, checkRole(['admin']), passwordResetController.generatePasswordResetTaskReport);

// 获取密码重置配置备份
router.get('/config/backup', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigBackup);

// 恢复密码重置配置
router.post('/config/restore', authenticateToken, checkRole(['admin']), passwordResetController.restorePasswordResetConfig);

// 获取密码重置配置历史
router.get('/config/history', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigHistory);

// 获取密码重置配置版本
router.get('/config/version/:versionId', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigVersion);

// 回滚密码重置配置
router.post('/config/rollback/:versionId', authenticateToken, checkRole(['admin']), passwordResetController.rollbackPasswordResetConfig);

// 获取密码重置配置差异
router.get('/config/diff/:versionId1/:versionId2', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigDiff);

// 获取密码重置配置模板
router.get('/config/templates', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplates);

// 应用密码重置配置模板
router.post('/config/template/:templateId/apply', authenticateToken, checkRole(['admin']), passwordResetController.applyPasswordResetConfigTemplate);

// 创建密码重置配置模板
router.post('/config/templates', authenticateToken, checkRole(['admin']), passwordResetController.createPasswordResetConfigTemplate);

// 更新密码重置配置模板
router.put('/config/template/:templateId', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetConfigTemplate);

// 删除密码重置配置模板
router.delete('/config/template/:templateId', authenticateToken, checkRole(['admin']), passwordResetController.deletePasswordResetConfigTemplate);

// 获取密码重置配置模板详情
router.get('/config/template/:templateId', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDetail);

// 导出密码重置配置模板
router.get('/config/template/:templateId/export', authenticateToken, checkRole(['admin']), passwordResetController.exportPasswordResetConfigTemplate);

// 导入密码重置配置模板
router.post('/config/templates/import', authenticateToken, checkRole(['admin']), passwordResetController.importPasswordResetConfigTemplate);

// 获取密码重置配置模板统计
router.get('/config/templates/stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateStats);

// 获取密码重置配置模板使用记录
router.get('/config/template/:templateId/usage', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateUsage);

// 获取密码重置配置模板推荐
router.get('/config/templates/recommendations', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateRecommendations);

// 获取密码重置配置模板评分
router.get('/config/template/:templateId/rating', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateRating);

// 评价密码重置配置模板
router.post('/config/template/:templateId/rate', authenticateToken, checkRole(['admin']), passwordResetController.ratePasswordResetConfigTemplate);

// 获取密码重置配置模板评论
router.get('/config/template/:templateId/comments', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateComments);

// 添加密码重置配置模板评论
router.post('/config/template/:templateId/comments', authenticateToken, checkRole(['admin']), passwordResetController.addPasswordResetConfigTemplateComment);

// 更新密码重置配置模板评论
router.put('/config/template/:templateId/comment/:commentId', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetConfigTemplateComment);

// 删除密码重置配置模板评论
router.delete('/config/template/:templateId/comment/:commentId', authenticateToken, checkRole(['admin']), passwordResetController.deletePasswordResetConfigTemplateComment);

// 获取密码重置配置模板标签
router.get('/config/templates/tags', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTags);

// 获取密码重置配置模板分类
router.get('/config/templates/categories', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateCategories);

// 搜索密码重置配置模板
router.get('/config/templates/search', authenticateToken, checkRole(['admin']), passwordResetController.searchPasswordResetConfigTemplates);

// 获取密码重置配置模板热门
router.get('/config/templates/popular', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplatePopular);

// 获取密码重置配置模板最新
router.get('/config/templates/latest', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateLatest);

// 获取密码重置配置模板推荐
router.get('/config/templates/featured', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateFeatured);

// 获取密码重置配置模板相似
router.get('/config/template/:templateId/similar', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateSimilar);

// 获取密码重置配置模板依赖
router.get('/config/template/:templateId/dependencies', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDependencies);

// 获取密码重置配置模板兼容性
router.get('/config/template/:templateId/compatibility', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateCompatibility);

// 获取密码重置配置模板更新日志
router.get('/config/template/:templateId/changelog', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateChangelog);

// 获取密码重置配置模板版本
router.get('/config/template/:templateId/versions', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateVersions);

// 获取密码重置配置模板版本详情
router.get('/config/template/:templateId/version/:versionId', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateVersionDetail);

// 回滚密码重置配置模板版本
router.post('/config/template/:templateId/version/:versionId/rollback', authenticateToken, checkRole(['admin']), passwordResetController.rollbackPasswordResetConfigTemplateVersion);

// 删除密码重置配置模板版本
router.delete('/config/template/:templateId/version/:versionId', authenticateToken, checkRole(['admin']), passwordResetController.deletePasswordResetConfigTemplateVersion);

// 获取密码重置配置模板下载链接
router.get('/config/template/:templateId/version/:versionId/download', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDownloadUrl);

// 获取密码重置配置模板预览
router.get('/config/template/:templateId/preview', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplatePreview);

// 获取密码重置配置模板验证结果
router.get('/config/template/:templateId/validation', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateValidation);

// 验证密码重置配置模板
router.post('/config/template/:templateId/validate', authenticateToken, checkRole(['admin']), passwordResetController.validatePasswordResetConfigTemplate);

// 获取密码重置配置模板测试结果
router.get('/config/template/:templateId/test-results', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTestResults);

// 测试密码重置配置模板
router.post('/config/template/:templateId/test', authenticateToken, checkRole(['admin']), passwordResetController.testPasswordResetConfigTemplate);

// 获取密码重置配置模板部署状态
router.get('/config/template/:templateId/deployment-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDeploymentStatus);

// 部署密码重置配置模板
router.post('/config/template/:templateId/deploy', authenticateToken, checkRole(['admin']), passwordResetController.deployPasswordResetConfigTemplate);

// 取消密码重置配置模板部署
router.delete('/config/template/:templateId/deploy', authenticateToken, checkRole(['admin']), passwordResetController.cancelPasswordResetConfigTemplateDeployment);

// 获取密码重置配置模板部署日志
router.get('/config/template/:templateId/deployment-logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDeploymentLogs);

// 获取密码重置配置模板部署历史
router.get('/config/template/:templateId/deployment-history', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateDeploymentHistory);

// 获取密码重置配置模板回滚历史
router.get('/config/template/:templateId/rollback-history', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateRollbackHistory);

// 获取密码重置配置模板性能指标
router.get('/config/template/:templateId/performance-metrics', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplatePerformanceMetrics);

// 获取密码重置配置模板健康状态
router.get('/config/template/:templateId/health-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateHealthStatus);

// 执行密码重置配置模板健康检查
router.post('/config/template/:templateId/health-check', authenticateToken, checkRole(['admin']), passwordResetController.performPasswordResetConfigTemplateHealthCheck);

// 获取密码重置配置模板错误统计
router.get('/config/template/:templateId/error-stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateErrorStats);

// 获取密码重置配置模板错误日志
router.get('/config/template/:templateId/error-logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateErrorLogs);

// 清理密码重置配置模板错误日志
router.delete('/config/template/:templateId/error-logs/cleanup', authenticateToken, checkRole(['admin']), passwordResetController.cleanupPasswordResetConfigTemplateErrorLogs);

// 获取密码重置配置模板缓存状态
router.get('/config/template/:templateId/cache-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateCacheStatus);

// 清理密码重置配置模板缓存
router.delete('/config/template/:templateId/cache/clear', authenticateToken, checkRole(['admin']), passwordResetController.clearPasswordResetConfigTemplateCache);

// 预热密码重置配置模板缓存
router.post('/config/template/:templateId/cache/warmup', authenticateToken, checkRole(['admin']), passwordResetController.warmupPasswordResetConfigTemplateCache);

// 获取密码重置配置模板队列状态
router.get('/config/template/:templateId/queue-status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateQueueStatus);

// 处理密码重置配置模板队列
router.post('/config/template/:templateId/queue/process', authenticateToken, checkRole(['admin']), passwordResetController.processPasswordResetConfigTemplateQueue);

// 清空密码重置配置模板队列
router.delete('/config/template/:templateId/queue/clear', authenticateToken, checkRole(['admin']), passwordResetController.clearPasswordResetConfigTemplateQueue);

// 获取密码重置配置模板任务状态
router.get('/config/template/:templateId/task/:taskId/status', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskStatus);

// 取消密码重置配置模板任务
router.delete('/config/template/:templateId/task/:taskId/cancel', authenticateToken, checkRole(['admin']), passwordResetController.cancelPasswordResetConfigTemplateTask);

// 重试密码重置配置模板任务
router.post('/config/template/:templateId/task/:taskId/retry', authenticateToken, checkRole(['admin']), passwordResetController.retryPasswordResetConfigTemplateTask);

// 获取密码重置配置模板任务列表
router.get('/config/template/:templateId/tasks', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskList);

// 创建密码重置配置模板任务
router.post('/config/template/:templateId/tasks', authenticateToken, checkRole(['admin']), passwordResetController.createPasswordResetConfigTemplateTask);

// 更新密码重置配置模板任务
router.put('/config/template/:templateId/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.updatePasswordResetConfigTemplateTask);

// 删除密码重置配置模板任务
router.delete('/config/template/:templateId/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.deletePasswordResetConfigTemplateTask);

// 获取密码重置配置模板任务详情
router.get('/config/template/:templateId/task/:taskId', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskDetail);

// 批量处理密码重置配置模板任务
router.post('/config/template/:templateId/tasks/batch', authenticateToken, checkRole(['admin']), passwordResetController.batchProcessPasswordResetConfigTemplateTasks);

// 获取密码重置配置模板任务统计
router.get('/config/template/:templateId/tasks/stats', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskStats);

// 获取密码重置配置模板任务日志
router.get('/config/template/:templateId/task/:taskId/logs', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskLogs);

// 导出密码重置配置模板任务日志
router.get('/config/template/:templateId/task/:taskId/logs/export', authenticateToken, checkRole(['admin']), passwordResetController.exportPasswordResetConfigTemplateTaskLogs);

// 获取密码重置配置模板任务报告
router.get('/config/template/:templateId/task/:taskId/report', authenticateToken, checkRole(['admin']), passwordResetController.getPasswordResetConfigTemplateTaskReport);

// 生成密码重置配置模板任务报告
router.post('/config/template/:templateId/task/:taskId/report/generate', authenticateToken, checkRole(['admin']), passwordResetController.generatePasswordResetConfigTemplateTaskReport);

module.exports = router;