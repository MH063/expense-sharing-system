const { Pool } = require('pg');
const winston = require('winston');
const { authenticateToken, requireRole } = require('../middleware/auth-middleware');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/stats-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/stats-combined.log' })
  ]
});

/**
 * 统计控制器
 * 处理各种统计数据的计算和查询
 */
class StatsController {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  /**
   * 获取用户统计信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserStats(req, res) {
    const client = await this.pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id, period = 'month' } = req.query; // period: week, month, quarter, year
      
      // 验证用户是否为寝室成员
      let roomFilter = '';
      const params = [user_id];
      let paramIndex = 2;
      
      if (room_id) {
        const memberCheck = await client.query(
          'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user_id]
        );
        
        if (memberCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: '您不是该寝室的成员'
          });
        }
        
        roomFilter = `AND e.room_id = $${paramIndex++}`;
        params.push(room_id);
      }
      
      // 根据周期设置时间范围
      let timeFilter = '';
      switch (period) {
        case 'week':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case 'quarter':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case 'year':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '365 days'`;
          break;
      }
      
      // 获取用户支付统计
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as payment_count,
          COALESCE(SUM(e.amount), 0) as total_paid,
          COALESCE(AVG(e.amount), 0) as avg_payment
        FROM expenses e
        WHERE e.payer_id = $1 ${roomFilter} ${timeFilter}
      `;
      
      const paymentStatsResult = await client.query(paymentStatsQuery, params);
      const paymentStats = paymentStatsResult.rows[0];
      
      // 获取用户分摊统计
      const splitStatsQuery = `
        SELECT 
          COUNT(*) as split_count,
          COALESCE(SUM(es.amount), 0) as total_owed,
          COALESCE(SUM(CASE WHEN es.status = 'PAID' THEN es.amount ELSE 0 END), 0) as total_paid_split,
          COALESCE(SUM(CASE WHEN es.status = 'PENDING' THEN es.amount ELSE 0 END), 0) as total_pending
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE es.user_id = $1 ${roomFilter} ${timeFilter}
      `;
      
      const splitStatsResult = await client.query(splitStatsQuery, params);
      const splitStats = splitStatsResult.rows[0];
      
      // 获取账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as bill_count,
          COALESCE(SUM(CASE WHEN b.creator_id = $1 THEN 1 ELSE 0 END), 0) as created_bills,
          COALESCE(SUM(CASE WHEN bs.user_id = $1 AND bs.status = 'PAID' THEN bs.amount ELSE 0 END), 0) as total_bill_paid,
          COALESCE(SUM(CASE WHEN bs.user_id = $1 AND bs.status = 'PENDING_PAYMENT' THEN bs.amount ELSE 0 END), 0) as total_bill_pending
        FROM bills b
        LEFT JOIN bill_splits bs ON b.id = bs.bill_id
        JOIN room_members rm ON b.room_id = rm.room_id
        WHERE rm.user_id = $1 ${roomFilter} ${timeFilter}
      `;
      
      const billStatsResult = await client.query(billStatsQuery, params);
      const billStats = billStatsResult.rows[0];
      
      // 获取费用类型分布
      const expenseTypeQuery = `
        SELECT 
          et.name as type_name,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        JOIN expense_types et ON e.type_id = et.id
        WHERE e.payer_id = $1 ${roomFilter} ${timeFilter}
        GROUP BY et.id, et.name
        ORDER BY total_amount DESC
      `;
      
      const expenseTypeResult = await client.query(expenseTypeQuery, params);
      const expenseTypes = expenseTypeResult.rows;
      
      // 获取每日费用趋势
      const dailyTrendQuery = `
        SELECT 
          DATE_TRUNC('day', e.created_at) as date,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COUNT(*) as count
        FROM expenses e
        WHERE e.payer_id = $1 ${roomFilter} ${timeFilter}
        GROUP BY DATE_TRUNC('day', e.created_at)
        ORDER BY date
      `;
      
      const dailyTrendResult = await client.query(dailyTrendQuery, params);
      const dailyTrend = dailyTrendResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          payment_stats: {
            count: parseInt(paymentStats.payment_count),
            total_paid: parseFloat(paymentStats.total_paid),
            avg_payment: parseFloat(paymentStats.avg_payment)
          },
          split_stats: {
            count: parseInt(splitStats.split_count),
            total_owed: parseFloat(splitStats.total_owed),
            total_paid_split: parseFloat(splitStats.total_paid_split),
            total_pending: parseFloat(splitStats.total_pending)
          },
          bill_stats: {
            count: parseInt(billStats.bill_count),
            created_bills: parseInt(billStats.created_bills),
            total_bill_paid: parseFloat(billStats.total_bill_paid),
            total_bill_pending: parseFloat(billStats.total_bill_pending)
          },
          expense_types: expenseTypes.map(type => ({
            type_name: type.type_name,
            count: parseInt(type.count),
            total_amount: parseFloat(type.total_amount)
          })),
          daily_trend: dailyTrend.map(trend => ({
            date: trend.date,
            total_amount: parseFloat(trend.total_amount),
            count: parseInt(trend.count)
          }))
        }
      });
    } catch (error) {
      logger.error('获取用户统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户统计信息失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取寝室统计信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRoomStats(req, res) {
    const client = await this.pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id, period = 'month' } = req.query;
      
      // 验证用户是否为寝室成员
      const memberCheck = await client.query(
        'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
        [room_id, user_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您不是该寝室的成员'
        });
      }
      
      // 根据周期设置时间范围
      let timeFilter = '';
      switch (period) {
        case 'week':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case 'quarter':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case 'year':
          timeFilter = `AND e.created_at >= CURRENT_DATE - INTERVAL '365 days'`;
          break;
      }
      
      // 获取寝室总费用统计
      const totalExpenseQuery = `
        SELECT 
          COUNT(*) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COALESCE(AVG(e.amount), 0) as avg_amount
        FROM expenses e
        WHERE e.room_id = $1 ${timeFilter}
      `;
      
      const totalExpenseResult = await client.query(totalExpenseQuery, [room_id]);
      const totalExpense = totalExpenseResult.rows[0];
      
      // 获取寝室成员费用贡献
      const memberContributionQuery = `
        SELECT 
          u.id,
          u.username,
          COUNT(e.id) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_paid,
          COALESCE(SUM(es.amount), 0) as total_owed,
          COALESCE(SUM(CASE WHEN es.status = 'PAID' THEN es.amount ELSE 0 END), 0) as total_paid_split
        FROM users u
        JOIN room_members rm ON u.id = rm.user_id
        LEFT JOIN expenses e ON u.id = e.payer_id AND e.room_id = $1 ${timeFilter.replace('AND', 'AND')}
        LEFT JOIN expense_splits es ON u.id = es.user_id
        LEFT JOIN expenses e2 ON es.expense_id = e2.id AND e2.room_id = $1 ${timeFilter.replace('AND', 'AND')}
        WHERE rm.room_id = $1
        GROUP BY u.id, u.username
        ORDER BY total_paid DESC
      `;
      
      const memberContributionResult = await client.query(memberContributionQuery, [room_id]);
      const memberContributions = memberContributionResult.rows;
      
      // 获取费用类型分布
      const expenseTypeQuery = `
        SELECT 
          et.name as type_name,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        JOIN expense_types et ON e.type_id = et.id
        WHERE e.room_id = $1 ${timeFilter}
        GROUP BY et.id, et.name
        ORDER BY total_amount DESC
      `;
      
      const expenseTypeResult = await client.query(expenseTypeQuery, [room_id]);
      const expenseTypes = expenseTypeResult.rows;
      
      // 获取每月费用趋势
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', e.created_at) as month,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COUNT(*) as count
        FROM expenses e
        WHERE e.room_id = $1 AND e.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', e.created_at)
        ORDER BY month
      `;
      
      const monthlyTrendResult = await client.query(monthlyTrendQuery, [room_id]);
      const monthlyTrend = monthlyTrendResult.rows;
      
      // 获取账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as bill_count,
          COALESCE(SUM(b.total_amount), 0) as total_bill_amount,
          COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) as completed_bills,
          COUNT(CASE WHEN b.status = 'PENDING' THEN 1 END) as pending_bills,
          COUNT(CASE WHEN b.status = 'APPROVED' THEN 1 END) as approved_bills
        FROM bills b
        WHERE b.room_id = $1 ${timeFilter}
      `;
      
      const billStatsResult = await client.query(billStatsQuery, [room_id]);
      const billStats = billStatsResult.rows[0];
      
      res.status(200).json({
        success: true,
        data: {
          total_expense: {
            count: parseInt(totalExpense.expense_count),
            total_amount: parseFloat(totalExpense.total_amount),
            avg_amount: parseFloat(totalExpense.avg_amount)
          },
          member_contributions: memberContributions.map(member => ({
            id: member.id,
            username: member.username,
            expense_count: parseInt(member.expense_count),
            total_paid: parseFloat(member.total_paid),
            total_owed: parseFloat(member.total_owed),
            total_paid_split: parseFloat(member.total_paid_split),
            balance: parseFloat(member.total_paid) - parseFloat(member.total_paid_split)
          })),
          expense_types: expenseTypes.map(type => ({
            type_name: type.type_name,
            count: parseInt(type.count),
            total_amount: parseFloat(type.total_amount)
          })),
          monthly_trend: monthlyTrend.map(trend => ({
            month: trend.month,
            total_amount: parseFloat(trend.total_amount),
            count: parseInt(trend.count)
          })),
          bill_stats: {
            count: parseInt(billStats.bill_count),
            total_amount: parseFloat(billStats.total_bill_amount),
            completed_bills: parseInt(billStats.completed_bills),
            pending_bills: parseInt(billStats.pending_bills),
            approved_bills: parseInt(billStats.approved_bills)
          }
        }
      });
    } catch (error) {
      logger.error('获取寝室统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取寝室统计信息失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取系统统计信息（管理员）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemStats(req, res) {
    const client = await this.pool.connect();
    try {
      const { period = 'month' } = req.query;
      
      // 根据周期设置时间范围
      let timeFilter = '';
      switch (period) {
        case 'week':
          timeFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          timeFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`;
          break;
        case 'quarter':
          timeFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'`;
          break;
        case 'year':
          timeFilter = `WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'`;
          break;
      }
      
      // 获取用户统计
      const userStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE ${timeFilter.replace('WHERE', 'AND')} THEN 1 END) as new_users
        FROM users
      `;
      
      const userStatsResult = await client.query(userStatsQuery);
      const userStats = userStatsResult.rows[0];
      
      // 获取寝室统计
      const roomStatsQuery = `
        SELECT 
          COUNT(*) as total_rooms,
          COUNT(CASE ${timeFilter.replace('WHERE', 'AND')} THEN 1 END) as new_rooms
        FROM rooms
      `;
      
      const roomStatsResult = await client.query(roomStatsQuery);
      const roomStats = roomStatsResult.rows[0];
      
      // 获取费用统计
      const expenseStatsQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE ${timeFilter.replace('WHERE', 'AND')} THEN 1 END) as new_expenses
        FROM expenses
      `;
      
      const expenseStatsResult = await client.query(expenseStatsQuery);
      const expenseStats = expenseStatsResult.rows[0];
      
      // 获取账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(total_amount), 0) as total_bill_amount,
          COUNT(CASE ${timeFilter.replace('WHERE', 'AND')} THEN 1 END) as new_bills,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_bills,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_bills
        FROM bills
      `;
      
      const billStatsResult = await client.query(billStatsQuery);
      const billStats = billStatsResult.rows[0];
      
      // 获取每月注册用户趋势
      const userTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const userTrendResult = await client.query(userTrendQuery);
      const userTrend = userTrendResult.rows;
      
      // 获取每月费用趋势
      const expenseTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as count
        FROM expenses
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const expenseTrendResult = await client.query(expenseTrendQuery);
      const expenseTrend = expenseTrendResult.rows;
      
      // 获取最活跃的寝室
      const activeRoomsQuery = `
        SELECT 
          r.id,
          r.name,
          COUNT(e.id) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM rooms r
        LEFT JOIN expenses e ON r.id = e.room_id
        GROUP BY r.id, r.name
        ORDER BY expense_count DESC
        LIMIT 10
      `;
      
      const activeRoomsResult = await client.query(activeRoomsQuery);
      const activeRooms = activeRoomsResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          user_stats: {
            total_users: parseInt(userStats.total_users),
            new_users: parseInt(userStats.new_users)
          },
          room_stats: {
            total_rooms: parseInt(roomStats.total_rooms),
            new_rooms: parseInt(roomStats.new_rooms)
          },
          expense_stats: {
            total_expenses: parseInt(expenseStats.total_expenses),
            total_amount: parseFloat(expenseStats.total_amount),
            new_expenses: parseInt(expenseStats.new_expenses)
          },
          bill_stats: {
            total_bills: parseInt(billStats.total_bills),
            total_amount: parseFloat(billStats.total_bill_amount),
            new_bills: parseInt(billStats.new_bills),
            completed_bills: parseInt(billStats.completed_bills),
            pending_bills: parseInt(billStats.pending_bills)
          },
          user_trend: userTrend.map(trend => ({
            month: trend.month,
            count: parseInt(trend.count)
          })),
          expense_trend: expenseTrend.map(trend => ({
            month: trend.month,
            total_amount: parseFloat(trend.total_amount),
            count: parseInt(trend.count)
          })),
          active_rooms: activeRooms.map(room => ({
            id: room.id,
            name: room.name,
            expense_count: parseInt(room.expense_count),
            total_amount: parseFloat(room.total_amount)
          }))
        }
      });
    } catch (error) {
      logger.error('获取系统统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取系统统计信息失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  /**
   * 获取费用预测分析
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getExpenseForecast(req, res) {
    const client = await this.pool.connect();
    try {
      const user_id = req.user.id;
      const { room_id, period = 'month' } = req.query;
      
      // 验证用户是否为寝室成员
      if (room_id) {
        const memberCheck = await client.query(
          'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user_id]
        );
        
        if (memberCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: '您不是该寝室的成员'
          });
        }
      }
      
      // 获取历史费用数据（过去3个月）
      const historicalQuery = `
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      `;
      
      const historicalResult = await client.query(historicalQuery, [room_id]);
      const historicalData = historicalResult.rows;
      
      // 获取历史账单数据（过去3个月）
      const billHistoricalQuery = `
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as bill_count,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total_amount ELSE 0 END), 0) as pending_amount
        FROM bills
        WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
      `;
      
      const billHistoricalResult = await client.query(billHistoricalQuery, [room_id]);
      const billHistoricalData = billHistoricalResult.rows;
      
      // 简单的线性回归预测（基于历史数据）
      let forecast = [];
      if (historicalData.length >= 4) {
        // 计算平均增长率
        let growthRates = [];
        for (let i = 1; i < historicalData.length; i++) {
          const prev = parseFloat(historicalData[i-1].total_amount);
          const curr = parseFloat(historicalData[i].total_amount);
          if (prev > 0) {
            growthRates.push((curr - prev) / prev);
          }
        }
        
        const avgGrowthRate = growthRates.length > 0 
          ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length 
          : 0;
        
        // 生成未来4周的预测
        const lastWeekAmount = parseFloat(historicalData[historicalData.length - 1].total_amount);
        const lastWeekDate = new Date(historicalData[historicalData.length - 1].week);
        
        for (let i = 1; i <= 4; i++) {
          const predictedAmount = lastWeekAmount * (1 + avgGrowthRate) * i;
          const predictedDate = new Date(lastWeekDate);
          predictedDate.setDate(predictedDate.getDate() + (i * 7));
          
          forecast.push({
            week: predictedDate,
            predicted_amount: Math.max(0, predictedAmount)
          });
        }
      }
      
      // 账单预测
      let billForecast = [];
      if (billHistoricalData.length >= 4) {
        // 计算账单平均增长率
        let billGrowthRates = [];
        for (let i = 1; i < billHistoricalData.length; i++) {
          const prev = parseFloat(billHistoricalData[i-1].total_amount);
          const curr = parseFloat(billHistoricalData[i].total_amount);
          if (prev > 0) {
            billGrowthRates.push((curr - prev) / prev);
          }
        }
        
        const avgBillGrowthRate = billGrowthRates.length > 0 
          ? billGrowthRates.reduce((sum, rate) => sum + rate, 0) / billGrowthRates.length 
          : 0;
        
        // 生成未来4周的账单预测
        const lastBillAmount = parseFloat(billHistoricalData[billHistoricalData.length - 1].total_amount);
        const lastBillDate = new Date(billHistoricalData[billHistoricalData.length - 1].week);
        
        for (let i = 1; i <= 4; i++) {
          const predictedAmount = lastBillAmount * (1 + avgBillGrowthRate) * i;
          const predictedDate = new Date(lastBillDate);
          predictedDate.setDate(predictedDate.getDate() + (i * 7));
          
          billForecast.push({
            week: predictedDate,
            predicted_amount: Math.max(0, predictedAmount)
          });
        }
      }
      
      // 获取费用类型分布
      const typeDistributionQuery = `
        SELECT 
          et.name as type_name,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount,
          COALESCE(AVG(e.amount), 0) as avg_amount
        FROM expenses e
        JOIN expense_types et ON e.type_id = et.id
        WHERE e.room_id = $1 AND e.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY et.id, et.name
        ORDER BY total_amount DESC
      `;
      
      const typeDistributionResult = await client.query(typeDistributionQuery, [room_id]);
      const typeDistribution = typeDistributionResult.rows;
      
      // 获取账单状态分布
      const billStatusQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM bills
        WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY status
        ORDER BY total_amount DESC
      `;
      
      const billStatusResult = await client.query(billStatusQuery, [room_id]);
      const billStatusDistribution = billStatusResult.rows;
      
      // 获取即将到期的账单
      const upcomingBillsQuery = `
        SELECT 
          id,
          title,
          total_amount,
          due_date,
          status,
          creator_id
        FROM bills
        WHERE room_id = $1 AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        ORDER BY due_date
      `;
      
      const upcomingBillsResult = await client.query(upcomingBillsQuery, [room_id]);
      const upcomingBills = upcomingBillsResult.rows;
      
      res.status(200).json({
        success: true,
        data: {
          historical_data: historicalData.map(data => ({
            week: data.week,
            total_amount: parseFloat(data.total_amount)
          })),
          bill_historical_data: billHistoricalData.map(data => ({
            week: data.week,
            bill_count: parseInt(data.bill_count),
            total_amount: parseFloat(data.total_amount),
            paid_amount: parseFloat(data.paid_amount),
            pending_amount: parseFloat(data.pending_amount)
          })),
          forecast: forecast,
          bill_forecast: billForecast,
          type_distribution: typeDistribution.map(type => ({
            type_name: type.type_name,
            count: parseInt(type.count),
            total_amount: parseFloat(type.total_amount),
            avg_amount: parseFloat(type.avg_amount)
          })),
          bill_status_distribution: billStatusDistribution.map(status => ({
            status: status.status,
            count: parseInt(status.count),
            total_amount: parseFloat(status.total_amount)
          })),
          upcoming_bills: upcomingBills.map(bill => ({
            id: bill.id,
            title: bill.title,
            total_amount: parseFloat(bill.total_amount),
            due_date: bill.due_date,
            status: bill.status,
            creator_id: bill.creator_id
          }))
        }
      });
    } catch (error) {
      logger.error('获取费用预测分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取费用预测分析失败',
        error: error.message
      });
    } finally {
      client.release();
    }
  }
}

module.exports = new StatsController();