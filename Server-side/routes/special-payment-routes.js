const express = require('express');
const router = express.Router();
const specialPaymentRulesController = require('../controllers/special-payment-rules-controller');
const { authenticateToken, checkPermission } = require('../middleware/tokenManager');

// 获取房间的特殊支付规则列表
router.get('/rooms/:roomId/rules', 
  authenticateToken, 
  specialPaymentRulesController.getRoomPaymentRules
);

// 创建特殊支付规则
router.post('/rooms/:roomId/rules', 
  authenticateToken, 
  checkPermission(['ROOM_MANAGE']), 
  specialPaymentRulesController.createPaymentRule
);

// 更新特殊支付规则
router.put('/rules/:ruleId', 
  authenticateToken, 
  specialPaymentRulesController.updatePaymentRule
);

// 删除特殊支付规则
router.delete('/rules/:ruleId', 
  authenticateToken, 
  specialPaymentRulesController.deletePaymentRule
);

// 获取适用于账单的特殊支付规则
router.get('/bills/:billId/applicable-rules', 
  authenticateToken, 
  specialPaymentRulesController.getApplicableRules
);

// 应用特殊支付规则到账单
router.post('/bills/:billId/rules/:ruleId/apply', 
  authenticateToken, 
  checkPermission(['BILL_MANAGE']), 
  specialPaymentRulesController.applyPaymentRule
);

// 创建支付转移记录（缴费人之间支付）
router.post('/bills/:billId/transfers', 
  authenticateToken, 
  specialPaymentRulesController.createPaymentTransfer
);

// 获取账单的支付转移记录
router.get('/bills/:billId/transfers', 
  authenticateToken, 
  specialPaymentRulesController.getBillPaymentTransfers
);

module.exports = router;