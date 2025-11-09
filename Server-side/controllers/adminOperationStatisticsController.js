/**
 * 管理员操作统计控制器
 * 处理管理员操作统计相关的业务逻辑
 */

const { 
  AdminOperationLog, 
  User, 
  AdminSession,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');
const { parseISO, format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } = require('date-fns');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * 获取管理员操作统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationStatistics = async (req, res) => {
  try {
    console.log('获取管理员操作统计数据，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate, 
      adminId, 
      operationType,
      page = 1,
      limit = 20
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 构建查询条件
    const whereConditions = {
      createdAt: dateFilter
    };
    
    if (adminId) {
      whereConditions.adminId = adminId;
    }
    
    if (operationType) {
      whereConditions.operationType = operationType;
    }
    
    // 计算分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询操作统计数据
    const { count, rows: operationLogs } = await AdminOperationLog.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // 计算统计数据
    const statistics = {
      totalOperations: count,
      totalAdmins: await User.count({ where: { role: 'admin' } }),
      activeAdmins: await AdminOperationLog.count({
        distinct: true,
        col: 'adminId',
        where: {
          createdAt: dateFilter
        }
      }),
      averageOperationsPerAdmin: 0,
      operationTypes: {},
      dailyOperations: {}
    };
    
    // 计算平均操作次数
    if (statistics.activeAdmins > 0) {
      statistics.averageOperationsPerAdmin = Math.round(statistics.totalOperations / statistics.activeAdmins * 100) / 100;
    }
    
    // 统计操作类型分布
    const operationTypes = await AdminOperationLog.findAll({
      attributes: [
        'operationType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['operationType'],
      raw: true
    });
    
    operationTypes.forEach(type => {
      statistics.operationTypes[type.operationType] = parseInt(type.count);
    });
    
    // 统计每日操作数量
    const dailyOperations = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    dailyOperations.forEach(day => {
      statistics.dailyOperations[day.date] = parseInt(day.count);
    });
    
    // 构建分页信息
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };
    
    res.json({
      success: true,
      data: {
        statistics,
        operationLogs,
        pagination
      }
    });
  } catch (error) {
    console.error('获取管理员操作统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作统计数据失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作统计图表数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationChartStatistics = async (req, res) => {
  try {
    console.log('获取管理员操作统计图表数据，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate, 
      chartType = 'daily'
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    let chartData = {};
    
    switch (chartType) {
      case 'daily':
        // 每日操作统计
        const dailyStats = await AdminOperationLog.findAll({
          attributes: [
            [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: { createdAt: dateFilter },
          group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
          order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
          raw: true
        });
        
        chartData = {
          labels: dailyStats.map(stat => stat.date),
          datasets: [{
            label: '每日操作次数',
            data: dailyStats.map(stat => parseInt(stat.count)),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
        break;
        
      case 'weekly':
        // 每周操作统计
        const weeklyStats = await AdminOperationLog.findAll({
          attributes: [
            [sequelize.fn('WEEK', sequelize.col('createdAt')), 'week'],
            [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: { createdAt: dateFilter },
          group: [sequelize.fn('WEEK', sequelize.col('createdAt')), sequelize.fn('YEAR', sequelize.col('createdAt'))],
          order: [[sequelize.fn('YEAR', sequelize.col('createdAt')), 'ASC'], [sequelize.fn('WEEK', sequelize.col('createdAt')), 'ASC']],
          raw: true
        });
        
        chartData = {
          labels: weeklyStats.map(stat => `${stat.year}年第${stat.week}周`),
          datasets: [{
            label: '每周操作次数',
            data: weeklyStats.map(stat => parseInt(stat.count)),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
        break;
        
      case 'monthly':
        // 每月操作统计
        const monthlyStats = await AdminOperationLog.findAll({
          attributes: [
            [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
            [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: { createdAt: dateFilter },
          group: [sequelize.fn('MONTH', sequelize.col('createdAt')), sequelize.fn('YEAR', sequelize.col('createdAt'))],
          order: [[sequelize.fn('YEAR', sequelize.col('createdAt')), 'ASC'], [sequelize.fn('MONTH', sequelize.col('createdAt')), 'ASC']],
          raw: true
        });
        
        chartData = {
          labels: monthlyStats.map(stat => `${stat.year}年${stat.month}月`),
          datasets: [{
            label: '每月操作次数',
            data: monthlyStats.map(stat => parseInt(stat.count)),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
        break;
        
      case 'operation-type':
        // 操作类型分布
        const typeStats = await AdminOperationLog.findAll({
          attributes: [
            'operationType',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: { createdAt: dateFilter },
          group: ['operationType'],
          raw: true
        });
        
        chartData = {
          labels: typeStats.map(stat => stat.operationType),
          datasets: [{
            label: '操作类型分布',
            data: typeStats.map(stat => parseInt(stat.count)),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        };
        break;
        
      case 'admin':
        // 管理员操作统计
        const adminStats = await AdminOperationLog.findAll({
          attributes: [
            'adminId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          include: [
            {
              model: User,
              as: 'admin',
              attributes: ['username']
            }
          ],
          where: { createdAt: dateFilter },
          group: ['adminId', 'admin.id'],
          order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
          limit: 10,
          raw: true
        });
        
        chartData = {
          labels: adminStats.map(stat => stat['admin.username']),
          datasets: [{
            label: '管理员操作次数',
            data: adminStats.map(stat => parseInt(stat.count)),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的图表类型'
        });
    }
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('获取管理员操作统计图表数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作统计图表数据失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作类型分布统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationTypeDistribution = async (req, res) => {
  try {
    console.log('获取管理员操作类型分布统计，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 统计操作类型分布
    const operationTypes = await AdminOperationLog.findAll({
      attributes: [
        'operationType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: ['operationType'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    // 计算总操作次数
    const totalOperations = operationTypes.reduce((sum, type) => sum + parseInt(type.count), 0);
    
    // 构建分布数据
    const distribution = operationTypes.map(type => ({
      operationType: type.operationType,
      count: parseInt(type.count),
      percentage: Math.round((parseInt(type.count) / totalOperations) * 100 * 100) / 100
    }));
    
    res.json({
      success: true,
      data: {
        distribution,
        totalOperations
      }
    });
  } catch (error) {
    console.error('获取管理员操作类型分布统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作类型分布统计失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员活跃度统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getAdminActivityStatistics = async (req, res) => {
  try {
    console.log('获取管理员活跃度统计，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 统计管理员活跃度
    const adminActivity = await AdminOperationLog.findAll({
      attributes: [
        'adminId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount'],
        [sequelize.fn('MIN', sequelize.col('createdAt')), 'firstOperation'],
        [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastOperation']
      ],
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'fullName']
        }
      ],
      where: { createdAt: dateFilter },
      group: ['adminId', 'admin.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    // 获取所有管理员信息
    const allAdmins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'username', 'email', 'fullName'],
      raw: true
    });
    
    // 构建完整的管理员活跃度数据
    const activityData = allAdmins.map(admin => {
      const activity = adminActivity.find(a => a.adminId === admin.id);
      
      return {
        adminId: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        operationCount: activity ? parseInt(activity.operationCount) : 0,
        firstOperation: activity ? activity.firstOperation : null,
        lastOperation: activity ? activity.lastOperation : null,
        isActive: activity ? true : false
      };
    });
    
    // 计算活跃管理员数量
    const activeAdmins = activityData.filter(admin => admin.isActive).length;
    const totalAdmins = activityData.length;
    
    // 计算平均操作次数
    const totalOperations = activityData.reduce((sum, admin) => sum + admin.operationCount, 0);
    const averageOperations = activeAdmins > 0 ? Math.round(totalOperations / activeAdmins * 100) / 100 : 0;
    
    res.json({
      success: true,
      data: {
        activityData,
        summary: {
          totalAdmins,
          activeAdmins,
          inactiveAdmins: totalAdmins - activeAdmins,
          totalOperations,
          averageOperations,
          activityRate: Math.round((activeAdmins / totalAdmins) * 100 * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('获取管理员活跃度统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员活跃度统计失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作高峰时段统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationPeakHours = async (req, res) => {
  try {
    console.log('获取管理员操作高峰时段统计，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 统计每小时操作次数
    const hourlyStats = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('createdAt')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: [sequelize.fn('HOUR', sequelize.col('createdAt'))],
      order: [[sequelize.fn('HOUR', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    // 构建24小时的完整数据
    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
      const hourData = hourlyStats.find(stat => parseInt(stat.hour) === i);
      hourlyData.push({
        hour: i,
        hourLabel: `${i.toString().padStart(2, '0')}:00`,
        count: hourData ? parseInt(hourData.count) : 0
      });
    }
    
    // 找出高峰时段
    const maxCount = Math.max(...hourlyData.map(h => h.count));
    const peakHours = hourlyData.filter(h => h.count === maxCount);
    
    // 统计工作时间和非工作时间操作
    const workHours = hourlyData.filter(h => h.hour >= 9 && h.hour <= 17);
    const nonWorkHours = hourlyData.filter(h => h.hour < 9 || h.hour > 17);
    
    const workHoursCount = workHours.reduce((sum, h) => sum + h.count, 0);
    const nonWorkHoursCount = nonWorkHours.reduce((sum, h) => sum + h.count, 0);
    
    res.json({
      success: true,
      data: {
        hourlyData,
        peakHours: {
          hours: peakHours.map(h => h.hourLabel),
          count: maxCount
        },
        summary: {
          workHoursCount,
          nonWorkHoursCount,
          workHoursPercentage: Math.round((workHoursCount / (workHoursCount + nonWorkHoursCount)) * 100 * 100) / 100,
          nonWorkHoursPercentage: Math.round((nonWorkHoursCount / (workHoursCount + nonWorkHoursCount)) * 100 * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('获取管理员操作高峰时段统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作高峰时段统计失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作统计概览
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationOverview = async (req, res) => {
  try {
    console.log('获取管理员操作统计概览，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 计算当前周期的统计数据
    const currentStats = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOperations'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('adminId'))), 'activeAdmins']
      ],
      where: { createdAt: dateFilter },
      raw: true
    });
    
    // 计算上一个周期的统计数据
    let previousDateFilter = {};
    let periodLabel = '';
    
    if (startDate && endDate) {
      // 自定义日期范围
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      previousDateFilter = {
        [Op.between]: [
          startOfDay(subDays(start, daysDiff)),
          endOfDay(subDays(end, daysDiff))
        ]
      };
      periodLabel = `${daysDiff}天`;
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          previousDateFilter = {
            [Op.between]: [startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))]
          };
          periodLabel = '天';
          break;
        case 'week':
          previousDateFilter = {
            [Op.between]: [startOfWeek(subWeeks(now, 1)), endOfWeek(subWeeks(now, 1))]
          };
          periodLabel = '周';
          break;
        case 'month':
          previousDateFilter = {
            [Op.between]: [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))]
          };
          periodLabel = '月';
          break;
        case 'year':
          previousDateFilter = {
            [Op.between]: [startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))]
          };
          periodLabel = '年';
          break;
        default:
          previousDateFilter = {
            [Op.between]: [startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))]
          };
          periodLabel = '月';
      }
    }
    
    const previousStats = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOperations'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('adminId'))), 'activeAdmins']
      ],
      where: { createdAt: previousDateFilter },
      raw: true
    });
    
    // 计算变化率
    const currentTotalOps = parseInt(currentStats[0].totalOperations);
    const previousTotalOps = parseInt(previousStats[0].totalOperations);
    const currentActiveAdmins = parseInt(currentStats[0].activeAdmins);
    const previousActiveAdmins = parseInt(previousStats[0].activeAdmins);
    
    const operationsChange = previousTotalOps > 0 
      ? Math.round(((currentTotalOps - previousTotalOps) / previousTotalOps) * 100 * 100) / 100
      : 0;
      
    const activeAdminsChange = previousActiveAdmins > 0 
      ? Math.round(((currentActiveAdmins - previousActiveAdmins) / previousActiveAdmins) * 100 * 100) / 100
      : 0;
    
    // 获取最活跃的管理员
    const topAdmins = await AdminOperationLog.findAll({
      attributes: [
        'adminId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount']
      ],
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['username', 'fullName']
        }
      ],
      where: { createdAt: dateFilter },
      group: ['adminId', 'admin.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // 获取最常用的操作类型
    const topOperationTypes = await AdminOperationLog.findAll({
      attributes: [
        'operationType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: ['operationType'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 5,
      raw: true
    });
    
    res.json({
      success: true,
      data: {
        period: timeRange,
        periodLabel,
        currentPeriod: {
          totalOperations: currentTotalOps,
          activeAdmins: currentActiveAdmins,
          averageOperationsPerAdmin: currentActiveAdmins > 0 
            ? Math.round(currentTotalOps / currentActiveAdmins * 100) / 100
            : 0
        },
        previousPeriod: {
          totalOperations: previousTotalOps,
          activeAdmins: previousActiveAdmins,
          averageOperationsPerAdmin: previousActiveAdmins > 0 
            ? Math.round(previousTotalOps / previousActiveAdmins * 100) / 100
            : 0
        },
        changes: {
          operationsChange,
          activeAdminsChange
        },
        topAdmins: topAdmins.map(admin => ({
          adminId: admin.adminId,
          username: admin['admin.username'],
          fullName: admin['admin.fullName'],
          operationCount: parseInt(admin.operationCount)
        })),
        topOperationTypes: topOperationTypes.map(type => ({
          operationType: type.operationType,
          count: parseInt(type.count)
        }))
      }
    });
  } catch (error) {
    console.error('获取管理员操作统计概览错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作统计概览失败',
      error: error.message
    });
  }
};

/**
 * 导出管理员操作统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const exportOperationStatistics = async (req, res) => {
  try {
    console.log('导出管理员操作统计数据，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate, 
      format = 'excel',
      adminId,
      operationType
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 构建查询条件
    const whereConditions = {
      createdAt: dateFilter
    };
    
    if (adminId) {
      whereConditions.adminId = adminId;
    }
    
    if (operationType) {
      whereConditions.operationType = operationType;
    }
    
    // 查询操作日志数据
    const operationLogs = await AdminOperationLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['username', 'email', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // 根据格式导出数据
    let filePath;
    let fileName;
    let contentType;
    
    switch (format) {
      case 'excel':
        filePath = await exportToExcel(operationLogs, timeRange, startDate, endDate);
        fileName = `operation-statistics-${format(now, 'yyyy-MM-dd')}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
        
      case 'csv':
        filePath = await exportToCSV(operationLogs, timeRange, startDate, endDate);
        fileName = `operation-statistics-${format(now, 'yyyy-MM-dd')}.csv`;
        contentType = 'text/csv';
        break;
        
      case 'pdf':
        filePath = await exportToPDF(operationLogs, timeRange, startDate, endDate);
        fileName = `operation-statistics-${format(now, 'yyyy-MM-dd')}.pdf`;
        contentType = 'application/pdf';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        });
    }
    
    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);
    
    // 发送文件
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('发送文件错误:', err);
        res.status(500).json({
          success: false,
          message: '导出文件发送失败'
        });
      }
      
      // 删除临时文件
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('删除临时文件错误:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('导出管理员操作统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '导出管理员操作统计数据失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作详细日志
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationLogs = async (req, res) => {
  try {
    console.log('获取管理员操作详细日志，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate, 
      adminId, 
      operationType,
      page = 1,
      limit = 20
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 构建查询条件
    const whereConditions = {
      createdAt: dateFilter
    };
    
    if (adminId) {
      whereConditions.adminId = adminId;
    }
    
    if (operationType) {
      whereConditions.operationType = operationType;
    }
    
    // 计算分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询操作日志
    const { count, rows: operationLogs } = await AdminOperationLog.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'fullName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // 构建分页信息
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      totalItems: count,
      itemsPerPage: parseInt(limit)
    };
    
    res.json({
      success: true,
      data: {
        operationLogs,
        pagination
      }
    });
  } catch (error) {
    console.error('获取管理员操作详细日志错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作详细日志失败',
      error: error.message
    });
  }
};

/**
 * 获取管理员操作统计报告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getOperationReport = async (req, res) => {
  try {
    console.log('获取管理员操作统计报告，参数:', req.query);
    
    const { 
      timeRange = 'month', 
      startDate, 
      endDate,
      reportType = 'monthly'
    } = req.query;
    
    // 构建日期范围
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      // 自定义日期范围
      dateFilter = {
        [Op.between]: [
          startOfDay(parseISO(startDate)),
          endOfDay(parseISO(endDate))
        ]
      };
    } else {
      // 预设时间范围
      switch (timeRange) {
        case 'today':
          dateFilter = {
            [Op.between]: [startOfDay(now), endOfDay(now)]
          };
          break;
        case 'week':
          dateFilter = {
            [Op.between]: [startOfWeek(now), endOfWeek(now)]
          };
          break;
        case 'month':
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
          break;
        case 'year':
          dateFilter = {
            [Op.between]: [startOfYear(now), endOfYear(now)]
          };
          break;
        default:
          dateFilter = {
            [Op.between]: [startOfMonth(now), endOfMonth(now)]
          };
      }
    }
    
    // 获取基础统计数据
    const basicStats = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOperations'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('adminId'))), 'activeAdmins']
      ],
      where: { createdAt: dateFilter },
      raw: true
    });
    
    // 获取操作类型分布
    const operationTypes = await AdminOperationLog.findAll({
      attributes: [
        'operationType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: ['operationType'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    // 获取管理员活跃度
    const adminActivity = await AdminOperationLog.findAll({
      attributes: [
        'adminId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount']
      ],
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['username', 'fullName']
        }
      ],
      where: { createdAt: dateFilter },
      group: ['adminId', 'admin.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    // 获取每日操作趋势
    const dailyTrend = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    // 获取每小时操作分布
    const hourlyDistribution = await AdminOperationLog.findAll({
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('createdAt')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { createdAt: dateFilter },
      group: [sequelize.fn('HOUR', sequelize.col('createdAt'))],
      order: [[sequelize.fn('HOUR', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });
    
    // 构建报告数据
    const reportData = {
      reportType,
      period: timeRange,
      generatedAt: now.toISOString(),
      summary: {
        totalOperations: parseInt(basicStats[0].totalOperations),
        activeAdmins: parseInt(basicStats[0].activeAdmins),
        averageOperationsPerAdmin: parseInt(basicStats[0].activeAdmins) > 0 
          ? Math.round(parseInt(basicStats[0].totalOperations) / parseInt(basicStats[0].activeAdmins) * 100) / 100
          : 0
      },
      operationTypes: operationTypes.map(type => ({
        operationType: type.operationType,
        count: parseInt(type.count)
      })),
      adminActivity: adminActivity.map(admin => ({
        adminId: admin.adminId,
        username: admin['admin.username'],
        fullName: admin['admin.fullName'],
        operationCount: parseInt(admin.operationCount)
      })),
      dailyTrend: dailyTrend.map(day => ({
        date: day.date,
        count: parseInt(day.count)
      })),
      hourlyDistribution: hourlyDistribution.map(hour => ({
        hour: parseInt(hour.hour),
        count: parseInt(hour.count)
      }))
    };
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('获取管理员操作统计报告错误:', error);
    res.status(500).json({
      success: false,
      message: '获取管理员操作统计报告失败',
      error: error.message
    });
  }
};

/**
 * 导出数据到Excel
 * @param {Array} data - 操作日志数据
 * @param {string} timeRange - 时间范围
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<string>} 文件路径
 */
const exportToExcel = async (data, timeRange, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('操作统计数据');
  
  // 设置表头
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: '管理员', key: 'adminName', width: 20 },
    { header: '操作类型', key: 'operationType', width: 20 },
    { header: '操作描述', key: 'description', width: 30 },
    { header: 'IP地址', key: 'ipAddress', width: 15 },
    { header: '用户代理', key: 'userAgent', width: 40 },
    { header: '操作时间', key: 'createdAt', width: 20 }
  ];
  
  // 添加数据行
  data.forEach(log => {
    worksheet.addRow({
      id: log.id,
      adminName: log.admin ? log.admin.fullName || log.admin.username : '未知',
      operationType: log.operationType,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt
    });
  });
  
  // 设置标题行样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };
  
  // 生成文件名和路径
  const fileName = `operation-statistics-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
  const filePath = path.join(__dirname, '../temp', fileName);
  
  // 确保目录存在
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 保存文件
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

/**
 * 导出数据到CSV
 * @param {Array} data - 操作日志数据
 * @param {string} timeRange - 时间范围
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<string>} 文件路径
 */
const exportToCSV = async (data, timeRange, startDate, endDate) => {
  // 生成文件名和路径
  const fileName = `operation-statistics-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  const filePath = path.join(__dirname, '../temp', fileName);
  
  // 确保目录存在
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 创建CSV内容
  let csvContent = 'ID,管理员,操作类型,操作描述,IP地址,用户代理,操作时间\n';
  
  data.forEach(log => {
    const adminName = log.admin ? log.admin.fullName || log.admin.username : '未知';
    const row = [
      log.id,
      `"${adminName}"`,
      `"${log.operationType}"`,
      `"${log.description}"`,
      log.ipAddress,
      `"${log.userAgent}"`,
      log.createdAt
    ].join(',');
    
    csvContent += row + '\n';
  });
  
  // 写入文件
  fs.writeFileSync(filePath, csvContent, 'utf8');
  
  return filePath;
};

/**
 * 导出数据到PDF
 * @param {Array} data - 操作日志数据
 * @param {string} timeRange - 时间范围
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<string>} 文件路径
 */
const exportToPDF = async (data, timeRange, startDate, endDate) => {
  // 生成文件名和路径
  const fileName = `operation-statistics-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
  const filePath = path.join(__dirname, '../temp', fileName);
  
  // 确保目录存在
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 创建PDF文档
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // 添加标题
  doc.fontSize(20).text('管理员操作统计报告', { align: 'center' });
  doc.moveDown();
  
  // 添加时间范围
  let periodText = '';
  if (startDate && endDate) {
    periodText = `时间范围: ${startDate} 至 ${endDate}`;
  } else {
    const periodLabels = {
      'today': '今天',
      'week': '本周',
      'month': '本月',
      'year': '本年'
    };
    periodText = `时间范围: ${periodLabels[timeRange] || '本月'}`;
  }
  
  doc.fontSize(14).text(periodText);
  doc.fontSize(12).text(`生成时间: ${new Date().toLocaleString()}`);
  doc.moveDown();
  
  // 添加表格标题
  doc.fontSize(14).text('操作日志列表');
  doc.moveDown();
  
  // 添加表格
  const tableTop = doc.y;
  const itemHeight = 30;
  const headers = ['ID', '管理员', '操作类型', '操作时间'];
  const columnWidths = [50, 100, 100, 100];
  
  // 绘制表头
  let currentY = tableTop;
  headers.forEach((header, i) => {
    const x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.fontSize(10).text(header, x, currentY, { width: columnWidths[i] });
  });
  
  currentY += itemHeight;
  
  // 绘制数据行
  data.slice(0, 20).forEach(log => {
    const adminName = log.admin ? log.admin.fullName || log.admin.username : '未知';
    const rowData = [
      log.id.toString(),
      adminName,
      log.operationType,
      new Date(log.createdAt).toLocaleString()
    ];
    
    rowData.forEach((cell, i) => {
      const x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.fontSize(10).text(cell, x, currentY, { width: columnWidths[i] });
    });
    
    currentY += itemHeight;
    
    // 如果超过页面高度，添加新页面
    if (currentY > doc.page.height - 50) {
      doc.addPage();
      currentY = 50;
    }
  });
  
  // 完成PDF
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

module.exports = {
  getOperationStatistics,
  getOperationChartStatistics,
  getOperationTypeDistribution,
  getAdminActivityStatistics,
  getOperationPeakHours,
  getOperationOverview,
  exportOperationStatistics,
  getOperationLogs,
  getOperationReport
};