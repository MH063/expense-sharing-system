/**
 * 用户资料和设置路由
 * 处理用户个人资料和系统设置相关的API请求
 */

const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/user-profile-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const checkRole = require('../middleware/role-middleware');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const { checkFileContent, strictFileTypeValidation, advancedFileContentCheck } = require('../middleware/fileSecurity');
const path = require('path');
const fs = require('fs');

// 创建上传目录
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

// 创建multer实例，限制文件大小为5MB
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 获取当前用户资料
router.get('/profile', authenticateToken, userProfileController.getUserProfile);

// 更新用户资料
router.put('/profile', authenticateToken, roleAwareRateLimiter('update-profile'), userProfileController.updateUserProfile);

// 更新用户头像 - 添加文件上传和安全检查中间件
router.put('/avatar', authenticateToken, upload.single('avatar'), checkFileContent, strictFileTypeValidation, advancedFileContentCheck, userProfileController.updateUserAvatar);

// 更改密码
router.put('/change-password', authenticateToken, roleAwareRateLimiter('change-password'), userProfileController.changePassword);

// 获取用户设置
router.get('/settings', authenticateToken, userProfileController.getUserSettings);

// 更新用户设置
router.put('/settings', authenticateToken, userProfileController.updateUserSettings);

// 获取支持的语言列表
router.get('/languages', authenticateToken, userProfileController.getSupportedLanguages);

// 获取支持的主题列表
router.get('/themes', authenticateToken, userProfileController.getSupportedThemes);

// 验证邮箱
router.post('/verify-email', authenticateToken, roleAwareRateLimiter('verify-email'), userProfileController.verifyEmail);

// 发送邮箱验证邮件
router.post('/send-verification-email', authenticateToken, roleAwareRateLimiter('send-verification-email'), userProfileController.sendVerificationEmail);

// 更新邮箱
router.put('/email', authenticateToken, roleAwareRateLimiter('update-email'), userProfileController.updateEmail);

// 获取安全设置
router.get('/security', authenticateToken, userProfileController.getSecuritySettings);

// 更新安全设置
router.put('/security', authenticateToken, userProfileController.updateSecuritySettings);

// 获取隐私设置
router.get('/privacy', authenticateToken, userProfileController.getPrivacySettings);

// 更新隐私设置
router.put('/privacy', authenticateToken, userProfileController.updatePrivacySettings);

// 获取通知设置
router.get('/notifications', authenticateToken, userProfileController.getNotificationSettings);

// 更新通知设置
router.put('/notifications', authenticateToken, userProfileController.updateNotificationSettings);

// 获取账户链接状态
router.get('/account-links', authenticateToken, userProfileController.getAccountLinks);

// 链接第三方账户
router.post('/account-links', authenticateToken, userProfileController.linkThirdPartyAccount);

// 断开第三方账户链接
router.delete('/account-links/:provider', authenticateToken, userProfileController.unlinkThirdPartyAccount);

// 获取双因素认证状态
router.get('/2fa', authenticateToken, userProfileController.getTwoFactorAuthStatus);

// 启用双因素认证
router.post('/2fa/enable', authenticateToken, userProfileController.enableTwoFactorAuth);

// 禁用双因素认证
router.post('/2fa/disable', authenticateToken, userProfileController.disableTwoFactorAuth);

// 验证双因素认证代码
router.post('/2fa/verify', authenticateToken, userProfileController.verifyTwoFactorAuthCode);

// 获取双因素认证恢复代码
router.get('/2fa/recovery-codes', authenticateToken, userProfileController.getTwoFactorRecoveryCodes);

// 生成新的双因素认证恢复代码
router.post('/2fa/recovery-codes', authenticateToken, userProfileController.generateTwoFactorRecoveryCodes);

// 获取账户活动日志
router.get('/activity-logs', authenticateToken, userProfileController.getUserActivityLogs);

// 获取登录历史
router.get('/login-history', authenticateToken, userProfileController.getLoginHistory);

// 注销所有设备
router.post('/logout-all', authenticateToken, userProfileController.logoutAllDevices);

// 删除账户
router.delete('/account', authenticateToken, roleAwareRateLimiter('delete-account'), userProfileController.deleteAccount);

// 导出用户数据
router.get('/export-data', authenticateToken, userProfileController.exportUserData);

// 获取数据使用统计
router.get('/data-usage', authenticateToken, userProfileController.getDataUsage);

// 获取账户统计信息
router.get('/stats', authenticateToken, userProfileController.getAccountStats);

// 获取最近活动
router.get('/recent-activity', authenticateToken, userProfileController.getRecentActivity);

// 获取偏好设置
router.get('/preferences', authenticateToken, userProfileController.getPreferences);

// 更新偏好设置
router.put('/preferences', authenticateToken, userProfileController.updatePreferences);

// 获取自定义字段
router.get('/custom-fields', authenticateToken, userProfileController.getCustomFields);

// 更新自定义字段
router.put('/custom-fields', authenticateToken, userProfileController.updateCustomFields);

// 验证当前密码
router.post('/validate-password', authenticateToken, userProfileController.validateCurrentPassword);

// 检查用户名可用性
router.post('/check-username', authenticateToken, roleAwareRateLimiter('check-username'), userProfileController.checkUsernameAvailability);

// 检查邮箱可用性
router.post('/check-email', authenticateToken, roleAwareRateLimiter('check-email'), userProfileController.checkEmailAvailability);

// 获取时间zone列表
router.get('/timezones', authenticateToken, userProfileController.getTimezones);

// 获取货币列表
router.get('/currencies', authenticateToken, userProfileController.getCurrencies);

// 获取国家列表
router.get('/countries', authenticateToken, userProfileController.getCountries);

// 获取用户角色
router.get('/roles', authenticateToken, userProfileController.getUserRoles);

// 请求账户数据删除
router.post('/request-data-deletion', authenticateToken, userProfileController.requestDataDeletion);

// 取消账户数据删除请求
router.delete('/cancel-data-deletion', authenticateToken, userProfileController.cancelDataDeletionRequest);

// 获取账户数据删除状态
router.get('/data-deletion-status', authenticateToken, userProfileController.getDataDeletionStatus);

// 获取账户备份
router.get('/backups', authenticateToken, userProfileController.getAccountBackups);

// 创建账户备份
router.post('/backups', authenticateToken, userProfileController.createAccountBackup);

// 恢复账户备份
router.post('/backups/:backupId/restore', authenticateToken, userProfileController.restoreAccountBackup);

// 删除账户备份
router.delete('/backups/:backupId', authenticateToken, userProfileController.deleteAccountBackup);

// 获取账户备份详情
router.get('/backups/:backupId', authenticateToken, userProfileController.getAccountBackupDetails);

// 下载账户备份
router.get('/backups/:backupId/download', authenticateToken, userProfileController.downloadAccountBackup);

module.exports = router;