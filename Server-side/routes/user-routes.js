const express = require('express');
const userController = require('../controllers/user-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

const router = express.Router();

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取用户资料 - 需要认证
router.get('/profile', authenticateToken, userController.getProfile);

// 更新用户资料 - 需要认证
router.put('/profile', authenticateToken, userController.updateProfile);

// 获取用户列表 - 需要认证
router.get('/', authenticateToken, userController.getUsers);

// 获取用户详情 - 需要认证
router.get('/:id', authenticateToken, userController.getUserById);

// 修改密码 - 需要认证
router.put('/password', authenticateToken, userController.changePassword);

// 更新用户信息 - 需要认证
router.put('/:id', authenticateToken, userController.updateUser);

// 分配用户角色 - 需要认证
router.post('/:id/roles', authenticateToken, userController.assignUserRole);

module.exports = router;