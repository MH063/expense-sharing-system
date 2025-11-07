const { pool } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * 审计日志中间件
 * 用于记录用户操作日志到数据库和文件
 */

/**
 * 记录用户活动日志到数据库
 * @param {string} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {Object} details - 操作详情
 */
async function logUserActivity(userId, action, details = {}) {
  try {
    await pool.query(
      `INSERT INTO user_activity_logs (user_id, action, detail, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, action, details]
    );
  } catch (error) {
    logger.error('记录用户活动日志失败:', error);
  }
}

/**
 * 审计日志中间件
 * 记录用户的操作行为
 * @param {Object} options - 配置选项
 * @param {string} options.action - 操作类型
 * @param {Function} options.getDetails - 获取操作详情的函数
 */
function auditLogger(options = {}) {
  const { action, getDetails } = options;

  return async (req, res, next) => {
    try {
      // 确保用户已通过认证
      if (!req.user || !req.user.sub) {
        return next();
      }

      const userId = req.user.sub;
      const ip = req.ip;
      const userAgent = req.get('User-Agent');
      const method = req.method;
      const url = req.url;

      // 获取操作详情
      let details = {
        method,
        url,
        ip,
        userAgent
      };

      // 如果提供了获取详情的函数，则调用它
      if (typeof getDetails === 'function') {
        try {
          const additionalDetails = await getDetails(req, res);
          details = { ...details, ...additionalDetails };
        } catch (error) {
          logger.warn('获取操作详情失败:', error);
        }
      }

      // 记录到文件日志
      logger.info('用户操作审计', {
        userId,
        action: action || 'unknown_action',
        details
      });

      // 记录到数据库
      await logUserActivity(userId, action || 'unknown_action', details);

      next();
    } catch (error) {
      logger.error('审计日志记录失败:', error);
      // 即使审计日志失败，也不应该影响主流程
      next();
    }
  };
}

/**
 * 创建特定操作的审计日志中间件
 */
const auditLoggers = {
  // 用户登录
  login: auditLogger({
    action: 'user_login',
    getDetails: (req) => ({
      username: req.body.username,
      loginMethod: req.body.mfa_code ? 'mfa' : 'password'
    })
  }),

  // 用户登出
  logout: auditLogger({
    action: 'user_logout'
  }),

  // 创建账单
  createBill: auditLogger({
    action: 'create_bill',
    getDetails: (req) => ({
      billTitle: req.body.title,
      billAmount: req.body.amount,
      roomId: req.body.room_id
    })
  }),

  // 更新账单
  updateBill: auditLogger({
    action: 'update_bill',
    getDetails: (req) => ({
      billId: req.params.id,
      billTitle: req.body.title,
      billAmount: req.body.amount
    })
  }),

  // 删除账单
  deleteBill: auditLogger({
    action: 'delete_bill',
    getDetails: (req) => ({
      billId: req.params.id
    })
  }),

  // 创建费用
  createExpense: auditLogger({
    action: 'create_expense',
    getDetails: (req) => ({
      expenseTitle: req.body.title,
      expenseAmount: req.body.amount,
      roomId: req.body.room_id
    })
  }),

  // 更新费用
  updateExpense: auditLogger({
    action: 'update_expense',
    getDetails: (req) => ({
      expenseId: req.params.id,
      expenseTitle: req.body.title,
      expenseAmount: req.body.amount
    })
  }),

  // 删除费用
  deleteExpense: auditLogger({
    action: 'delete_expense',
    getDetails: (req) => ({
      expenseId: req.params.id
    })
  }),

  // 创建支付
  createPayment: auditLogger({
    action: 'create_payment',
    getDetails: (req) => ({
      billId: req.body.bill_id,
      paymentAmount: req.body.amount,
      paymentMethod: req.body.method
    })
  }),

  // 更新用户资料
  updateUserProfile: auditLogger({
    action: 'update_user_profile',
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body)
    })
  }),

  // 修改密码
  changePassword: auditLogger({
    action: 'change_password'
  }),

  // 启用MFA
  enableMFA: auditLogger({
    action: 'enable_mfa'
  }),

  // 禁用MFA
  disableMFA: auditLogger({
    action: 'disable_mfa'
  })
};

module.exports = {
  logUserActivity,
  auditLogger,
  auditLoggers
};