const express = require('express');
const userController = require('../controllers/user-controller');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { 
  adminValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

const router = express.Router();

// 管理员登录
router.post(
  '/login',
  loginRateLimiter,
  adminValidationRules.login,
  handleValidationErrors,
  userController.adminLogin
);

module.exports = router;