const express = require('express');
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { loginRateLimiter, devLoginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const { loginBruteProtector } = require('../middleware/bruteForce');
const { 
  handleValidationErrors, 
  userValidation,
  businessValidation,
  userValidationRules,
  loginValidationRules 
} = require('../middleware/validation-middleware');

const router = express.Router();

// 用户登录（输入校验 + 限流 + 防暴力）
router.post(
  '/login',
  loginValidationRules,
  handleValidationErrors,
  devLoginRateLimiter,
  loginBruteProtector,
  userController.login
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