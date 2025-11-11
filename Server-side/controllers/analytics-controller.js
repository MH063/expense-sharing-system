const winston = require('winston');
const { pool } = require('../config/db');
const { PrecisionCalculator } = require('../services/precision-calculator');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/analytics-controller.log' })
  ]
});

/**
 * 分析控制器
 * 提供各种数据分析和统计功能
 */
class AnalyticsController {
  constructor() {
    this.logger = logger;
  }

  /**
   * @description 获取总体统计概览
   * @route GET /admin/analytics/overview
   * @access Private (Admin)
   */
  async getOverview(req, res) {
    const startTime = Date.now();
    const requestId = `analytics-overview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取总体统计概览`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      // 获取用户总数
      const userCountQuery = `
        SELECT COUNT(*) as count FROM users
        WHERE 1=1 ${dateCondition}
      `;
      const userCountParams = [...queryParams.filter((_, i) => i < (start_date ? 1 : 0) + (end_date ? 1 : 0))];
      const userCountResult = await pool.query(userCountQuery, userCountParams);
      const userCount = parseInt(userCountResult.rows[0].count);

      // 获取寝室总数
      const roomCountQuery = `
        SELECT COUNT(*) as count FROM rooms
        WHERE 1=1 ${dateCondition}
      `;
      const roomCountResult = await pool.query(roomCountQuery, userCountParams);
      const roomCount = parseInt(roomCountResult.rows[0].count);

      // 获取总费用数
      const expenseCountQuery = `
        SELECT COUNT(*) as count FROM expenses
        WHERE 1=1 ${dateCondition} ${roomCondition}
      `;
      const expenseCountResult = await pool.query(expenseCountQuery, queryParams);
      const expenseCount = parseInt(expenseCountResult.rows[0].count);

      // 获取总支付数
      const paymentCountQuery = `
        SELECT COUNT(*) as count FROM payments
        WHERE 1=1 ${dateCondition} ${roomCondition}
      `;
      const paymentCountResult = await pool.query(paymentCountQuery, queryParams);
      const paymentCount = parseInt(paymentCountResult.rows[0].count);

      // 获取总账单数
      const billCountQuery = `
        SELECT COUNT(*) as count FROM bills
        WHERE 1=1 ${dateCondition} ${roomCondition}
      `;
      const billCountResult = await pool.query(billCountQuery, queryParams);
      const billCount = parseInt(billCountResult.rows[0].count);

      // 获取总费用金额
      const totalExpenseAmountQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_amount FROM expenses
        WHERE 1=1 ${dateCondition} ${roomCondition}
      `;
      const totalExpenseAmountResult = await pool.query(totalExpenseAmountQuery, queryParams);
      const totalExpenseAmount = parseFloat(totalExpenseAmountResult.rows[0].total_amount);

      // 获取总支付金额
      const totalPaymentAmountQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_amount FROM payments
        WHERE 1=1 ${dateCondition} ${roomCondition}
      `;
      const totalPaymentAmountResult = await pool.query(totalPaymentAmountQuery, queryParams);
      const totalPaymentAmount = parseFloat(totalPaymentAmountResult.rows[0].total_amount);

      // 获取活跃用户数（近30天有活动的用户）
      const activeUserCountQuery = `
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' ${roomCondition}
          UNION
          SELECT user_id FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' ${roomCondition}
          UNION
          SELECT creator_id as user_id FROM bills WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' ${roomCondition}
        ) AS active_users
      `;
      const activeUserCountResult = await pool.query(activeUserCountQuery, room_id ? [room_id] : []);
      const activeUserCount = parseInt(activeUserCountResult.rows[0].count);

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取总体统计概览成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取总体统计概览成功', {
        overview: {
          user_count: userCount,
          room_count: roomCount,
          expense_count: expenseCount,
          payment_count: paymentCount,
          bill_count: billCount,
          total_expense_amount: PrecisionCalculator.round(totalExpenseAmount, 2),
          total_payment_amount: PrecisionCalculator.round(totalPaymentAmount, 2),
          active_user_count: activeUserCount,
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取总体统计概览失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取总体统计概览失败', error.message);
    }
  }

  /**
   * @description 获取用户统计
   * @route GET /admin/analytics/users
   * @access Private (Admin)
   */
  async getUserAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `user-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取用户统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      // 获取新增用户数（按天/周/月分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      const newUserQuery = `
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as new_users
        FROM users
        WHERE 1=1 ${dateCondition}
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period
      `;
      const newUserParams = [...queryParams.filter((_, i) => i < (start_date ? 1 : 0) + (end_date ? 1 : 0))];
      const newUserResult = await pool.query(newUserQuery, newUserParams);
      const newUserStats = newUserResult.rows;

      // 获取活跃用户数（按天/周/月分组）
      const activeUserQuery = `
        SELECT 
          TO_CHAR(activity_date, '${dateFormat}') as period,
          COUNT(DISTINCT user_id) as active_users
        FROM (
          SELECT user_id, created_at::date as activity_date FROM expenses WHERE 1=1 ${dateCondition} ${roomCondition}
          UNION ALL
          SELECT user_id, created_at::date as activity_date FROM payments WHERE 1=1 ${dateCondition} ${roomCondition}
          UNION ALL
          SELECT creator_id as user_id, created_at::date as activity_date FROM bills WHERE 1=1 ${dateCondition} ${roomCondition}
        ) AS activities
        GROUP BY TO_CHAR(activity_date, '${dateFormat}')
        ORDER BY period
      `;
      const activeUserResult = await pool.query(activeUserQuery, queryParams);
      const activeUserStats = activeUserResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取用户统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取用户统计成功', {
        user_stats: {
          new_users: newUserStats,
          active_users: activeUserStats,
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          group_by,
          room_id: room_id || null
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取用户统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取用户统计失败', error.message);
    }
  }

  /**
   * @description 获取账单统计
   * @route GET /admin/analytics/bills
   * @access Private (Admin)
   */
  async getBillAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `bill-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取账单统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, status, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      let statusCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      if (status) {
        statusCondition = ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // 获取账单数量和金额统计（按天/周/月分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      const billStatsQuery = `
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as bill_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
        FROM bills
        WHERE 1=1 ${dateCondition} ${roomCondition} ${statusCondition}
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period
      `;
      const billStatsResult = await pool.query(billStatsQuery, queryParams);
      const billStats = billStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取账单统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取账单统计成功', {
        bill_stats: billStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          status: status || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取账单统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取账单统计失败', error.message);
    }
  }

  /**
   * @description 获取费用统计
   * @route GET /admin/analytics/expenses
   * @access Private (Admin)
   */
  async getExpenseAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `expense-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取费用统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, category, status, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      let categoryCondition = '';
      let statusCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND e.expense_date >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND e.expense_date <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND e.room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      if (category) {
        categoryCondition = ` AND et.name = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      if (status) {
        statusCondition = ` AND e.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // 获取费用数量和金额统计（按天/周/月/类别分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'category':
          dateFormat = '';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      let groupByField, selectFields;
      if (group_by === 'category') {
        groupByField = 'et.name';
        selectFields = `${groupByField} as category,`;
      } else {
        groupByField = `TO_CHAR(e.expense_date, '${dateFormat}')`;
        selectFields = `${groupByField} as period,`;
      }

      const expenseStatsQuery = `
        SELECT 
          ${selectFields}
          COUNT(*) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COUNT(CASE WHEN e.status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN e.status = 'rejected' THEN 1 END) as rejected_count
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        WHERE 1=1 ${dateCondition} ${roomCondition} ${categoryCondition} ${statusCondition}
        GROUP BY ${groupByField}
        ORDER BY ${groupByField}
      `;
      const expenseStatsResult = await pool.query(expenseStatsQuery, queryParams);
      const expenseStats = expenseStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取费用统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取费用统计成功', {
        expense_stats: expenseStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          category: category || null,
          status: status || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取费用统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取费用统计失败', error.message);
    }
  }

  /**
   * @description 获取支付统计
   * @route GET /admin/analytics/payments
   * @access Private (Admin)
   */
  async getPaymentAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `payment-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取支付统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, method, status, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      let methodCondition = '';
      let statusCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      if (method) {
        methodCondition = ` AND payment_method = $${paramIndex}`;
        queryParams.push(method);
        paramIndex++;
      }

      if (status) {
        statusCondition = ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // 获取支付数量和金额统计（按天/周/月/支付方式分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'method':
          dateFormat = '';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      let groupByField, selectFields;
      if (group_by === 'method') {
        groupByField = 'payment_method';
        selectFields = `${groupByField} as method,`;
      } else {
        groupByField = `TO_CHAR(created_at, '${dateFormat}')`;
        selectFields = `${groupByField} as period,`;
      }

      const paymentStatsQuery = `
        SELECT 
          ${selectFields}
          COUNT(*) as payment_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM payments
        WHERE 1=1 ${dateCondition} ${roomCondition} ${methodCondition} ${statusCondition}
        GROUP BY ${groupByField}
        ORDER BY ${groupByField}
      `;
      const paymentStatsResult = await pool.query(paymentStatsQuery, queryParams);
      const paymentStats = paymentStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取支付统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取支付统计成功', {
        payment_stats: paymentStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          method: method || null,
          status: status || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取支付统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取支付统计失败', error.message);
    }
  }

  /**
   * @description 获取房间统计
   * @route GET /admin/analytics/rooms
   * @access Private (Admin)
   */
  async getRoomAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `room-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取房间统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND r.created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND r.created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND r.id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      // 获取房间数量统计（按天/周/月分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      const roomStatsQuery = `
        SELECT 
          TO_CHAR(r.created_at, '${dateFormat}') as period,
          COUNT(*) as room_count,
          AVG(members.member_count) as avg_member_count
        FROM rooms r
        LEFT JOIN (
          SELECT room_id, COUNT(*) as member_count 
          FROM user_room_relations 
          WHERE is_active = true 
          GROUP BY room_id
        ) members ON r.id = members.room_id
        WHERE 1=1 ${dateCondition} ${roomCondition}
        GROUP BY TO_CHAR(r.created_at, '${dateFormat}')
        ORDER BY period
      `;
      const roomStatsResult = await pool.query(roomStatsQuery, queryParams);
      const roomStats = roomStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取房间统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取房间统计成功', {
        room_stats: roomStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取房间统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取房间统计失败', error.message);
    }
  }

  /**
   * @description 获取活动统计
   * @route GET /admin/analytics/activities
   * @access Private (Admin)
   */
  async getActivityAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `activity-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取活动统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, type, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      let typeCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      if (type) {
        typeCondition = ` AND activity_type = $${paramIndex}`;
        queryParams.push(type);
        paramIndex++;
      }

      // 获取活动数量统计（按天/周/月/类型分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'type':
          dateFormat = '';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      let groupByField, selectFields;
      if (group_by === 'type') {
        groupByField = 'activity_type';
        selectFields = `${groupByField} as type,`;
      } else {
        groupByField = `TO_CHAR(created_at, '${dateFormat}')`;
        selectFields = `${groupByField} as period,`;
      }

      const activityStatsQuery = `
        SELECT 
          ${selectFields}
          COUNT(*) as activity_count,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM activities
        WHERE 1=1 ${dateCondition} ${roomCondition} ${typeCondition}
        GROUP BY ${groupByField}
        ORDER BY ${groupByField}
      `;
      const activityStatsResult = await pool.query(activityStatsQuery, queryParams);
      const activityStats = activityStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取活动统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取活动统计成功', {
        activity_stats: activityStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          type: type || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取活动统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取活动统计失败', error.message);
    }
  }

  /**
   * @description 获取请假统计
   * @route GET /admin/analytics/leaves
   * @access Private (Admin)
   */
  async getLeaveAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `leave-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取请假统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, status, type, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      let statusCondition = '';
      let typeCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      if (status) {
        statusCondition = ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (type) {
        typeCondition = ` AND leave_type = $${paramIndex}`;
        queryParams.push(type);
        paramIndex++;
      }

      // 获取请假数量统计（按天/周/月/类型分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'type':
          dateFormat = '';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      let groupByField, selectFields;
      if (group_by === 'type') {
        groupByField = 'leave_type';
        selectFields = `${groupByField} as type,`;
      } else {
        groupByField = `TO_CHAR(created_at, '${dateFormat}')`;
        selectFields = `${groupByField} as period,`;
      }

      const leaveStatsQuery = `
        SELECT 
          ${selectFields}
          COUNT(*) as leave_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
          COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) as total_hours
        FROM leaves
        WHERE 1=1 ${dateCondition} ${roomCondition} ${statusCondition} ${typeCondition}
        GROUP BY ${groupByField}
        ORDER BY ${groupByField}
      `;
      const leaveStatsResult = await pool.query(leaveStatsQuery, queryParams);
      const leaveStats = leaveStatsResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取请假统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取请假统计成功', {
        leave_stats: leaveStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          room_id: room_id || null,
          status: status || null,
          type: type || null,
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取请假统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取请假统计失败', error.message);
    }
  }

  /**
   * @description 获取系统使用统计
   * @route GET /admin/analytics/system
   * @access Private (Admin)
   */
  async getSystemAnalytics(req, res) {
    const startTime = Date.now();
    const requestId = `system-analytics-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取系统使用统计`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, metric, group_by = 'day' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      // 获取系统指标统计（按天/周/月/小时分组）
      let dateFormat;
      switch (group_by) {
        case 'week':
          dateFormat = 'YYYY-WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        case 'hour':
          dateFormat = 'YYYY-MM-DD HH24';
          break;
        default: // day
          dateFormat = 'YYYY-MM-DD';
      }

      let metricQuery;
      switch (metric) {
        case 'logins':
          metricQuery = `
            SELECT 
              TO_CHAR(created_at, '${dateFormat}') as period,
              COUNT(*) as count
            FROM login_logs
            WHERE 1=1 ${dateCondition}
            GROUP BY TO_CHAR(created_at, '${dateFormat}')
            ORDER BY period
          `;
          break;
        case 'page_views':
          metricQuery = `
            SELECT 
              TO_CHAR(created_at, '${dateFormat}') as period,
              COUNT(*) as count
            FROM page_views
            WHERE 1=1 ${dateCondition}
            GROUP BY TO_CHAR(created_at, '${dateFormat}')
            ORDER BY period
          `;
          break;
        case 'api_calls':
          metricQuery = `
            SELECT 
              TO_CHAR(created_at, '${dateFormat}') as period,
              COUNT(*) as count
            FROM api_calls
            WHERE 1=1 ${dateCondition}
            GROUP BY TO_CHAR(created_at, '${dateFormat}')
            ORDER BY period
          `;
          break;
        case 'errors':
          metricQuery = `
            SELECT 
              TO_CHAR(created_at, '${dateFormat}') as period,
              COUNT(*) as count
            FROM error_logs
            WHERE 1=1 ${dateCondition}
            GROUP BY TO_CHAR(created_at, '${dateFormat}')
            ORDER BY period
          `;
          break;
        default: // all metrics
          metricQuery = `
            SELECT 
              TO_CHAR(l.created_at, '${dateFormat}') as period,
              COUNT(l.id) as login_count,
              COUNT(pv.id) as page_view_count,
              COUNT(ac.id) as api_call_count,
              COUNT(el.id) as error_count
            FROM (
              SELECT created_at, id FROM login_logs WHERE 1=1 ${dateCondition}
            ) l
            FULL OUTER JOIN (
              SELECT created_at, id FROM page_views WHERE 1=1 ${dateCondition}
            ) pv ON TO_CHAR(l.created_at, '${dateFormat}') = TO_CHAR(pv.created_at, '${dateFormat}')
            FULL OUTER JOIN (
              SELECT created_at, id FROM api_calls WHERE 1=1 ${dateCondition}
            ) ac ON TO_CHAR(l.created_at, '${dateFormat}') = TO_CHAR(ac.created_at, '${dateFormat}')
            FULL OUTER JOIN (
              SELECT created_at, id FROM error_logs WHERE 1=1 ${dateCondition}
            ) el ON TO_CHAR(l.created_at, '${dateFormat}') = TO_CHAR(el.created_at, '${dateFormat}')
            GROUP BY TO_CHAR(l.created_at, '${dateFormat}')
            ORDER BY period
          `;
      }

      const metricResult = await pool.query(metricQuery, queryParams);
      const metricStats = metricResult.rows;

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取系统使用统计成功`, {
        requestId,
        userId,
        duration
      });

      res.success(200, '获取系统使用统计成功', {
        system_stats: metricStats,
        filters: {
          date_range: {
            start_date: start_date || null,
            end_date: end_date || null
          },
          metric: metric || 'all',
          group_by
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取系统使用统计失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取系统使用统计失败', error.message);
    }
  }

  /**
   * @description 获取财务报表
   * @route GET /admin/analytics/financial-report
   * @access Private (Admin)
   */
  async getFinancialReport(req, res) {
    const startTime = Date.now();
    const requestId = `financial-report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取财务报表`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, format = 'json' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      // 获取总收入统计
      const incomeQuery = `
        SELECT 
          COUNT(*) as payment_count,
          COALESCE(SUM(amount), 0) as total_income
        FROM payments
        WHERE status = 'completed' ${dateCondition} ${roomCondition}
      `;
      const incomeResult = await pool.query(incomeQuery, queryParams);
      const incomeStats = incomeResult.rows[0];

      // 获取总支出统计
      const expenseQuery = `
        SELECT 
          COUNT(*) as expense_count,
          COALESCE(SUM(amount), 0) as total_expense
        FROM expenses
        WHERE status = 'approved' ${dateCondition} ${roomCondition}
      `;
      const expenseResult = await pool.query(expenseQuery, queryParams);
      const expenseStats = expenseResult.rows[0];

      // 获取净收入
      const netIncome = PrecisionCalculator.subtract(
        parseFloat(incomeStats.total_income),
        parseFloat(expenseStats.total_expense)
      );

      // 获取按类别分组的收入明细
      const incomeDetailsQuery = `
        SELECT 
          payment_method,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM payments
        WHERE status = 'completed' ${dateCondition} ${roomCondition}
        GROUP BY payment_method
        ORDER BY amount DESC
      `;
      const incomeDetailsResult = await pool.query(incomeDetailsQuery, queryParams);
      const incomeDetails = incomeDetailsResult.rows;

      // 获取按类别分组的支出明细
      const expenseDetailsQuery = `
        SELECT 
          et.name as expense_type,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as amount
        FROM expenses e
        JOIN expense_types et ON e.expense_type_id = et.id
        WHERE e.status = 'approved' ${dateCondition} ${roomCondition}
        GROUP BY et.name
        ORDER BY amount DESC
      `;
      const expenseDetailsResult = await pool.query(expenseDetailsQuery, queryParams);
      const expenseDetails = expenseDetailsResult.rows;

      const reportData = {
        summary: {
          total_income: PrecisionCalculator.round(parseFloat(incomeStats.total_income), 2),
          total_expense: PrecisionCalculator.round(parseFloat(expenseStats.total_expense), 2),
          net_income: PrecisionCalculator.round(netIncome, 2),
          income_count: parseInt(incomeStats.payment_count),
          expense_count: parseInt(expenseStats.expense_count)
        },
        income_details: incomeDetails.map(detail => ({
          payment_method: detail.payment_method,
          count: parseInt(detail.count),
          amount: PrecisionCalculator.round(parseFloat(detail.amount), 2)
        })),
        expense_details: expenseDetails.map(detail => ({
          expense_type: detail.expense_type,
          count: parseInt(detail.count),
          amount: PrecisionCalculator.round(parseFloat(detail.amount), 2)
        })),
        date_range: {
          start_date: start_date || null,
          end_date: end_date || null
        },
        room_id: room_id || null
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取财务报表成功`, {
        requestId,
        userId,
        duration
      });

      // 根据请求的格式返回数据
      if (format === 'csv') {
        // 这里可以实现CSV格式的转换
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
        // CSV生成逻辑...
        res.send('CSV format not implemented yet');
      } else if (format === 'excel') {
        // 这里可以实现Excel格式的转换
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="financial-report.xlsx"');
        // Excel生成逻辑...
        res.send('Excel format not implemented yet');
      } else {
        res.success(200, '获取财务报表成功', reportData);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取财务报表失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取财务报表失败', error.message);
    }
  }

  /**
   * @description 获取用户活跃度报表
   * @route GET /admin/analytics/user-activity-report
   * @access Private (Admin)
   */
  async getUserActivityReport(req, res) {
    const startTime = Date.now();
    const requestId = `user-activity-report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.info(`[${requestId}] 开始获取用户活跃度报表`, {
      requestId,
      userId: req.user.sub
    });

    try {
      const { start_date, end_date, room_id, format = 'json' } = req.query;
      const userId = req.user.sub;

      // 构建查询条件
      let dateCondition = '';
      let roomCondition = '';
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        dateCondition += ` AND created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        dateCondition += ` AND created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (room_id) {
        roomCondition = ` AND room_id = $${paramIndex}`;
        queryParams.push(room_id);
        paramIndex++;
      }

      // 获取最活跃的用户
      const topActiveUsersQuery = `
        SELECT 
          u.id,
          u.username,
          u.name,
          COUNT(DISTINCT e.id) as expense_count,
          COUNT(DISTINCT p.id) as payment_count,
          COUNT(DISTINCT b.id) as bill_count,
          (COUNT(DISTINCT e.id) + COUNT(DISTINCT p.id) + COUNT(DISTINCT b.id)) as total_activities
        FROM users u
        LEFT JOIN expenses e ON u.id = e.created_by ${dateCondition.replace(/created_at/g, 'e.created_at')} ${roomCondition.replace(/room_id/g, 'e.room_id')}
        LEFT JOIN payments p ON u.id = p.user_id ${dateCondition.replace(/created_at/g, 'p.created_at')} ${roomCondition.replace(/room_id/g, 'p.room_id')}
        LEFT JOIN bills b ON u.id = b.creator_id ${dateCondition.replace(/created_at/g, 'b.created_at')} ${roomCondition.replace(/room_id/g, 'b.room_id')}
        WHERE u.id IS NOT NULL
        GROUP BY u.id, u.username, u.name
        ORDER BY total_activities DESC
        LIMIT 20
      `;
      const topActiveUsersResult = await pool.query(topActiveUsersQuery, queryParams);
      const topActiveUsers = topActiveUsersResult.rows;

      // 获取用户参与度统计
      const engagementStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN activity_count > 0 THEN 1 END) as active_users,
          COUNT(CASE WHEN activity_count > 10 THEN 1 END) as highly_active_users,
          AVG(activity_count) as avg_activities_per_user
        FROM (
          SELECT 
            u.id,
            COUNT(e.id) + COUNT(p.id) + COUNT(b.id) as activity_count
          FROM users u
          LEFT JOIN expenses e ON u.id = e.created_by ${dateCondition.replace(/created_at/g, 'e.created_at')} ${roomCondition.replace(/room_id/g, 'e.room_id')}
          LEFT JOIN payments p ON u.id = p.user_id ${dateCondition.replace(/created_at/g, 'p.created_at')} ${roomCondition.replace(/room_id/g, 'p.room_id')}
          LEFT JOIN bills b ON u.id = b.creator_id ${dateCondition.replace(/created_at/g, 'b.created_at')} ${roomCondition.replace(/room_id/g, 'b.room_id')}
          GROUP BY u.id
        ) user_activities
      `;
      const engagementStatsResult = await pool.query(engagementStatsQuery, queryParams);
      const engagementStats = engagementStatsResult.rows[0];

      const reportData = {
        top_active_users: topActiveUsers.map(user => ({
          id: user.id,
          username: user.username,
          name: user.name,
          expense_count: parseInt(user.expense_count),
          payment_count: parseInt(user.payment_count),
          bill_count: parseInt(user.bill_count),
          total_activities: parseInt(user.total_activities)
        })),
        engagement_stats: {
          total_users: parseInt(engagementStats.total_users),
          active_users: parseInt(engagementStats.active_users),
          highly_active_users: parseInt(engagementStats.highly_active_users),
          avg_activities_per_user: parseFloat(engagementStats.avg_activities_per_user)
        },
        date_range: {
          start_date: start_date || null,
          end_date: end_date || null
        },
        room_id: room_id || null
      };

      const duration = Date.now() - startTime;
      
      logger.info(`[${requestId}] 获取用户活跃度报表成功`, {
        requestId,
        userId,
        duration
      });

      // 根据请求的格式返回数据
      if (format === 'csv') {
        // 这里可以实现CSV格式的转换
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user-activity-report.csv"');
        // CSV生成逻辑...
        res.send('CSV format not implemented yet');
      } else if (format === 'excel') {
        // 这里可以实现Excel格式的转换
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="user-activity-report.xlsx"');
        // Excel生成逻辑...
        res.send('Excel format not implemented yet');
      } else {
        res.success(200, '获取用户活跃度报表成功', reportData);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`[${requestId}] 获取用户活跃度报表失败`, {
        requestId,
        userId: req.user.sub,
        error: error.message,
        stack: error.stack,
        duration
      });
      
      res.error(500, '获取用户活跃度报表失败', error.message);
    }
  }

  /**
   * @description 获取费用趋势分析
   * @route GET /admin/analytics/expense-trends
   * @access Private (Admin)
   */
  async getExpenseTrends(req, res) {
    try {
      const { start_date, end_date, room_id, category, period = 'month' } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`expense_date >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`expense_date <= $${paramIndex++}`);
        queryParams.push(end_date);
      }
      if (room_id) {
        conditions.push(`e.room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }
      if (category) {
        conditions.push(`et.name = $${paramIndex++}`);
        queryParams.push(category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let dateFormat;
      switch (period) {
        case 'year': dateFormat = 'YYYY'; break;
        case 'quarter': dateFormat = 'YYYY-Q'; break;
        case 'week': dateFormat = 'YYYY-WW'; break;
        default: dateFormat = 'YYYY-MM';
      }

      const result = await pool.query(
        `SELECT 
           TO_CHAR(e.expense_date, '${dateFormat}') as period,
           COUNT(*) as count,
           COALESCE(SUM(e.amount), 0) as total,
           AVG(e.amount) as average
         FROM expenses e
         JOIN expense_types et ON e.expense_type_id = et.id
         ${whereClause}
         GROUP BY TO_CHAR(e.expense_date, '${dateFormat}')
         ORDER BY period`,
        queryParams
      );

      return res.success(200, '获取费用趋势成功', { trends: result.rows });
    } catch (error) {
      logger.error('获取费用趋势失败:', error);
      return res.error(500, '获取费用趋势失败', error.message);
    }
  }

  /**
   * @description 获取用户消费分析
   * @route GET /admin/analytics/user-spending
   * * @access Private (Admin)
   */
  async getUserSpendingAnalysis(req, res) {
    try {
      const { start_date, end_date, room_id, user_id, group_by = 'month' } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }
      if (room_id) {
        conditions.push(`room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }
      if (user_id) {
        conditions.push(`user_id = $${paramIndex++}`);
        queryParams.push(user_id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let dateFormat;
      switch (group_by) {
        case 'day': dateFormat = 'YYYY-MM-DD'; break;
        case 'week': dateFormat = 'YYYY-WW'; break;
        case 'category': dateFormat = null; break;
        default: dateFormat = 'YYYY-MM';
      }

      let groupField = dateFormat ? `TO_CHAR(created_at, '${dateFormat}')` : 'payment_method';

      const result = await pool.query(
        `SELECT 
           ${dateFormat ? `${groupField} as period,` : 'payment_method,'}
           user_id,
           COUNT(*) as transaction_count,
           COALESCE(SUM(amount), 0) as total_spent
         FROM payments
         ${whereClause}
         GROUP BY ${groupField}${user_id ? '' : ', user_id'}
         ORDER BY ${groupField}`,
        queryParams
      );

      return res.success(200, '获取用户消费分析成功', { analysis: result.rows });
    } catch (error) {
      logger.error('获取用户消费分析失败:', error);
      return res.error(500, '获取用户消费分析失败', error.message);
    }
  }

  /**
   * @description 获取房间收支对比
   * @route GET /admin/analytics/room-balance
   * @access Private (Admin)
   */
  async getRoomBalanceAnalysis(req, res) {
    try {
      const { start_date, end_date, room_id, group_by = 'month' } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }
      if (room_id) {
        conditions.push(`room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let dateFormat;
      switch (group_by) {
        case 'day': dateFormat = 'YYYY-MM-DD'; break;
        case 'week': dateFormat = 'YYYY-WW'; break;
        default: dateFormat = 'YYYY-MM';
      }

      const result = await pool.query(
        `SELECT 
           room_id,
           TO_CHAR(created_at, '${dateFormat}') as period,
           COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expense,
           COALESCE(SUM(amount), 0) as balance
         FROM (
           SELECT room_id, created_at, amount FROM payments ${whereClause}
           UNION ALL
           SELECT room_id, expense_date as created_at, -amount FROM expenses ${whereClause.replace('created_at', 'expense_date')}
         ) combined
         GROUP BY room_id, TO_CHAR(created_at, '${dateFormat}')
         ORDER BY room_id, period`,
        queryParams
      );

      return res.success(200, '获取房间收支对比成功', { balance: result.rows });
    } catch (error) {
      logger.error('获取房间收支对比失败:', error);
      return res.error(500, '获取房间收支对比失败', error.message);
    }
  }

  /**
   * @description 获取支付方式分析
   * @route GET /admin/analytics/payment-methods
   * @access Private (Admin)
   */
  async getPaymentMethodAnalysis(req, res) {
    try {
      const { start_date, end_date, room_id, group_by = 'month' } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }
      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }
      if (room_id) {
        conditions.push(`room_id = $${paramIndex++}`);
        queryParams.push(room_id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT 
           payment_method,
           COUNT(*) as transaction_count,
           COALESCE(SUM(amount), 0) as total_amount,
           AVG(amount) as average_amount,
           MIN(amount) as min_amount,
           MAX(amount) as max_amount
         FROM payments
         ${whereClause}
         GROUP BY payment_method
         ORDER BY total_amount DESC`,
        queryParams
      );

      return res.success(200, '获取支付方式分析成功', { analysis: result.rows });
    } catch (error) {
      logger.error('获取支付方式分析失败:', error);
      return res.error(500, '获取支付方式分析失败', error.message);
    }
  }

  /**
   * @description 获取系统性能指标
   * @route GET /admin/analytics/performance
   * @access Private (Admin)
   */
  async getPerformanceMetrics(req, res) {
    try {
      const { start_date, end_date, metric } = req.query;

      // 这里可以集成实际的性能监控数据
      // 目前返回模拟数据
      const mockData = {
        response_time: {
          average: 150,
          p50: 120,
          p95: 280,
          p99: 450
        },
        cpu_usage: {
          average: 35.5,
          max: 78.2,
          min: 12.3
        },
        memory_usage: {
          average: 62.8,
          max: 85.4,
          min: 45.6
        },
        disk_usage: {
          total: 500,
          used: 245,
          free: 255,
          percent: 49
        }
      };

      return res.success(200, '获取系统性能指标成功', {
        metrics: metric ? { [metric]: mockData[metric] } : mockData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('获取系统性能指标失败:', error);
      return res.error(500, '获取系统性能指标失败', error.message);
    }
  }

  /**
   * @description 获取自定义报表
   * @route GET /admin/analytics/custom-report
   * @access Private (Admin)
   */
  async getCustomReport(req, res) {
    try {
      const { report_id, start_date, end_date, format = 'json' } = req.query;

      // 查找报表模板
      const templateResult = await pool.query(
        'SELECT * FROM report_templates WHERE id = $1',
        [report_id]
      );

      if (templateResult.rows.length === 0) {
        return res.error(404, '报表模板不存在');
      }

      const template = templateResult.rows[0];

      // 根据模板配置生成报表
      // 这里可以实现复杂的报表生成逻辑
      return res.success(200, '获取自定义报表成功', {
        report: {
          id: report_id,
          name: template.name,
          data: [],
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('获取自定义报表失败:', error);
      return res.error(500, '获取自定义报表失败', error.message);
    }
  }

  /**
   * @description 获取报表模板列表
   * @route GET /admin/analytics/report-templates
   * @access Private (Admin)
   */
  async getReportTemplates(req, res) {
    try {
      const { page = 1, limit = 20, category } = req.query;
      const offset = (page - 1) * limit;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (category) {
        conditions.push(`category = $${paramIndex++}`);
        queryParams.push(category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      queryParams.push(limit, offset);

      const templatesResult = await pool.query(
        `SELECT * FROM report_templates
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        queryParams
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM report_templates ${whereClause}`,
        queryParams.slice(0, -2)
      );

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取报表模板列表成功', {
        templates: templatesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取报表模板列表失败:', error);
      return res.error(500, '获取报表模板列表失败', error.message);
    }
  }

  /**
   * @description 创建报表模板
   * @route POST /admin/analytics/report-templates
   * @access Private (Admin)
   */
  async createReportTemplate(req, res) {
    try {
      const { name, description, category, config, is_public = false } = req.body;
      const userId = req.user.sub;

      const result = await pool.query(
        `INSERT INTO report_templates (
          name, description, category, config, is_public, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [name, description, category, JSON.stringify(config), is_public, userId]
      );

      return res.success(201, '创建报表模板成功', { template: result.rows[0] });
    } catch (error) {
      logger.error('创建报表模板失败:', error);
      return res.error(500, '创建报表模板失败', error.message);
    }
  }

  /**
   * @description 更新报表模板
   * @route PUT /admin/analytics/report-templates/:id
   * @access Private (Admin)
   */
  async updateReportTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, description, category, config, is_public } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(category);
      }
      if (config !== undefined) {
        updates.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(config));
      }
      if (is_public !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(is_public);
      }

      if (updates.length === 0) {
        return res.error(400, '没有可更新的字段');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE report_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.error(404, '报表模板不存在');
      }

      return res.success(200, '更新报表模板成功', { template: result.rows[0] });
    } catch (error) {
      logger.error('更新报表模板失败:', error);
      return res.error(500, '更新报表模板失败', error.message);
    }
  }

  /**
   * @description 删除报表模板
   * @route DELETE /admin/analytics/report-templates/:id
   * @access Private (Admin)
   */
  async deleteReportTemplate(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM report_templates WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '报表模板不存在');
      }

      return res.success(200, '删除报表模板成功');
    } catch (error) {
      logger.error('删除报表模板失败:', error);
      return res.error(500, '删除报表模板失败', error.message);
    }
  }
}

module.exports = new AnalyticsController();