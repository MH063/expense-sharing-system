const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth-middleware');
const checkRole = require('../middleware/role-middleware');
const expenseController = require('../controllers/expense-controller');
const { handleValidationErrors } = require('../middleware/validation-middleware');

/**
 * @description 获取待审核费用列表
 * @route GET /admin/expenses
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效'),
    query('category').optional().isString().withMessage('费用类别必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('room_id').optional().isUUID().withMessage('房间ID格式无效')
  ],
  handleValidationErrors,
  expenseController.getExpenses
);

/**
 * @description 获取费用详情
 * @route GET /admin/expenses/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('费用ID格式无效')
  ],
  handleValidationErrors,
  expenseController.getExpenseById
);

/**
 * @description 审核费用
 * @route PUT /admin/expenses/:id/approve
 * @access Private (Admin)
 */
router.put('/:id/approve',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('费用ID格式无效'),
    body('status').isIn(['approved', 'rejected']).withMessage('状态值必须是approved或rejected'),
    body('review_notes').optional().isString().withMessage('审核备注必须是字符串')
  ],
  handleValidationErrors,
  expenseController.reviewExpense
);

/**
 * @description 费用分类管理
 * @route GET /admin/expenses/types
 * @access Private (Admin)
 */
router.get('/types',
  authenticateToken,
  checkRole(['admin']),
  expenseController.getExpenseTypes
);

module.exports = router;