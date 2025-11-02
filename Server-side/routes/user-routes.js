const express = require('express');
const userController = require('../controllers/user-controller');

const router = express.Router();

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

module.exports = router;