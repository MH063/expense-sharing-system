/**
 * 第三方账号管理路由
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const ThirdPartyAccountController = require('../controllers/third-party-account-controller');

// 所有路由都需要身份验证
router.use(authenticateToken);

// 获取用户的第三方账号列表
router.get('/', roleAwareRateLimiter('loose'), (req, res) => {
  ThirdPartyAccountController.getUserThirdPartyAccounts(req, res);
});

// 连接新的第三方账号
router.post('/', roleAwareRateLimiter('strict'), (req, res) => {
  ThirdPartyAccountController.connectThirdPartyAccount(req, res);
});

// 更新第三方账号配置
router.put('/:id', roleAwareRateLimiter('strict'), (req, res) => {
  ThirdPartyAccountController.updateThirdPartyAccount(req, res);
});

// 断开第三方账号连接
router.delete('/:id', roleAwareRateLimiter('strict'), (req, res) => {
  ThirdPartyAccountController.disconnectThirdPartyAccount(req, res);
});

// 获取支持的第三方平台列表
router.get('/platforms', roleAwareRateLimiter('loose'), (req, res) => {
  ThirdPartyAccountController.getSupportedPlatforms(req, res);
});

// 管理员专用路由
// 获取所有用户的第三方账号（仅管理员）
router.get('/admin/all', authenticateToken, checkRole('admin'), roleAwareRateLimiter('loose'), (req, res) => {
  ThirdPartyAccountController.getAllThirdPartyAccounts(req, res);
});

// 管理员断开用户第三方账号连接（仅管理员）
router.delete('/admin/:id', authenticateToken, checkRole('admin'), roleAwareRateLimiter('strict'), (req, res) => {
  ThirdPartyAccountController.adminDisconnectThirdPartyAccount(req, res);
});

module.exports = router;