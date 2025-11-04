const express = require('express');
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { loginRateLimiter, devLoginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const { loginBruteProtector } = require('../middleware/bruteForce');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 用户登录（输入校验 + 限流 + 防暴力）
router.post(
  '/login',
  [
    body('username').isString().trim().isLength({ min: 1 }).withMessage('用户名必填'),
    body('password').isString().isLength({ min: 1 }).withMessage('密码必填')
  ],
  handleValidationErrors,
  devLoginRateLimiter,
  loginBruteProtector,
  userController.login
);

// 用户注册（限流 + 输入校验）
router.post(
  '/register',
  registerRateLimiter,
  [
    body('username').isString().trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 })
  ],
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
router.post('/refresh', userController.refreshToken);

module.exports = router;