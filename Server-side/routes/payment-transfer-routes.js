/**
 * 支付转移记录路由
 * 定义支付转移记录相关的API路由
 */

const express = require('express');
const router = express.Router();
const {
  getPaymentTransfers,
  createPaymentTransfer,
  confirmPaymentTransfer,
  cancelPaymentTransfer,
  getPaymentTransferById
} = require('../controllers/payment-transfer-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { body, param, query } = require('express-validator');

// 所有路由都需要身份验证
router.use(authenticateToken);

/**
 * @route GET /api/payment-transfers
 * @desc 获取支付转移记录列表
 * @access Private
 * @param {string} billId - 账单ID（可选）
 * @param {string} transferType - 转移类型（可选）
 * @param {string} status - 状态（可选）
 * @param {string} startDate - 开始日期（可选）
 * @param {string} endDate - 结束日期（可选）
 * @param {number} page - 页码（默认为1）
 * @param {number} pageSize - 每页数量（默认为10）
 */
router.get('/', [
  query('billId').optional().isUUID().withMessage('账单ID必须是有效的UUID'),
  query('transferType').optional().isIn(['self_pay', 'multiple_payers', 'payer_transfer']).withMessage('转移类型无效'),
  query('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('状态无效'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
], getPaymentTransfers);

/**
 * @route POST /api/payment-transfers
 * @desc 创建支付转移记录
 * @access Private
 * @param {string} billId - 账单ID
 * @param {string} transferType - 转移类型
 * @param {number} amount - 金额
 * @param {string} fromUserId - 付款人ID
 * @param {string} toUserId - 收款人ID
 * @param {string} note - 备注（可选）
 */
router.post('/', [
  body('billId').isUUID().withMessage('账单ID必须是有效的UUID'),
  body('transferType').isIn(['self_pay', 'multiple_payers', 'payer_transfer']).withMessage('转移类型无效'),
  body('amount').isFloat({ min: 0.01 }).withMessage('金额必须是大于0的数字'),
  body('fromUserId').isUUID().withMessage('付款人ID必须是有效的UUID'),
  body('toUserId').isUUID().withMessage('收款人ID必须是有效的UUID'),
  body('note').optional().isLength({ max: 500 }).withMessage('备注长度不能超过500个字符')
], createPaymentTransfer);

/**
 * @route GET /api/payment-transfers/:id
 * @desc 获取支付转移记录详情
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.get('/:id', [
  param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
], getPaymentTransferById);

/**
 * @route PUT /api/payment-transfers/:id/confirm
 * @desc 确认支付转移记录
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.put('/:id/confirm', [
  param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
], confirmPaymentTransfer);

/**
 * @route PUT /api/payment-transfers/:id/cancel
 * @desc 取消支付转移记录
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.put('/:id/cancel', [
  param('id').isUUID().withMessage('转移记录ID必须是有效的UUID')
], cancelPaymentTransfer);

module.exports = router;