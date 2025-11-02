const express = require('express');
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

const router = express.Router();

// 用户登录
router.post('/login', userController.login);

// 用户注册
router.post('/register', userController.register);

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