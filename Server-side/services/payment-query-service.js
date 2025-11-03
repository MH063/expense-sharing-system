/**
 * 支付记录查询服务
 * 提供支付记录的查询、筛选和统计功能
 */

const { Payment, Bill, User, Room, PaymentTransfer } = require('../models');
const { Op } = require('sequelize');
const { formatDateRange } = require('../utils/date-utils');

/**
 * 获取支付记录列表
 * @param {Object} queryParams - 查询参数
 * @param {string} queryParams.userId - 用户ID（可选）
 * @param {string} queryParams.billId - 账单ID（可选）
 * @param {string} queryParams.roomId - 房间ID（可选）
 * @param {string} queryParams.status - 支付状态（可选）
 * @param {string} queryParams.paymentMethod - 支付方式（可选）
 * @param {string} queryParams.startDate - 开始日期（可选）
 * @param {string} queryParams.endDate - 结束日期（可选）
 * @param {number} queryParams.page - 页码（默认为1）
 * @param {number} queryParams.pageSize - 每页数量（默认为10）
 * @param {string} queryParams.sortBy - 排序字段（默认为createdAt）
 * @param {string} queryParams.sortOrder - 排序方向（默认为DESC）
 * @returns {Object} 支付记录列表和分页信息
 */
const getPaymentRecords = async (queryParams = {}) => {
  try {
    console.log('获取支付记录列表，参数:', queryParams);
    
    const {
      userId,
      billId,
      roomId,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = queryParams;
    
    // 构建查询条件
    const whereClause = {};
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (billId) {
      whereClause.billId = billId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }
    
    // 日期范围查询
    if (startDate || endDate) {
      whereClause.paymentTime = {};
      if (startDate) {
        whereClause.paymentTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentTime[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 构建包含条件
    const includeConditions = [
      {
        model: Bill,
        as: 'bill',
        attributes: ['id', 'title', 'amount', 'dueDate', 'status']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'avatar']
      }
    ];
    
    // 如果提供了roomId，通过账单关联查询
    if (roomId) {
      includeConditions[0].where = {
        roomId
      };
      includeConditions[0].include = [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'name']
        }
      ];
    }
    
    // 查询支付记录
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: includeConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取支付记录列表失败:', error);
    throw error;
  }
};

/**
 * 获取支付记录详情
 * @param {string} paymentId - 支付记录ID
 * @returns {Object} 支付记录详情
 */
const getPaymentRecordById = async (paymentId) => {
  try {
    console.log(`获取支付记录详情，ID: ${paymentId}`);
    
    // 查找支付记录
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'dueDate', 'status', 'roomId'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });
    
    if (!payment) {
      return null;
    }
    
    console.log(`成功获取支付记录详情，ID: ${paymentId}`);
    
    return payment;
  } catch (error) {
    console.error('获取支付记录详情失败:', error);
    throw error;
  }
};

/**
 * 获取用户的支付统计信息
 * @param {Object} queryParams - 查询参数
 * @param {string} queryParams.userId - 用户ID
 * @param {string} queryParams.startDate - 开始日期（可选）
 * @param {string} queryParams.endDate - 结束日期（可选）
 * @param {string} queryParams.roomId - 房间ID（可选）
 * @returns {Object} 用户支付统计信息
 */
const getUserPaymentStats = async (queryParams) => {
  try {
    console.log('获取用户支付统计信息，参数:', queryParams);
    
    const {
      userId,
      startDate,
      endDate,
      roomId
    } = queryParams;
    
    // 构建查询条件
    const whereClause = {
      userId
    };
    
    // 日期范围查询
    if (startDate || endDate) {
      whereClause.paymentTime = {};
      if (startDate) {
        whereClause.paymentTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentTime[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }
    
    // 构建包含条件
    const includeConditions = [
      {
        model: Bill,
        as: 'bill',
        attributes: ['id', 'title', 'amount', 'dueDate', 'status', 'roomId']
      }
    ];
    
    // 如果提供了roomId，通过账单关联查询
    if (roomId) {
      includeConditions[0].where = {
        roomId
      };
    }
    
    // 查询支付记录
    const payments = await Payment.findAll({
      where: whereClause,
      include: includeConditions,
      attributes: ['amount', 'status', 'paymentMethod', 'paymentTime']
    });
    
    // 计算统计信息
    const stats = {
      totalPayments: payments.length,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
      failedAmount: 0,
      paymentMethods: {},
      monthlyStats: {}
    };
    
    // 按月分组统计
    const monthlyData = {};
    
    for (const payment of payments) {
      const amount = parseFloat(payment.amount);
      const month = new Date(payment.paymentTime).toISOString().substring(0, 7); // YYYY-MM
      
      // 总计
      stats.totalAmount += amount;
      
      // 按状态统计
      if (payment.status === 'completed') {
        stats.completedPayments++;
        stats.completedAmount += amount;
      } else if (payment.status === 'pending') {
        stats.pendingPayments++;
        stats.pendingAmount += amount;
      } else if (payment.status === 'failed') {
        stats.failedPayments++;
        stats.failedAmount += amount;
      }
      
      // 按支付方式统计
      const method = payment.paymentMethod;
      if (!stats.paymentMethods[method]) {
        stats.paymentMethods[method] = {
          count: 0,
          amount: 0
        };
      }
      stats.paymentMethods[method].count++;
      stats.paymentMethods[method].amount += amount;
      
      // 按月统计
      if (!monthlyData[month]) {
        monthlyData[month] = {
          count: 0,
          amount: 0
        };
      }
      monthlyData[month].count++;
      monthlyData[month].amount += amount;
    }
    
    // 转换月度数据为数组并排序
    stats.monthlyStats = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        count: monthlyData[month].count,
        amount: monthlyData[month].amount
      }));
    
    console.log(`成功获取用户支付统计信息，用户ID: ${userId}`);
    
    return stats;
  } catch (error) {
    console.error('获取用户支付统计信息失败:', error);
    throw error;
  }
};

/**
 * 获取账单的支付记录
 * @param {string} billId - 账单ID
 * @param {Object} options - 查询选项
 * @param {string} options.status - 状态筛选（可选）
 * @param {number} options.page - 页码（默认为1）
 * @param {number} options.pageSize - 每页数量（默认为10）
 * @returns {Object} 账单支付记录列表和分页信息
 */
const getBillPayments = async (billId, options = {}) => {
  try {
    console.log(`获取账单支付记录，账单ID: ${billId}`);
    
    const {
      status,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建查询条件
    const whereClause = {
      billId
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询支付记录
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['paymentTime', 'DESC']],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条账单支付记录`);
    
    return {
      items: payments,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取账单支付记录失败:', error);
    throw error;
  }
};

/**
 * 获取用户的支付转移记录
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.transferType - 转移类型（可选）
 * @param {string} options.status - 状态（可选）
 * @param {string} options.role - 角色（from/to，表示付款人/收款人）
 * @param {number} options.page - 页码（默认为1）
 * @param {number} options.pageSize - 每页数量（默认为10）
 * @returns {Object} 用户支付转移记录列表和分页信息
 */
const getUserPaymentTransfers = async (userId, options = {}) => {
  try {
    console.log(`获取用户支付转移记录，用户ID: ${userId}`);
    
    const {
      transferType,
      status,
      role,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建查询条件
    const whereClause = {};
    
    if (role === 'from') {
      whereClause.fromUserId = userId;
    } else if (role === 'to') {
      whereClause.toUserId = userId;
    } else {
      // 默认查询用户作为付款人或收款人的所有记录
      whereClause[Op.or] = [
        { fromUserId: userId },
        { toUserId: userId }
      ];
    }
    
    if (transferType) {
      whereClause.transferType = transferType;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询支付转移记录
    const { count, rows: transfers } = await PaymentTransfer.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'status']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条用户支付转移记录`);
    
    return {
      items: transfers,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取用户支付转移记录失败:', error);
    throw error;
  }
};

/**
 * 获取房间的支付统计信息
 * @param {Object} queryParams - 查询参数
 * @param {string} queryParams.roomId - 房间ID
 * @param {string} queryParams.startDate - 开始日期（可选）
 * @param {string} queryParams.endDate - 结束日期（可选）
 * @returns {Object} 房间支付统计信息
 */
const getRoomPaymentStats = async (queryParams) => {
  try {
    console.log('获取房间支付统计信息，参数:', queryParams);
    
    const {
      roomId,
      startDate,
      endDate
    } = queryParams;
    
    // 构建查询条件
    const whereClause = {};
    
    // 日期范围查询
    if (startDate || endDate) {
      whereClause.paymentTime = {};
      if (startDate) {
        whereClause.paymentTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentTime[Op.lte] = new Date(endDate + ' 23:59:59');
      }
    }
    
    // 查询支付记录
    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'dueDate', 'status', 'roomId'],
          where: {
            roomId
          }
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      attributes: ['amount', 'status', 'paymentMethod', 'paymentTime']
    });
    
    // 计算统计信息
    const stats = {
      totalPayments: payments.length,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
      failedAmount: 0,
      userStats: {},
      monthlyStats: {}
    };
    
    // 按月分组统计
    const monthlyData = {};
    
    for (const payment of payments) {
      const amount = parseFloat(payment.amount);
      const userId = payment.user.id;
      const month = new Date(payment.paymentTime).toISOString().substring(0, 7); // YYYY-MM
      
      // 总计
      stats.totalAmount += amount;
      
      // 按状态统计
      if (payment.status === 'completed') {
        stats.completedPayments++;
        stats.completedAmount += amount;
      } else if (payment.status === 'pending') {
        stats.pendingPayments++;
        stats.pendingAmount += amount;
      } else if (payment.status === 'failed') {
        stats.failedPayments++;
        stats.failedAmount += amount;
      }
      
      // 按用户统计
      if (!stats.userStats[userId]) {
        stats.userStats[userId] = {
          name: payment.user.name,
          email: payment.user.email,
          count: 0,
          amount: 0
        };
      }
      stats.userStats[userId].count++;
      stats.userStats[userId].amount += amount;
      
      // 按月统计
      if (!monthlyData[month]) {
        monthlyData[month] = {
          count: 0,
          amount: 0
        };
      }
      monthlyData[month].count++;
      monthlyData[month].amount += amount;
    }
    
    // 转换月度数据为数组并排序
    stats.monthlyStats = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        count: monthlyData[month].count,
        amount: monthlyData[month].amount
      }));
    
    // 转换用户数据为数组
    stats.userStats = Object.keys(stats.userStats).map(userId => ({
      userId,
      ...stats.userStats[userId]
    }));
    
    console.log(`成功获取房间支付统计信息，房间ID: ${roomId}`);
    
    return stats;
  } catch (error) {
    console.error('获取房间支付统计信息失败:', error);
    throw error;
  }
};

module.exports = {
  getPaymentRecords,
  getPaymentRecordById,
  getUserPaymentStats,
  getBillPayments,
  getUserPaymentTransfers,
  getRoomPaymentStats
};