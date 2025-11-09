/**
 * 数据导出控制器
 * 处理数据导出相关的API请求
 */

const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');

class DataExportController {
  /**
   * 导出账单数据
   */
  async exportBills(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { startDate, endDate, roomId, format = 'json' } = req.query;
      const userId = req.user.id;

      // 构建查询条件
      const whereConditions = {
        '$RoomMembers.userId$': userId
      };

      if (startDate || endDate) {
        whereConditions.createdAt = {};
        if (startDate) {
          whereConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      if (roomId) {
        whereConditions.roomId = roomId;
      }

      // 查询账单数据
      const bills = await db.Bill.findAll({
        where: whereConditions,
        include: [
          {
            model: db.Room,
            attributes: ['name']
          },
          {
            model: db.User,
            as: 'Creator',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 格式化数据
      const formattedData = bills.map(bill => ({
        id: bill.id,
        title: bill.title,
        amount: bill.amount,
        currency: bill.currency,
        roomId: bill.roomId,
        roomName: bill.Room ? bill.Room.name : '',
        creatorId: bill.creatorId,
        creatorName: bill.Creator ? bill.Creator.username : '',
        description: bill.description,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt
      }));

      // 根据格式返回数据
      return await this.sendFormattedData(res, formattedData, format, 'bills');
    } catch (error) {
      logger.error('导出账单数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出费用数据
   */
  async exportExpenses(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { startDate, endDate, roomId, format = 'json' } = req.query;
      const userId = req.user.id;

      // 构建查询条件
      const whereConditions = {
        '$ExpenseSplits.userId$': userId
      };

      if (startDate || endDate) {
        whereConditions.createdAt = {};
        if (startDate) {
          whereConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      if (roomId) {
        whereConditions.roomId = roomId;
      }

      // 查询费用数据
      const expenses = await db.Expense.findAll({
        where: whereConditions,
        include: [
          {
            model: db.Room,
            attributes: ['name']
          },
          {
            model: db.ExpenseType,
            attributes: ['name']
          },
          {
            model: db.ExpenseSplit,
            where: { userId: userId },
            attributes: ['amount', 'sharePercentage']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 格式化数据
      const formattedData = expenses.map(expense => ({
        id: expense.id,
        description: expense.description,
        totalAmount: expense.totalAmount,
        currency: expense.currency,
        roomId: expense.roomId,
        roomName: expense.Room ? expense.Room.name : '',
        expenseTypeId: expense.expenseTypeId,
        expenseTypeName: expense.ExpenseType ? expense.ExpenseType.name : '',
        userAmount: expense.ExpenseSplits.length > 0 ? expense.ExpenseSplits[0].amount : 0,
        sharePercentage: expense.ExpenseSplits.length > 0 ? expense.ExpenseSplits[0].sharePercentage : 0,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }));

      // 根据格式返回数据
      return await this.sendFormattedData(res, formattedData, format, 'expenses');
    } catch (error) {
      logger.error('导出费用数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出支付记录数据
   */
  async exportPayments(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { startDate, endDate, roomId, format = 'json' } = req.query;
      const userId = req.user.id;

      // 构建查询条件
      const whereConditions = {
        [Op.or]: [
          { payerId: userId },
          { payeeId: userId }
        ]
      };

      if (startDate || endDate) {
        whereConditions.createdAt = {};
        if (startDate) {
          whereConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      if (roomId) {
        whereConditions.roomId = roomId;
      }

      // 查询支付记录数据
      const payments = await db.Payment.findAll({
        where: whereConditions,
        include: [
          {
            model: db.Room,
            attributes: ['name']
          },
          {
            model: db.User,
            as: 'Payer',
            attributes: ['username']
          },
          {
            model: db.User,
            as: 'Payee',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 格式化数据
      const formattedData = payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        roomId: payment.roomId,
        roomName: payment.Room ? payment.Room.name : '',
        payerId: payment.payerId,
        payerName: payment.Payer ? payment.Payer.username : '',
        payeeId: payment.payeeId,
        payeeName: payment.Payee ? payment.Payee.username : '',
        description: payment.description,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }));

      // 根据格式返回数据
      return await this.sendFormattedData(res, formattedData, format, 'payments');
    } catch (error) {
      logger.error('导出支付记录数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出活动数据
   */
  async exportActivities(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { startDate, endDate, roomId, format = 'json' } = req.query;
      const userId = req.user.id;

      // 构建查询条件
      const whereConditions = {
        '$ActivityParticipants.userId$': userId
      };

      if (startDate || endDate) {
        whereConditions.createdAt = {};
        if (startDate) {
          whereConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      if (roomId) {
        whereConditions.roomId = roomId;
      }

      // 查询活动数据
      const activities = await db.Activity.findAll({
        where: whereConditions,
        include: [
          {
            model: db.Room,
            attributes: ['name']
          },
          {
            model: db.User,
            as: 'Creator',
            attributes: ['username']
          },
          {
            model: db.ActivityParticipant,
            where: { userId: userId },
            attributes: ['joinedAt', 'leftAt']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 格式化数据
      const formattedData = activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        roomId: activity.roomId,
        roomName: activity.Room ? activity.Room.name : '',
        creatorId: activity.creatorId,
        creatorName: activity.Creator ? activity.Creator.username : '',
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location,
        maxParticipants: activity.maxParticipants,
        joinedAt: activity.ActivityParticipants.length > 0 ? activity.ActivityParticipants[0].joinedAt : null,
        leftAt: activity.ActivityParticipants.length > 0 ? activity.ActivityParticipants[0].leftAt : null,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt
      }));

      // 根据格式返回数据
      return await this.sendFormattedData(res, formattedData, format, 'activities');
    } catch (error) {
      logger.error('导出活动数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出房间汇总数据
   */
  async exportRoomSummary(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { roomId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;
      const userId = req.user.id;

      // 检查用户是否有权限访问该房间
      const roomMember = await db.RoomMember.findOne({
        where: {
          roomId: roomId,
          userId: userId
        }
      });

      if (!roomMember) {
        return res.status(403).json({
          success: false,
          message: '您没有权限访问该房间的数据'
        });
      }

      // 获取房间基本信息
      const room = await db.Room.findByPk(roomId, {
        attributes: ['name', 'description', 'currency']
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: '房间不存在'
        });
      }

      // 构建查询条件
      const dateConditions = {};
      if (startDate || endDate) {
        dateConditions.createdAt = {};
        if (startDate) {
          dateConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          dateConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 获取账单统计
      const billStats = await db.Bill.findAndCountAll({
        where: {
          roomId: roomId,
          ...dateConditions
        }
      });

      // 获取费用统计
      const expenseStats = await db.Expense.findAndCountAll({
        where: {
          roomId: roomId,
          ...dateConditions
        }
      });

      // 获取支付统计
      const paymentStats = await db.Payment.findAndCountAll({
        where: {
          roomId: roomId,
          ...dateConditions
        }
      });

      // 获取活动统计
      const activityStats = await db.Activity.findAndCountAll({
        where: {
          roomId: roomId,
          ...dateConditions
        }
      });

      // 格式化汇总数据
      const summaryData = [{
        roomId: roomId,
        roomName: room.name,
        roomDescription: room.description,
        roomCurrency: room.currency,
        totalBills: billStats.count,
        totalExpenses: expenseStats.count,
        totalPayments: paymentStats.count,
        totalActivities: activityStats.count,
        reportGeneratedAt: new Date()
      }];

      // 根据格式返回数据
      return await this.sendFormattedData(res, summaryData, format, `room-${roomId}-summary`);
    } catch (error) {
      logger.error('导出房间汇总数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 导出用户汇总数据
   */
  async exportUserSummary(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { startDate, endDate, format = 'json' } = req.query;
      const userId = req.user.id;

      // 获取用户基本信息
      const user = await db.User.findByPk(userId, {
        attributes: ['username', 'email', 'createdAt']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 构建查询条件
      const dateConditions = {};
      if (startDate || endDate) {
        dateConditions.createdAt = {};
        if (startDate) {
          dateConditions.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          dateConditions.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 获取用户参与的房间数量
      const roomCount = await db.RoomMember.count({
        where: {
          userId: userId
        }
      });

      // 获取用户创建的账单数量
      const billCount = await db.Bill.count({
        where: {
          creatorId: userId,
          ...dateConditions
        }
      });

      // 获取用户参与的费用数量
      const expenseCount = await db.ExpenseSplit.count({
        where: {
          userId: userId
        },
        include: [{
          model: db.Expense,
          where: dateConditions
        }]
      });

      // 获取用户的支付记录数量
      const paymentCount = await db.Payment.count({
        where: {
          [Op.or]: [
            { payerId: userId },
            { payeeId: userId }
          ],
          ...dateConditions
        }
      });

      // 获取用户参与的活动数量
      const activityCount = await db.ActivityParticipant.count({
        where: {
          userId: userId
        },
        include: [{
          model: db.Activity,
          where: dateConditions
        }]
      });

      // 格式化汇总数据
      const summaryData = [{
        userId: userId,
        username: user.username,
        email: user.email,
        memberSince: user.createdAt,
        totalRooms: roomCount,
        totalBillsCreated: billCount,
        totalExpensesParticipated: expenseCount,
        totalPayments: paymentCount,
        totalActivitiesParticipated: activityCount,
        reportGeneratedAt: new Date()
      }];

      // 根据格式返回数据
      return await this.sendFormattedData(res, summaryData, format, `user-${userId}-summary`);
    } catch (error) {
      logger.error('导出用户汇总数据失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 自定义数据导出
   */
  async customExport(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { query, format = 'json', fileName } = req.body;
      const userId = req.user.id;

      // 这里应该实现自定义查询逻辑
      // 由于这是一个示例，我们创建一些示例数据
      const sampleData = [
        { id: 1, name: '示例数据1', value: 100 },
        { id: 2, name: '示例数据2', value: 200 },
        { id: 3, name: '示例数据3', value: 300 }
      ];

      // 根据格式返回数据
      const exportFileName = fileName || 'custom-export';
      return await this.sendFormattedData(res, sampleData, format, exportFileName);
    } catch (error) {
      logger.error('自定义数据导出失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取导出模板列表
   */
  async getExportTemplates(req, res) {
    try {
      // 这里应该从数据库获取导出模板
      // 由于这是一个示例，我们创建一些示例模板
      const templates = [
        {
          id: 1,
          name: '账单导出模板',
          description: '导出账单数据的标准模板',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: '费用导出模板',
          description: '导出费用数据的标准模板',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('获取导出模板列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建导出模板
   */
  async createExportTemplate(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { name, description, query, columns } = req.body;

      // 这里应该将模板保存到数据库
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('创建导出模板成功', { name });
      
      return res.json({
        success: true,
        message: '导出模板创建成功',
        data: {
          id: Math.floor(Math.random() * 1000) + 1, // 示例ID
          name,
          description,
          query,
          columns,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('创建导出模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新导出模板
   */
  async updateExportTemplate(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { templateId } = req.params;
      const { name, description, query, columns } = req.body;

      // 这里应该更新数据库中的模板
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('更新导出模板成功', { templateId });
      
      return res.json({
        success: true,
        message: '导出模板更新成功',
        data: {
          id: templateId,
          name,
          description,
          query,
          columns,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('更新导出模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除导出模板
   */
  async deleteExportTemplate(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { templateId } = req.params;

      // 这里应该从数据库删除模板
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('删除导出模板成功', { templateId });
      
      return res.json({
        success: true,
        message: '导出模板删除成功'
      });
    } catch (error) {
      logger.error('删除导出模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取导出历史记录
   */
  async getExportHistory(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // 这里应该从数据库获取导出历史记录
      // 由于这是一个示例，我们创建一些示例历史记录
      const historyRecords = [
        {
          id: 1,
          userId: req.user.id,
          fileName: 'bills-export-2023.xlsx',
          fileType: 'xlsx',
          fileSize: 10240,
          recordCount: 50,
          exportType: 'bills',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 昨天
        },
        {
          id: 2,
          userId: req.user.id,
          fileName: 'expenses-export-2023.csv',
          fileType: 'csv',
          fileSize: 5120,
          recordCount: 30,
          exportType: 'expenses',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 前天
        }
      ];

      return res.json({
        success: true,
        data: {
          records: historyRecords,
          pagination: {
            currentPage: parseInt(page),
            pageSize: parseInt(limit),
            totalRecords: historyRecords.length
          }
        }
      });
    } catch (error) {
      logger.error('获取导出历史记录失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取导出历史记录详情
   */
  async getExportHistoryDetail(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { exportId } = req.params;

      // 这里应该从数据库获取导出历史记录详情
      // 由于这是一个示例，我们创建一个示例记录
      const historyRecord = {
        id: exportId,
        userId: req.user.id,
        fileName: `export-${exportId}.xlsx`,
        fileType: 'xlsx',
        fileSize: 10240,
        recordCount: 50,
        exportType: 'custom',
        filters: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        createdAt: new Date(),
        downloadUrl: `/api/data-export/download/${exportId}`
      };

      return res.json({
        success: true,
        data: historyRecord
      });
    } catch (error) {
      logger.error('获取导出历史记录详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 根据格式发送数据
   */
  async sendFormattedData(res, data, format, fileName) {
    try {
      switch (format.toLowerCase()) {
        case 'csv':
          return await this.sendCSVData(res, data, fileName);
        case 'xlsx':
          return await this.sendExcelData(res, data, fileName);
        case 'json':
        default:
          return await this.sendJSONData(res, data, fileName);
      }
    } catch (error) {
      logger.error(`发送${format}格式数据失败:`, error);
      throw error;
    }
  }

  /**
   * 发送JSON格式数据
   */
  async sendJSONData(res, data, fileName) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.json"`);

    return res.json({
      success: true,
      data: data,
      exportInfo: {
        fileName: `${fileName}.json`,
        fileType: 'json',
        recordCount: data.length,
        exportedAt: new Date()
      }
    });
  }

  /**
   * 发送CSV格式数据
   */
  async sendCSVData(res, data, fileName) {
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有数据可供导出'
      });
    }

    // 创建临时文件路径
    const tempDir = path.join(__dirname, '..', 'temp');
    const filePath = path.join(tempDir, `${fileName}.csv`);

    try {
      // 确保临时目录存在
      await fs.mkdir(tempDir, { recursive: true });

      // 创建CSV写入器
      const csvWriterInstance = csvWriter({
        path: filePath,
        header: Object.keys(data[0]).map(key => ({ id: key, title: key }))
      });

      // 写入数据
      await csvWriterInstance.writeRecords(data);

      // 发送文件
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);

      // 发送文件内容
      const fileContent = await fs.readFile(filePath);
      res.send(fileContent);

      // 删除临时文件
      await fs.unlink(filePath);

      return;
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // 忽略删除临时文件的错误
      }

      throw error;
    }
  }

  /**
   * 发送Excel格式数据
   */
  async sendExcelData(res, data, fileName) {
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有数据可供导出'
      });
    }

    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();

      // 将数据转换为工作表
      const worksheet = XLSX.utils.json_to_sheet(data);

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // 创建临时文件路径
      const tempDir = path.join(__dirname, '..', 'temp');
      const filePath = path.join(tempDir, `${fileName}.xlsx`);

      // 确保临时目录存在
      await fs.mkdir(tempDir, { recursive: true });

      // 写入文件
      XLSX.writeFile(workbook, filePath);

      // 发送文件
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

      // 发送文件内容
      const fileContent = await fs.readFile(filePath);
      res.send(fileContent);

      // 删除临时文件
      await fs.unlink(filePath);

      return;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DataExportController();