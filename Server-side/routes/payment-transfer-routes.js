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
const { 
  paymentTransferValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

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
router.get('/', 
  paymentTransferValidationRules.getPaymentTransfers,
  handleValidationErrors,
  getPaymentTransfers
);

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
router.post('/', 
  paymentTransferValidationRules.createPaymentTransfer,
  handleValidationErrors,
  createPaymentTransfer
);

/**
 * @route GET /api/payment-transfers/:id
 * @desc 获取支付转移记录详情
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.get('/:id', 
  paymentTransferValidationRules.getPaymentTransferById,
  handleValidationErrors,
  getPaymentTransferById
);

/**
 * @route PUT /api/payment-transfers/:id/confirm
 * @desc 确认支付转移记录
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.put('/:id/confirm', 
  paymentTransferValidationRules.confirmPaymentTransfer,
  handleValidationErrors,
  confirmPaymentTransfer
);

/**
 * @route PUT /api/payment-transfers/:id/cancel
 * @desc 取消支付转移记录
 * @access Private
 * @param {string} id - 转移记录ID
 */
router.put('/:id/cancel', 
  paymentTransferValidationRules.cancelPaymentTransfer,
  handleValidationErrors,
  cancelPaymentTransfer
);

module.exports = router;