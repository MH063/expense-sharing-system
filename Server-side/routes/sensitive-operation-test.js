const express = require('express');
const { authenticateToken } = require('../middleware/tokenManager');
const { sensitiveOperationMFA } = require('../middleware/securityEnhancements');

const router = express.Router();

// 敏感操作示例：删除账户
router.delete('/account', authenticateToken, sensitiveOperationMFA, (req, res) => {
  res.json({
    success: true,
    message: '账户删除成功'
  });
});

// 敏感操作示例：修改支付信息
router.post('/payment-info', authenticateToken, sensitiveOperationMFA, (req, res) => {
  res.json({
    success: true,
    message: '支付信息更新成功'
  });
});

module.exports = router;