const express = require('express');
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { loginRateLimiter, devLoginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const { loginBruteProtectorRedis } = require('../middleware/bruteForceRedis');
const { accountLockCheck } = require('../middleware/securityEnhancements');
const { 
  handleValidationErrors, 
  userValidation,
  businessValidation,
  userValidationRules,
  loginValidationRules 
} = require('../middleware/validation-middleware');

const router = express.Router();

// 用户登录（输入校验 + 限流 + 防暴力 + 账户锁定检查）
router.post(
  '/login',
  loginValidationRules,
  handleValidationErrors,
  devLoginRateLimiter,
  loginBruteProtectorRedis,
  accountLockCheck,
  userController.login
);

// 管理员登录（输入校验 + 限流 + 防暴力 + 账户锁定检查）
router.post(
  '/admin-login',
  loginValidationRules,
  handleValidationErrors,
  devLoginRateLimiter,
  loginBruteProtectorRedis,
  userController.adminLogin
);

// 用户注册（限流 + 输入校验）
router.post(
  '/register',
  registerRateLimiter,
  userValidationRules.register,
  businessValidation.isUsernameAvailable,
  businessValidation.isEmailAvailable,
  handleValidationErrors,
  userController.register
);

// 获取用户个人信息 - 需要认证
router.get('/profile', authenticateToken, userController.getProfile);

// 更新用户个人信息 - 需要认证
router.put('/profile', authenticateToken, userController.updateProfile);

// 修改密码 - 需要认证
router.post('/change-password', authenticateToken, userController.changePassword);

// 验证重置密码验证码
router.post('/verify-reset-code', userController.verifyResetCode);

// 获取用户会话列表 - 需要认证
router.get('/sessions', authenticateToken, userController.getSessions);

// 删除指定会话 - 需要认证
router.delete('/sessions/:sessionId', authenticateToken, userController.deleteSession);

// 删除所有会话 - 需要认证
router.delete('/sessions', authenticateToken, userController.deleteAllSessions);

// 绑定第三方账号 - 需要认证
router.post('/bind-third-party', authenticateToken, userController.bindThirdParty);

// 解绑第三方账号 - 需要认证
router.delete('/third-party/:id', authenticateToken, userController.unbindThirdParty);

// 获取第三方账号列表 - 需要认证
router.get('/third-party', authenticateToken, userController.getThirdPartyAccounts);

// 用户登出 - 需要认证
router.post('/logout', authenticateToken, (req, res) => {
  // 这里可以添加登出逻辑，比如将token加入黑名单
  res.status(200).json({
    success: true,
    message: '登出成功'
  });
});

// 刷新token
router.post('/refresh-token', userController.refreshToken);

// 忘记密码
router.post(
  '/forgot-password',
  userValidation.forgotPassword,
  handleValidationErrors,
  userController.forgotPassword
);

// 重置密码
router.post(
  '/reset-password',
  userValidation.resetPassword,
  handleValidationErrors,
  userController.resetPassword
);

module.exports = router;