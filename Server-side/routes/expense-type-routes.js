const express = require('express');
const router = express.Router();
const expenseTypeController = require('../controllers/expense-type-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

// 创建费用类型（登录用户）
router.post('/', authenticateToken, expenseTypeController.createExpenseType);

// 获取费用类型列表
router.get('/', expenseTypeController.getExpenseTypes);

// 获取默认费用类型列表
router.get('/default', authenticateToken, expenseTypeController.getDefaultExpenseTypes);

// 获取费用类型详情
router.get('/:id', authenticateToken, expenseTypeController.getExpenseTypeById);

// 更新费用类型（仅创建者）
router.put('/:id', authenticateToken, expenseTypeController.updateExpenseType);

// 删除费用类型（仅创建者）
router.delete('/:id', authenticateToken, expenseTypeController.deleteExpenseType);

module.exports = router;