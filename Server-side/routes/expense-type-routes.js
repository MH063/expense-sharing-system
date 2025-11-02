const express = require('express');
const router = express.Router();
const expenseTypeController = require('../controllers/expense-type-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

// 创建费用类型（仅管理员）
router.post('/', authenticateToken, checkRole(['admin']), expenseTypeController.createExpenseType);

// 获取费用类型列表
router.get('/', expenseTypeController.getExpenseTypes);

// 获取费用类型详情
router.get('/:id', expenseTypeController.getExpenseTypeById);

// 更新费用类型（仅管理员）
router.put('/:id', authenticateToken, checkRole(['admin']), expenseTypeController.updateExpenseType);

// 删除费用类型（仅管理员）
router.delete('/:id', authenticateToken, checkRole(['admin']), expenseTypeController.deleteExpenseType);

module.exports = router;