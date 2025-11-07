const express = require('express');
const { authenticateToken } = require('../middleware/tokenManager');
const { auditLoggers, auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// 创建账单示例
router.post('/bills', authenticateToken, auditLoggers.createBill, (req, res) => {
  // 创建账单的业务逻辑
  res.json({
    success: true,
    message: '账单创建成功'
  });
});

// 更新账单示例
router.put('/bills/:id', authenticateToken, auditLoggers.updateBill, (req, res) => {
  // 更新账单的业务逻辑
  res.json({
    success: true,
    message: '账单更新成功'
  });
});

// 删除账单示例
router.delete('/bills/:id', authenticateToken, auditLoggers.deleteBill, (req, res) => {
  // 删除账单的业务逻辑
  res.json({
    success: true,
    message: '账单删除成功'
  });
});

// 创建费用示例
router.post('/expenses', authenticateToken, auditLoggers.createExpense, (req, res) => {
  // 创建费用的业务逻辑
  res.json({
    success: true,
    message: '费用创建成功'
  });
});

// 更新费用示例
router.put('/expenses/:id', authenticateToken, auditLoggers.updateExpense, (req, res) => {
  // 更新费用的业务逻辑
  res.json({
    success: true,
    message: '费用更新成功'
  });
});

// 删除费用示例
router.delete('/expenses/:id', authenticateToken, auditLoggers.deleteExpense, (req, res) => {
  // 删除费用的业务逻辑
  res.json({
    success: true,
    message: '费用删除成功'
  });
});

// 创建支付示例
router.post('/payments', authenticateToken, auditLoggers.createPayment, (req, res) => {
  // 创建支付的业务逻辑
  res.json({
    success: true,
    message: '支付创建成功'
  });
});

// 更新用户资料示例
router.put('/profile', authenticateToken, auditLoggers.updateUserProfile, (req, res) => {
  // 更新用户资料的业务逻辑
  res.json({
    success: true,
    message: '用户资料更新成功'
  });
});

// 修改密码示例
router.post('/change-password', authenticateToken, auditLoggers.changePassword, (req, res) => {
  // 修改密码的业务逻辑
  res.json({
    success: true,
    message: '密码修改成功'
  });
});

// 启用MFA示例
router.post('/mfa/enable', authenticateToken, auditLoggers.enableMFA, (req, res) => {
  // 启用MFA的业务逻辑
  res.json({
    success: true,
    message: 'MFA启用成功'
  });
});

// 禁用MFA示例
router.post('/mfa/disable', authenticateToken, auditLoggers.disableMFA, (req, res) => {
  // 禁用MFA的业务逻辑
  res.json({
    success: true,
    message: 'MFA禁用成功'
  });
});

// 自定义审计日志示例
router.post('/custom-action', authenticateToken, 
  auditLogger({
    action: 'custom_action',
    getDetails: (req) => ({
      customField: req.body.customField,
      additionalInfo: req.body.additionalInfo
    })
  }), 
  (req, res) => {
    // 自定义操作的业务逻辑
    res.json({
      success: true,
      message: '自定义操作执行成功'
    });
  }
);

module.exports = router;