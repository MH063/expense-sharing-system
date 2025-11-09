/**
 * 管理端账单路由
 * 处理管理端账单相关的HTTP请求
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const billController = require('../controllers/bill-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');
const { adminValidationRules, handleValidationErrors } = require('../middleware/validation-middleware');

const router = express.Router();

// 所有路由都需要管理员权限
router.use(authenticateToken);
router.use(checkRole(['admin']));

/**
 * 获取账单统计数据
 * GET /admin/bills/statistics
 */
router.get('/statistics', adminValidationRules.getBillStatistics, handleValidationErrors, billController.getBillStatistics);

/**
 * 获取账单分类列表
 * GET /admin/bills/categories
 */
router.get('/categories', adminValidationRules.getBillCategories, handleValidationErrors, billController.getBillCategories);

/**
 * 创建账单分类
 * POST /admin/bills/categories
 */
router.post('/categories', adminValidationRules.createBillCategory, handleValidationErrors, billController.createBillCategory);

/**
 * 更新账单分类
 * PUT /admin/bills/categories/:id
 */
router.put('/categories/:id', adminValidationRules.updateBillCategory, handleValidationErrors, billController.updateBillCategory);

/**
 * 删除账单分类
 * DELETE /admin/bills/categories/:id
 */
router.delete('/categories/:id', adminValidationRules.deleteBillCategory, handleValidationErrors, billController.deleteBillCategory);

/**
 * 获取账单列表
 * GET /admin/bills
 */
router.get('/', billController.getBills);

/**
 * 获取账单详情
 * GET /admin/bills/:id
 */
router.get('/:id', adminValidationRules.getBillById, handleValidationErrors, billController.getBillById);

/**
 * 更新账单
 * PUT /admin/bills/:id
 */
router.put('/:id', adminValidationRules.updateBill, handleValidationErrors, billController.updateBill);

/**
 * 删除账单
 * DELETE /admin/bills/:id
 */
router.delete('/:id', adminValidationRules.deleteBill, handleValidationErrors, billController.deleteBill);

/**
 * 获取账单评论
 * GET /admin/bills/:id/comments
 */
router.get('/:id/comments', 
  [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
  ], 
  handleValidationErrors, 
  billController.getBillComments
);

/**
 * 添加账单评论
 * POST /admin/bills/:id/comments
 */
router.post('/:id/comments', 
  [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('content')
      .exists({ checkFalsy: true }).withMessage('评论内容为必填项')
      .isString().withMessage('评论内容必须是字符串')
      .isLength({ min: 1, max: 500 }).withMessage('评论内容长度必须在1-500个字符之间')
  ], 
  handleValidationErrors, 
  billController.addBillComment
);

/**
 * 更新账单评论
 * PUT /admin/bills/comments/:commentId
 */
router.put('/comments/:commentId', adminValidationRules.updateBillComment, handleValidationErrors, billController.updateBillComment);

/**
 * 删除账单评论
 * DELETE /admin/bills/comments/:commentId
 */
router.delete('/comments/:commentId', adminValidationRules.deleteBillComment, handleValidationErrors, billController.deleteBillComment);

/**
 * 获取账单分摊详情
 * GET /admin/bills/:id/splits
 */
router.get('/:id/splits', 
  [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数')
  ], 
  handleValidationErrors, 
  billController.getBillSplits
);

/**
 * 创建账单分摊
 * POST /admin/bills/:id/splits
 */
router.post('/:id/splits', 
  [
    param('id')
      .exists({ checkFalsy: true }).withMessage('账单ID为必填项')
      .isInt({ min: 1 }).withMessage('账单ID必须是正整数'),
    body('splitType')
      .exists({ checkFalsy: true }).withMessage('分摊类型为必填项')
      .isIn(['EQUAL', 'CUSTOM', 'PERCENTAGE']).withMessage('分摊类型无效'),
    body('splitDetails')
      .exists({ checkFalsy: true }).withMessage('分摊详情为必填项')
      .isArray().withMessage('分摊详情必须是数组')
  ], 
  handleValidationErrors, 
  billController.createBillSplit
);

/**
 * 更新账单分摊
 * PUT /admin/bills/splits/:splitId
 */
router.put('/splits/:splitId', 
  [
    param('splitId')
      .exists({ checkFalsy: true }).withMessage('分摊ID为必填项')
      .isInt({ min: 1 }).withMessage('分摊ID必须是正整数'),
    body('splitType')
      .optional()
      .isIn(['EQUAL', 'CUSTOM', 'PERCENTAGE']).withMessage('分摊类型无效'),
    body('splitDetails')
      .optional()
      .isArray().withMessage('分摊详情必须是数组')
  ], 
  handleValidationErrors, 
  billController.updateBillSplit
);

/**
 * 删除账单分摊
 * DELETE /admin/bills/splits/:splitId
 */
router.delete('/splits/:splitId', 
  [
    param('splitId')
      .exists({ checkFalsy: true }).withMessage('分摊ID为必填项')
      .isInt({ min: 1 }).withMessage('分摊ID必须是正整数')
  ], 
  handleValidationErrors, 
  billController.deleteBillSplit
);

module.exports = router;