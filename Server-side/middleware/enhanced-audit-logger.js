const { pool } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * 增强的审计日志中间件
 * 用于记录用户操作、数据变更和系统事件
 */

/**
 * 记录用户活动日志到数据库
 * @param {string} userId - 用户ID
 * @param {string} action - 操作类型
 * @param {Object} details - 操作详情
 * @param {string} ipAddress - IP地址
 * @param {string} userAgent - 用户代理
 */
async function logUserActivity(userId, action, details = {}, ipAddress = '', userAgent = '') {
  try {
    await pool.query(
      `INSERT INTO user_activity_logs (user_id, action, detail, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, JSON.stringify(details), ipAddress, userAgent]
    );
    
    logger.info(`用户活动记录: ${userId} - ${action}`, { details });
  } catch (error) {
    logger.error('记录用户活动日志失败:', error);
  }
}

/**
 * 记录数据变更审计日志到数据库
 * @param {string} userId - 用户ID
 * @param {string} tableName - 表名
 * @param {string} recordId - 记录ID
 * @param {string} operation - 操作类型 (CREATE, UPDATE, DELETE)
 * @param {Object} oldValues - 旧值
 * @param {Object} newValues - 新值
 * @param {string} ipAddress - IP地址
 * @param {string} userAgent - 用户代理
 */
async function logDataChangeAudit(userId, tableName, recordId, operation, oldValues = {}, newValues = {}, ipAddress = '', userAgent = '') {
  try {
    // 计算变更的字段
    const changedFields = [];
    if (operation === 'UPDATE') {
      for (const key in newValues) {
        if (oldValues[key] !== newValues[key]) {
          changedFields.push(key);
        }
      }
    } else if (operation === 'CREATE') {
      changedFields.push(...Object.keys(newValues));
    } else if (operation === 'DELETE') {
      changedFields.push(...Object.keys(oldValues));
    }
    
    await pool.query(
      `INSERT INTO data_change_audits (user_id, table_name, record_id, action, old_values, new_values, changed_fields, ip_address, user_agent, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        userId, 
        tableName, 
        recordId, 
        operation, 
        JSON.stringify(oldValues), 
        JSON.stringify(newValues), 
        JSON.stringify(changedFields), 
        ipAddress, 
        userAgent
      ]
    );
    
    logger.info(`数据变更审计: ${userId} - ${operation} ${tableName}:${recordId}`, { changedFields });
  } catch (error) {
    logger.error('记录数据变更审计失败:', error);
  }
}

/**
 * 记录系统事件日志到数据库
 * @param {string} eventType - 事件类型
 * @param {string} eventLevel - 事件级别 (INFO, WARNING, ERROR, CRITICAL)
 * @param {string} description - 事件描述
 * @param {Object} details - 事件详情
 * @param {string} userId - 相关用户ID (可选)
 */
async function logSystemEvent(eventType, eventLevel, description, details = {}, userId = null) {
  try {
    await pool.query(
      `INSERT INTO system_audit_logs (event_type, event_level, description, details, user_id, occurred_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [eventType, eventLevel, description, JSON.stringify(details), userId]
    );
    
    logger.info(`系统事件记录: ${eventType} - ${description}`, { details });
  } catch (error) {
    logger.error('记录系统事件失败:', error);
  }
}

/**
 * 增强的审计日志中间件
 * 记录用户的操作行为和数据变更
 * @param {Object} options - 配置选项
 * @param {string} options.action - 操作类型
 * @param {Function} options.getDetails - 获取操作详情的函数
 * @param {boolean} options.logDataChange - 是否记录数据变更
 * @param {string} options.tableName - 表名 (用于数据变更记录)
 * @param {string} options.recordIdParam - 记录ID参数名 (用于数据变更记录)
 * @param {Function} options.getOldData - 获取旧数据的函数 (用于数据变更记录)
 */
function enhancedAuditLogger(options = {}) {
  const { 
    action, 
    getDetails, 
    logDataChange = false, 
    tableName = '', 
    recordIdParam = 'id',
    getOldData
  } = options;

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

      // 记录用户活动日志
      await logUserActivity(userId, action || 'unknown_action', details, ip, userAgent);

      // 如果需要记录数据变更
      if (logDataChange && tableName) {
        const recordId = req.params[recordIdParam] || req.body.id;
        
        if (recordId) {
          let oldData = {};
          
          // 如果是更新或删除操作，尝试获取旧数据
          if ((method === 'PUT' || method === 'PATCH' || method === 'DELETE') && typeof getOldData === 'function') {
            try {
              oldData = await getOldData(recordId, req);
            } catch (error) {
              logger.warn('获取旧数据失败:', error);
            }
          }
          
          // 监听响应结束，记录数据变更
          res.on('finish', async () => {
            try {
              // 只有在操作成功时才记录数据变更
              if (res.statusCode >= 200 && res.statusCode < 300) {
                let operation = 'UNKNOWN';
                
                if (method === 'POST') {
                  operation = 'CREATE';
                } else if (method === 'PUT' || method === 'PATCH') {
                  operation = 'UPDATE';
                } else if (method === 'DELETE') {
                  operation = 'DELETE';
                }
                
                let newData = {};
                
                // 如果是创建或更新操作，记录新数据
                if (operation === 'CREATE' || operation === 'UPDATE') {
                  newData = { ...req.body };
                }
                
                await logDataChangeAudit(
                  userId, 
                  tableName, 
                  recordId, 
                  operation, 
                  oldData, 
                  newData, 
                  ip, 
                  userAgent
                );
              }
            } catch (error) {
              logger.error('记录数据变更审计失败:', error);
            }
          });
        }
      }

      next();
    } catch (error) {
      logger.error('增强审计日志记录失败:', error);
      // 即使审计日志失败，也不应该影响主流程
      next();
    }
  };
}

/**
 * 创建特定操作的增强审计日志中间件
 */
const enhancedAuditLoggers = {
  // 用户登录
  login: enhancedAuditLogger({
    action: 'user_login',
    getDetails: (req) => ({
      username: req.body.username,
      loginMethod: req.body.mfa_code ? 'mfa' : 'password'
    })
  }),

  // 用户登出
  logout: enhancedAuditLogger({
    action: 'user_logout'
  }),

  // 创建账单
  createBill: enhancedAuditLogger({
    action: 'create_bill',
    logDataChange: true,
    tableName: 'bills',
    getDetails: (req) => ({
      billTitle: req.body.title,
      billAmount: req.body.amount,
      roomId: req.body.room_id
    })
  }),

  // 更新账单
  updateBill: enhancedAuditLogger({
    action: 'update_bill',
    logDataChange: true,
    tableName: 'bills',
    recordIdParam: 'id',
    getDetails: (req) => ({
      billId: req.params.id,
      billTitle: req.body.title,
      billAmount: req.body.amount
    }),
    getOldData: async (billId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM bills WHERE id = $1', [billId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 删除账单
  deleteBill: enhancedAuditLogger({
    action: 'delete_bill',
    logDataChange: true,
    tableName: 'bills',
    recordIdParam: 'id',
    getDetails: (req) => ({
      billId: req.params.id
    }),
    getOldData: async (billId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM bills WHERE id = $1', [billId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 创建费用
  createExpense: enhancedAuditLogger({
    action: 'create_expense',
    logDataChange: true,
    tableName: 'expenses',
    getDetails: (req) => ({
      expenseTitle: req.body.title,
      expenseAmount: req.body.amount,
      roomId: req.body.room_id
    })
  }),

  // 更新费用
  updateExpense: enhancedAuditLogger({
    action: 'update_expense',
    logDataChange: true,
    tableName: 'expenses',
    recordIdParam: 'id',
    getDetails: (req) => ({
      expenseId: req.params.id,
      expenseTitle: req.body.title,
      expenseAmount: req.body.amount
    }),
    getOldData: async (expenseId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 删除费用
  deleteExpense: enhancedAuditLogger({
    action: 'delete_expense',
    logDataChange: true,
    tableName: 'expenses',
    recordIdParam: 'id',
    getDetails: (req) => ({
      expenseId: req.params.id
    }),
    getOldData: async (expenseId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 创建支付
  createPayment: enhancedAuditLogger({
    action: 'create_payment',
    logDataChange: true,
    tableName: 'payments',
    getDetails: (req) => ({
      billId: req.body.bill_id,
      paymentAmount: req.body.amount,
      paymentMethod: req.body.method
    })
  }),

  // 更新用户资料
  updateUserProfile: enhancedAuditLogger({
    action: 'update_user_profile',
    logDataChange: true,
    tableName: 'users',
    recordIdParam: 'id',
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body)
    }),
    getOldData: async (userId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT id, username, email, avatar FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 修改密码
  changePassword: enhancedAuditLogger({
    action: 'change_password',
    logDataChange: true,
    tableName: 'users',
    recordIdParam: 'id',
    getDetails: (req) => ({
      userId: req.user.sub
    }),
    getOldData: async (userId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 启用MFA
  enableMFA: enhancedAuditLogger({
    action: 'enable_mfa',
    logDataChange: true,
    tableName: 'users',
    recordIdParam: 'id',
    getDetails: (req) => ({
      userId: req.user.sub
    }),
    getOldData: async (userId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT id, username, email, mfa_enabled FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  }),

  // 禁用MFA
  disableMFA: enhancedAuditLogger({
    action: 'disable_mfa',
    logDataChange: true,
    tableName: 'users',
    recordIdParam: 'id',
    getDetails: (req) => ({
      userId: req.user.sub
    }),
    getOldData: async (userId, req) => {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT id, username, email, mfa_enabled FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 ? result.rows[0] : {};
      } finally {
        client.release();
      }
    }
  })
};

/**
 * 记录安全事件
 * @param {string} eventType - 事件类型
 * @param {string} description - 事件描述
 * @param {Object} details - 事件详情
 * @param {string} userId - 相关用户ID (可选)
 */
async function logSecurityEvent(eventType, description, details = {}, userId = null) {
  await logSystemEvent(eventType, 'WARNING', description, details, userId);
}

/**
 * 记录系统错误
 * @param {string} errorType - 错误类型
 * @param {string} errorMessage - 错误消息
 * @param {Object} errorDetails - 错误详情
 * @param {string} userId - 相关用户ID (可选)
 */
async function logSystemError(errorType, errorMessage, errorDetails = {}, userId = null) {
  await logSystemEvent(errorType, 'ERROR', errorMessage, errorDetails, userId);
}

module.exports = {
  logUserActivity,
  logDataChangeAudit,
  logSystemEvent,
  logSecurityEvent,
  logSystemError,
  enhancedAuditLogger,
  enhancedAuditLoggers
};