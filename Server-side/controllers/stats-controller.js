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
    // 使用共享连接池，避免重复创建
    this.pool = pool;
  }

  /**
   * 获取用户统计信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserStats(req, res) {
    const client = await pool.connect();
    try {
      const user_id = req.user.sub;
      const { room_id } = req.query;
      
      // 验证用户是否为寝室成员
      if (room_id) {
        const memberCheck = await client.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user_id]
        );
        
        if (memberCheck.rows.length === 0) {
          return res.error(403, '您不是该寝室的成员');
        }
      }
      
      // 获取支付统计
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments
        FROM payments 
        WHERE ${room_id ? 'room_id = $1 AND' : ''} user_id = $${room_id ? '2' : '1'}
      `;
      
      const paymentStatsResult = await client.query(
        paymentStatsQuery, 
        room_id ? [room_id, user_id] : [user_id]
      );
      const paymentStats = paymentStatsResult.rows[0];
      
      // 获取分摊统计
      const splitStatsQuery = `
        SELECT 
          COUNT(*) as total_splits,
          COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_splits,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_splits,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
        FROM splits 
        WHERE ${room_id ? 'room_id = $1 AND' : ''} user_id = $${room_id ? '2' : '1'}
      `;
      
      const splitStatsResult = await client.query(
        splitStatsQuery, 
        room_id ? [room_id, user_id] : [user_id]
      );
      const splitStats = splitStatsResult.rows[0];
      
      // 获取账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_bills,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_bills,
          COALESCE(SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END), 0) as open_amount
        FROM bills 
        WHERE ${room_id ? 'room_id = $1 AND' : ''} created_by = $${room_id ? '2' : '1'}
      `;
      
      const billStatsResult = await client.query(
        billStatsQuery, 
        room_id ? [room_id, user_id] : [user_id]
      );
      const billStats = billStatsResult.rows[0];
      
      // 获取费用类型统计
      const expenseTypesQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses 
        WHERE ${room_id ? 'room_id = $1 AND' : ''} user_id = $${room_id ? '2' : '1'}
        GROUP BY category
        ORDER BY total_amount DESC
      `;
      
      const expenseTypesResult = await client.query(
        expenseTypesQuery, 
        room_id ? [room_id, user_id] : [user_id]
      );
      const expenseTypes = expenseTypesResult.rows;
      
      // 获取最近30天的每日费用趋势
      const dailyTrendQuery = `
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses 
        WHERE ${room_id ? 'room_id = $1 AND' : ''} user_id = $${room_id ? '2' : '1'}
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const dailyTrendResult = await client.query(
        dailyTrendQuery, 
        room_id ? [room_id, user_id] : [user_id]
      );
      const dailyTrend = dailyTrendResult.rows;
      
      // 使用PrecisionCalculator进行高精度计算
      const totalPaymentAmount = PrecisionCalculator.round(parseFloat(paymentStats.total_amount), 2);
      const pendingSplitAmount = PrecisionCalculator.round(parseFloat(splitStats.pending_amount), 2);
      const openBillAmount = PrecisionCalculator.round(parseFloat(billStats.open_amount), 2);
      
      res.success(200, '获取用户统计信息成功', {
        payment_stats: {
          total_payments: parseInt(paymentStats.total_payments),
          total_amount: totalPaymentAmount,
          confirmed_payments: parseInt(paymentStats.confirmed_payments),
          pending_payments: parseInt(paymentStats.pending_payments)
        },
        split_stats: {
          total_splits: parseInt(splitStats.total_splits),
          settled_splits: parseInt(splitStats.settled_splits),
          pending_splits: parseInt(splitStats.pending_splits),
          pending_amount: pendingSplitAmount
        },
        bill_stats: {
          total_bills: parseInt(billStats.total_bills),
          settled_bills: parseInt(billStats.settled_bills),
          open_bills: parseInt(billStats.open_bills),
          open_amount: openBillAmount
        },
        expense_types: expenseTypes.map(type => ({
          category: type.category,
          count: parseInt(type.count),
          total_amount: PrecisionCalculator.round(parseFloat(type.total_amount), 2)
        })),
        daily_trend: dailyTrend.map(trend => ({
          date: trend.date,
          total_amount: PrecisionCalculator.round(parseFloat(trend.total_amount), 2)
        }))
      });
    } catch (error) {
      logger.error('获取用户统计信息失败:', error);
      res.error(500, '获取用户统计信息失败', error.message);
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
    const client = await pool.connect();
    try {
      const user_id = req.user.sub;
      const { room_id } = req.query;
      
      // 验证用户是否为寝室成员
      const memberCheck = await client.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
        [room_id, user_id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.error(403, '您不是该寝室的成员');
      }
      
      // 获取寝室基本信息
      const roomInfoQuery = `
        SELECT 
          r.name,
          r.description,
          COUNT(rm.user_id) as member_count
        FROM rooms r
        JOIN room_members rm ON r.id = rm.room_id
        WHERE r.id = $1
        GROUP BY r.id, r.name, r.description
      `;
      
      const roomInfoResult = await client.query(roomInfoQuery, [room_id]);
      if (roomInfoResult.rows.length === 0) {
        return res.error(404, '寝室不存在');
      }
      const roomInfo = roomInfoResult.rows[0];
      
      // 获取寝室支付统计
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments
        FROM payments 
        WHERE room_id = $1
      `;
      
      const paymentStatsResult = await client.query(paymentStatsQuery, [room_id]);
      const paymentStats = paymentStatsResult.rows[0];
      
      // 获取寝室分摊统计
      const splitStatsQuery = `
        SELECT 
          COUNT(*) as total_splits,
          COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_splits,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_splits,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
        FROM splits 
        WHERE room_id = $1
      `;
      
      const splitStatsResult = await client.query(splitStatsQuery, [room_id]);
      const splitStats = splitStatsResult.rows[0];
      
      // 获取寝室账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COUNT(CASE WHEN status = 'settled' THEN 1 END) as settled_bills,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_bills,
          COALESCE(SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END), 0) as open_amount
        FROM bills 
        WHERE room_id = $1
      `;
      
      const billStatsResult = await client.query(billStatsQuery, [room_id]);
      const billStats = billStatsResult.rows[0];
      
      // 获取寝室费用类型统计
      const expenseTypesQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses 
        WHERE room_id = $1
        GROUP BY category
        ORDER BY total_amount DESC
      `;
      
      const expenseTypesResult = await client.query(expenseTypesQuery, [room_id]);
      const expenseTypes = expenseTypesResult.rows;
      
      // 获取寝室成员费用统计
      const memberStatsQuery = `
        SELECT 
          u.id,
          u.username,
          u.nickname,
          COUNT(e.id) as expense_count,
          COALESCE(SUM(e.amount), 0) as total_expense_amount,
          COUNT(p.id) as payment_count,
          COALESCE(SUM(p.amount), 0) as total_payment_amount
        FROM users u
        LEFT JOIN room_members rm ON u.id = rm.user_id
        LEFT JOIN expenses e ON u.id = e.user_id AND e.room_id = $1
        LEFT JOIN payments p ON u.id = p.user_id AND p.room_id = $1
        WHERE rm.room_id = $1
        GROUP BY u.id, u.username, u.nickname
        ORDER BY total_expense_amount DESC
      `;
      
      const memberStatsResult = await client.query(memberStatsQuery, [room_id]);
      const memberStats = memberStatsResult.rows;
      
      // 获取最近30天的每日费用趋势
      const dailyTrendQuery = `
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses 
        WHERE room_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const dailyTrendResult = await client.query(dailyTrendQuery, [room_id]);
      const dailyTrend = dailyTrendResult.rows;
      
      // 使用PrecisionCalculator进行高精度计算
      const totalPaymentAmount = PrecisionCalculator.round(parseFloat(paymentStats.total_amount), 2);
      const pendingSplitAmount = PrecisionCalculator.round(parseFloat(splitStats.pending_amount), 2);
      const openBillAmount = PrecisionCalculator.round(parseFloat(billStats.open_amount), 2);
      
      res.success(200, '获取寝室统计信息成功', {
        room_info: {
          id: room_id,
          name: roomInfo.name,
          description: roomInfo.description,
          member_count: parseInt(roomInfo.member_count)
        },
        payment_stats: {
          total_payments: parseInt(paymentStats.total_payments),
          total_amount: totalPaymentAmount,
          confirmed_payments: parseInt(paymentStats.confirmed_payments),
          pending_payments: parseInt(paymentStats.pending_payments)
        },
        split_stats: {
          total_splits: parseInt(splitStats.total_splits),
          settled_splits: parseInt(splitStats.settled_splits),
          pending_splits: parseInt(splitStats.pending_splits),
          pending_amount: pendingSplitAmount
        },
        bill_stats: {
          total_bills: parseInt(billStats.total_bills),
          settled_bills: parseInt(billStats.settled_bills),
          open_bills: parseInt(billStats.open_bills),
          open_amount: openBillAmount
        },
        expense_types: expenseTypes.map(type => ({
          category: type.category,
          count: parseInt(type.count),
          total_amount: PrecisionCalculator.round(parseFloat(type.total_amount), 2)
        })),
        member_stats: memberStats.map(member => ({
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          expense_count: parseInt(member.expense_count),
          total_expense_amount: PrecisionCalculator.round(parseFloat(member.total_expense_amount), 2),
          payment_count: parseInt(member.payment_count),
          total_payment_amount: PrecisionCalculator.round(parseFloat(member.total_payment_amount), 2)
        })),
        daily_trend: dailyTrend.map(trend => ({
          date: trend.date,
          total_amount: PrecisionCalculator.round(parseFloat(trend.total_amount), 2)
        }))
      });
    } catch (error) {
      logger.error('获取寝室统计信息失败:', error);
      res.error(500, '获取寝室统计信息失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 获取系统统计信息（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemStats(req, res) {
    const client = await pool.connect();
    try {
      // 验证用户是否为管理员
      const adminCheck = await client.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问系统统计信息');
      }
      
      // 获取用户统计
      const userStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users
        FROM users
      `;
      
      const userStatsResult = await client.query(userStatsQuery);
      const userStats = userStatsResult.rows[0];
      
      // 获取寝室统计
      const roomStatsQuery = `
        SELECT 
          COUNT(*) as total_rooms,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_rooms
        FROM rooms
      `;
      
      const roomStatsResult = await client.query(roomStatsQuery);
      const roomStats = roomStatsResult.rows[0];
      
      // 获取费用统计
      const expenseStatsQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_expenses
        FROM expenses
      `;
      
      const expenseStatsResult = await client.query(expenseStatsQuery);
      const expenseStats = expenseStatsResult.rows[0];
      
      // 获取账单统计
      const billStatsQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'settled' THEN 1 END) as completed_bills,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as pending_bills
        FROM bills
      `;
      
      const billStatsResult = await client.query(billStatsQuery);
      const billStats = billStatsResult.rows[0];
      
      // 获取用户增长趋势（过去12个月）
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
      
      // 获取费用增长趋势（过去12个月）
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
      
      // 使用PrecisionCalculator进行高精度计算
      const totalExpenseAmount = PrecisionCalculator.round(parseFloat(expenseStats.total_amount), 2);
      const totalBillAmount = PrecisionCalculator.round(parseFloat(billStats.total_amount), 2);
      
      res.success(200, '获取系统统计信息成功', {
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
          total_amount: totalExpenseAmount,
          new_expenses: parseInt(expenseStats.new_expenses)
        },
        bill_stats: {
          total_bills: parseInt(billStats.total_bills),
          total_amount: totalBillAmount,
          completed_bills: parseInt(billStats.completed_bills),
          pending_bills: parseInt(billStats.pending_bills)
        },
        user_trend: userTrend.map(trend => ({
          month: trend.month,
          count: parseInt(trend.count)
        })),
        expense_trend: expenseTrend.map(trend => ({
          month: trend.month,
          total_amount: PrecisionCalculator.round(parseFloat(trend.total_amount), 2),
          count: parseInt(trend.count)
        })),
        active_rooms: activeRooms.map(room => ({
          id: room.id,
          name: room.name,
          expense_count: parseInt(room.expense_count),
          total_amount: PrecisionCalculator.round(parseFloat(room.total_amount), 2)
        }))
      });
    } catch (error) {
      logger.error('获取系统统计信息失败:', error);
      res.error(500, '获取系统统计信息失败', error.message);
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
    const client = await pool.connect();
    try {
      const user_id = req.user.sub;
      const { room_id } = req.query;
      
      // 验证用户是否为寝室成员
      if (room_id) {
        const memberCheck = await client.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user_id]
        );
        
        if (memberCheck.rows.length === 0) {
          return res.error(403, '您不是该寝室的成员');
        }
      } else {
        return res.error(400, '请提供寝室ID');
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
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'settled' THEN amount ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END), 0) as pending_amount
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
            growthRates.push(PrecisionCalculator.divide(PrecisionCalculator.subtract(curr, prev), prev));
          }
        }
        
        const avgGrowthRate = growthRates.length > 0 
          ? PrecisionCalculator.divide(growthRates.reduce((sum, rate) => PrecisionCalculator.add(sum, rate), 0), growthRates.length)
          : 0;
        
        // 生成未来4周的预测
        const lastWeekAmount = parseFloat(historicalData[historicalData.length - 1].total_amount);
        const lastWeekDate = new Date(historicalData[historicalData.length - 1].week);
        
        for (let i = 1; i <= 4; i++) {
          const predictedAmount = PrecisionCalculator.multiply(lastWeekAmount, PrecisionCalculator.multiply(PrecisionCalculator.add(1, avgGrowthRate), i));
          const predictedDate = new Date(lastWeekDate);
          predictedDate.setDate(predictedDate.getDate() + (i * 7));
          
          forecast.push({
            week: predictedDate,
            predicted_amount: Math.max(0, parseFloat(predictedAmount))
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
            billGrowthRates.push(PrecisionCalculator.divide(PrecisionCalculator.subtract(curr, prev), prev));
          }
        }
        
        const avgBillGrowthRate = billGrowthRates.length > 0 
          ? PrecisionCalculator.divide(billGrowthRates.reduce((sum, rate) => PrecisionCalculator.add(sum, rate), 0), billGrowthRates.length)
          : 0;
        
        // 生成未来4周的账单预测
        const lastBillAmount = parseFloat(billHistoricalData[billHistoricalData.length - 1].total_amount);
        const lastBillDate = new Date(billHistoricalData[billHistoricalData.length - 1].week);
        
        for (let i = 1; i <= 4; i++) {
          const predictedAmount = PrecisionCalculator.multiply(lastBillAmount, PrecisionCalculator.multiply(PrecisionCalculator.add(1, avgBillGrowthRate), i));
          const predictedDate = new Date(lastBillDate);
          predictedDate.setDate(predictedDate.getDate() + (i * 7));
          
          billForecast.push({
            week: predictedDate,
            predicted_amount: Math.max(0, parseFloat(predictedAmount))
          });
        }
      }
      
      // 获取费用类型分布
      const typeDistributionQuery = `
        SELECT 
          category as type_name,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as avg_amount
        FROM expenses
        WHERE room_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY category
        ORDER BY total_amount DESC
      `;
      
      const typeDistributionResult = await client.query(typeDistributionQuery, [room_id]);
      const typeDistribution = typeDistributionResult.rows;
      
      // 获取账单状态分布
      const billStatusQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
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
          amount,
          due_date,
          status,
          created_by
        FROM bills
        WHERE room_id = $1 AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
        ORDER BY due_date
      `;
      
      const upcomingBillsResult = await client.query(upcomingBillsQuery, [room_id]);
      const upcomingBills = upcomingBillsResult.rows;
      
      res.success(200, '获取费用预测分析成功', {
        historical_data: historicalData.map(data => ({
          week: data.week,
          total_amount: PrecisionCalculator.round(parseFloat(data.total_amount), 2)
        })),
        bill_historical_data: billHistoricalData.map(data => ({
          week: data.week,
          bill_count: parseInt(data.bill_count),
          total_amount: PrecisionCalculator.round(parseFloat(data.total_amount), 2),
          paid_amount: PrecisionCalculator.round(parseFloat(data.paid_amount), 2),
          pending_amount: PrecisionCalculator.round(parseFloat(data.pending_amount), 2)
        })),
        forecast: forecast,
        bill_forecast: billForecast,
        type_distribution: typeDistribution.map(type => ({
          type_name: type.type_name,
          count: parseInt(type.count),
          total_amount: PrecisionCalculator.round(parseFloat(type.total_amount), 2),
          avg_amount: PrecisionCalculator.round(parseFloat(type.avg_amount), 2)
        })),
        bill_status_distribution: billStatusDistribution.map(status => ({
          status: status.status,
          count: parseInt(status.count),
          total_amount: PrecisionCalculator.round(parseFloat(status.total_amount), 2)
        })),
        upcoming_bills: upcomingBills.map(bill => ({
          id: bill.id,
          title: bill.title,
          amount: PrecisionCalculator.round(parseFloat(bill.amount), 2),
          due_date: bill.due_date,
          status: bill.status,
          created_by: bill.created_by
        }))
      });
    } catch (error) {
      logger.error('获取费用预测分析失败:', error);
      res.error(500, '获取费用预测分析失败', error.message);
    } finally {
      client.release();
    }
  }
}

module.exports = new StatsController();