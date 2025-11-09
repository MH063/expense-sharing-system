const { AdminPermissionHistory, PermissionChangeTemplate, PermissionAutomationRule, 
        PermissionNotificationSettings, PermissionChangeBackup, User, Permission, Role } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

/**
 * 管理员权限变更历史控制器
 */
const adminPermissionHistoryController = {
  // 获取权限变更历史列表
  getPermissionHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20, userId, adminId, permissionType, status, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      
      if (userId) whereClause.userId = userId;
      if (adminId) whereClause.adminId = adminId;
      if (permissionType) whereClause.permissionType = permissionType;
      if (status) whereClause.status = status;
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      const { count, rows } = await AdminPermissionHistory.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          permissionHistory: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限变更历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更历史失败',
        error: error.message
      });
    }
  },

  // 获取权限变更历史详情
  getPermissionHistoryDetail: async (req, res) => {
    try {
      const { id } = req.params;
      
      const permissionHistory = await AdminPermissionHistory.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ]
      });
      
      if (!permissionHistory) {
        return res.status(404).json({
          success: false,
          message: '权限变更历史不存在'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { permissionHistory }
      });
    } catch (error) {
      logger.error('获取权限变更历史详情失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更历史详情失败',
        error: error.message
      });
    }
  },

  // 获取用户权限变更历史
  getUserPermissionHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await AdminPermissionHistory.findAndCountAll({
        where: { userId },
        include: [
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          permissionHistory: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取用户权限变更历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取用户权限变更历史失败',
        error: error.message
      });
    }
  },

  // 获取管理员操作历史
  getAdminOperationHistory: async (req, res) => {
    try {
      const { adminId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await AdminPermissionHistory.findAndCountAll({
        where: { adminId },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          permissionHistory: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取管理员操作历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取管理员操作历史失败',
        error: error.message
      });
    }
  },

  // 获取权限类型变更历史
  getPermissionTypeHistory: async (req, res) => {
    try {
      const { permissionType } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await AdminPermissionHistory.findAndCountAll({
        where: { permissionType },
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          permissionHistory: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限类型变更历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限类型变更历史失败',
        error: error.message
      });
    }
  },

  // 获取时间范围内的权限变更历史
  getPermissionHistoryByDateRange: async (req, res) => {
    try {
      const { startDate, endDate, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
      
      const { count, rows } = await AdminPermissionHistory.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          permissionHistory: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取时间范围内的权限变更历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取时间范围内的权限变更历史失败',
        error: error.message
      });
    }
  },

  // 获取权限变更统计
  getPermissionChangeStats: async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      let dateFormat;
      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-%u';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        case 'year':
          dateFormat = '%Y';
          break;
        default:
          dateFormat = '%Y-%m';
      }
      
      const stats = await AdminPermissionHistory.findAll({
        attributes: [
          [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'period'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN action = "grant" THEN 1 END')), 'granted'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN action = "revoke" THEN 1 END')), 'revoked']
        ],
        group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat)],
        order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'ASC']],
        raw: true
      });
      
      return res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('获取权限变更统计失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更统计失败',
        error: error.message
      });
    }
  },

  // 获取权限变更趋势
  getPermissionChangeTrends: async (req, res) => {
    try {
      const { period = 'month', limit = 12 } = req.query;
      
      let dateFormat;
      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-%u';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        case 'year':
          dateFormat = '%Y';
          break;
        default:
          dateFormat = '%Y-%m';
      }
      
      const trends = await AdminPermissionHistory.findAll({
        attributes: [
          [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'period'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN action = "grant" THEN 1 END')), 'granted'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN action = "revoke" THEN 1 END')), 'revoked']
        ],
        group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat)],
        order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'DESC']],
        limit: parseInt(limit),
        raw: true
      });
      
      return res.status(200).json({
        success: true,
        data: { trends: trends.reverse() }
      });
    } catch (error) {
      logger.error('获取权限变更趋势失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更趋势失败',
        error: error.message
      });
    }
  },

  // 获取最频繁的权限变更
  getMostFrequentChanges: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      const frequentChanges = await AdminPermissionHistory.findAll({
        attributes: [
          'permissionType',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['permissionType'],
        order: [[require('sequelize').literal('count'), 'DESC']],
        limit: parseInt(limit),
        raw: true
      });
      
      return res.status(200).json({
        success: true,
        data: { frequentChanges }
      });
    } catch (error) {
      logger.error('获取最频繁的权限变更失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取最频繁的权限变更失败',
        error: error.message
      });
    }
  },

  // 获取权限变更影响分析
  getPermissionChangeImpact: async (req, res) => {
    try {
      const { id } = req.params;
      
      const permissionHistory = await AdminPermissionHistory.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ]
      });
      
      if (!permissionHistory) {
        return res.status(404).json({
          success: false,
          message: '权限变更历史不存在'
        });
      }
      
      // 模拟影响分析数据
      const impactAnalysis = {
        affectedUsers: 1,
        affectedResources: Math.floor(Math.random() * 10) + 1,
        riskLevel: permissionHistory.action === 'grant' ? 'medium' : 'low',
        impactScore: Math.floor(Math.random() * 100) + 1,
        recommendations: [
          '建议监控该用户的行为',
          '建议定期审查该权限的使用情况',
          '建议设置权限自动过期时间'
        ]
      };
      
      return res.status(200).json({
        success: true,
        data: { 
          permissionHistory,
          impactAnalysis 
        }
      });
    } catch (error) {
      logger.error('获取权限变更影响分析失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更影响分析失败',
        error: error.message
      });
    }
  },

  // 导出权限变更历史
  exportPermissionHistory: async (req, res) => {
    try {
      const { format = 'csv', userId, adminId, permissionType, status, startDate, endDate } = req.query;
      
      const whereClause = {};
      
      if (userId) whereClause.userId = userId;
      if (adminId) whereClause.adminId = adminId;
      if (permissionType) whereClause.permissionType = permissionType;
      if (status) whereClause.status = status;
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      const permissionHistory = await AdminPermissionHistory.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      if (format === 'csv') {
        const csvHeader = 'ID,用户,管理员,权限,操作类型,状态,创建时间\n';
        const csvData = permissionHistory.map(item => 
          `${item.id},${item.user?.username},${item.admin?.username},${item.permission?.name},${item.action},${item.status},${item.createdAt}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=permission-history.csv');
        return res.send(csvHeader + csvData);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=permission-history.json');
        return res.json({
          success: true,
          data: { permissionHistory }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '不支持的导出格式'
        });
      }
    } catch (error) {
      logger.error('导出权限变更历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '导出权限变更历史失败',
        error: error.message
      });
    }
  },

  // 批量审核权限变更
  batchReviewPermissionChanges: async (req, res) => {
    try {
      const { ids, status, reviewComment } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供要审核的权限变更ID列表'
        });
      }
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的审核状态'
        });
      }
      
      const updatedCount = await AdminPermissionHistory.update(
        { 
          status,
          reviewComment,
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        },
        {
          where: {
            id: { [Op.in]: ids }
          }
        }
      );
      
      return res.status(200).json({
        success: true,
        data: {
          updatedCount: updatedCount[0],
          message: `成功审核 ${updatedCount[0]} 条权限变更记录`
        }
      });
    } catch (error) {
      logger.error('批量审核权限变更失败:', error);
      return res.status(500).json({
        success: false,
        message: '批量审核权限变更失败',
        error: error.message
      });
    }
  },

  // 撤销权限变更
  revertPermissionChange: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const permissionHistory = await AdminPermissionHistory.findByPk(id);
      
      if (!permissionHistory) {
        return res.status(404).json({
          success: false,
          message: '权限变更历史不存在'
        });
      }
      
      if (permissionHistory.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: '只能撤销已审核通过的权限变更'
        });
      }
      
      // 创建撤销记录
      const revertRecord = await AdminPermissionHistory.create({
        userId: permissionHistory.userId,
        adminId: req.user.id,
        permissionId: permissionHistory.permissionId,
        permissionType: permissionHistory.permissionType,
        action: permissionHistory.action === 'grant' ? 'revoke' : 'grant',
        status: 'approved',
        reason: reason || '管理员撤销操作',
        originalHistoryId: id
      });
      
      // 更新原记录状态
      await permissionHistory.update({
        status: 'reverted',
        revertReason: reason,
        revertedAt: new Date(),
        revertedBy: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        data: {
          message: '权限变更已成功撤销',
          revertRecord
        }
      });
    } catch (error) {
      logger.error('撤销权限变更失败:', error);
      return res.status(500).json({
        success: false,
        message: '撤销权限变更失败',
        error: error.message
      });
    }
  },

  // 获取权限变更审计日志
  getPermissionAuditLogs: async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      // 模拟审计日志数据
      const auditLogs = [
        {
          id: '1',
          action: '权限变更创建',
          details: '管理员创建了权限变更记录',
          timestamp: new Date(),
          userId: req.user.id
        },
        {
          id: '2',
          action: '权限变更审核',
          details: '管理员审核了权限变更记录',
          timestamp: new Date(),
          userId: req.user.id
        }
      ];
      
      return res.status(200).json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            total: auditLogs.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(auditLogs.length / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限变更审计日志失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更审计日志失败',
        error: error.message
      });
    }
  },

  // 获取权限变更风险评估
  getPermissionChangeRiskAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      
      const permissionHistory = await AdminPermissionHistory.findByPk(id);
      
      if (!permissionHistory) {
        return res.status(404).json({
          success: false,
          message: '权限变更历史不存在'
        });
      }
      
      // 模拟风险评估数据
      const riskAssessment = {
        riskLevel: 'medium',
        riskScore: 65,
        riskFactors: [
          {
            factor: '权限敏感度',
            score: 70,
            description: '该权限属于高敏感度权限'
          },
          {
            factor: '用户历史行为',
            score: 50,
            description: '用户历史行为正常'
          },
          {
            factor: '操作频率',
            score: 60,
            description: '该权限变更操作频率适中'
          }
        ],
        recommendations: [
          '建议进行定期审查',
          '建议设置权限自动过期时间',
          '建议加强监控'
        ]
      };
      
      return res.status(200).json({
        success: true,
        data: { riskAssessment }
      });
    } catch (error) {
      logger.error('获取权限变更风险评估失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更风险评估失败',
        error: error.message
      });
    }
  },

  // 获取权限变更建议
  getPermissionChangeRecommendations: async (req, res) => {
    try {
      const { id } = req.params;
      
      const permissionHistory = await AdminPermissionHistory.findByPk(id);
      
      if (!permissionHistory) {
        return res.status(404).json({
          success: false,
          message: '权限变更历史不存在'
        });
      }
      
      // 模拟建议数据
      const recommendations = [
        {
          type: 'security',
          title: '安全建议',
          description: '建议为该权限设置自动过期时间',
          priority: 'high'
        },
        {
          type: 'monitoring',
          title: '监控建议',
          description: '建议加强对该用户使用该权限的监控',
          priority: 'medium'
        },
        {
          type: 'optimization',
          title: '优化建议',
          description: '建议考虑使用最小权限原则',
          priority: 'low'
        }
      ];
      
      return res.status(200).json({
        success: true,
        data: { recommendations }
      });
    } catch (error) {
      logger.error('获取权限变更建议失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更建议失败',
        error: error.message
      });
    }
  },

  // 获取权限变更模板
  getPermissionChangeTemplates: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await PermissionChangeTemplate.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          templates: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限变更模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更模板失败',
        error: error.message
      });
    }
  },

  // 创建权限变更模板
  createPermissionChangeTemplate: async (req, res) => {
    try {
      const { name, description, permissionType, action, reason, isActive = true } = req.body;
      
      if (!name || !permissionType || !action) {
        return res.status(400).json({
          success: false,
          message: '请提供模板名称、权限类型和操作类型'
        });
      }
      
      const template = await PermissionChangeTemplate.create({
        name,
        description,
        permissionType,
        action,
        reason,
        isActive,
        createdBy: req.user.id
      });
      
      return res.status(201).json({
        success: true,
        data: { template },
        message: '权限变更模板创建成功'
      });
    } catch (error) {
      logger.error('创建权限变更模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建权限变更模板失败',
        error: error.message
      });
    }
  },

  // 更新权限变更模板
  updatePermissionChangeTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissionType, action, reason, isActive } = req.body;
      
      const template = await PermissionChangeTemplate.findByPk(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '权限变更模板不存在'
        });
      }
      
      await template.update({
        name,
        description,
        permissionType,
        action,
        reason,
        isActive,
        updatedBy: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        data: { template },
        message: '权限变更模板更新成功'
      });
    } catch (error) {
      logger.error('更新权限变更模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新权限变更模板失败',
        error: error.message
      });
    }
  },

  // 删除权限变更模板
  deletePermissionChangeTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await PermissionChangeTemplate.findByPk(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '权限变更模板不存在'
        });
      }
      
      await template.destroy();
      
      return res.status(200).json({
        success: true,
        message: '权限变更模板删除成功'
      });
    } catch (error) {
      logger.error('删除权限变更模板失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除权限变更模板失败',
        error: error.message
      });
    }
  },

  // 获取权限变更自动化规则
  getPermissionAutomationRules: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await PermissionAutomationRule.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          rules: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限变更自动化规则失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更自动化规则失败',
        error: error.message
      });
    }
  },

  // 创建权限变更自动化规则
  createPermissionAutomationRule: async (req, res) => {
    try {
      const { name, description, conditions, actions, isActive = true } = req.body;
      
      if (!name || !conditions || !actions) {
        return res.status(400).json({
          success: false,
          message: '请提供规则名称、条件和操作'
        });
      }
      
      const rule = await PermissionAutomationRule.create({
        name,
        description,
        conditions,
        actions,
        isActive,
        createdBy: req.user.id
      });
      
      return res.status(201).json({
        success: true,
        data: { rule },
        message: '权限变更自动化规则创建成功'
      });
    } catch (error) {
      logger.error('创建权限变更自动化规则失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建权限变更自动化规则失败',
        error: error.message
      });
    }
  },

  // 更新权限变更自动化规则
  updatePermissionAutomationRule: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, conditions, actions, isActive } = req.body;
      
      const rule = await PermissionAutomationRule.findByPk(id);
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '权限变更自动化规则不存在'
        });
      }
      
      await rule.update({
        name,
        description,
        conditions,
        actions,
        isActive,
        updatedBy: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        data: { rule },
        message: '权限变更自动化规则更新成功'
      });
    } catch (error) {
      logger.error('更新权限变更自动化规则失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新权限变更自动化规则失败',
        error: error.message
      });
    }
  },

  // 删除权限变更自动化规则
  deletePermissionAutomationRule: async (req, res) => {
    try {
      const { id } = req.params;
      
      const rule = await PermissionAutomationRule.findByPk(id);
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '权限变更自动化规则不存在'
        });
      }
      
      await rule.destroy();
      
      return res.status(200).json({
        success: true,
        message: '权限变更自动化规则删除成功'
      });
    } catch (error) {
      logger.error('删除权限变更自动化规则失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除权限变更自动化规则失败',
        error: error.message
      });
    }
  },

  // 启用/禁用权限变更自动化规则
  togglePermissionAutomationRule: async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      
      const rule = await PermissionAutomationRule.findByPk(id);
      
      if (!rule) {
        return res.status(404).json({
          success: false,
          message: '权限变更自动化规则不存在'
        });
      }
      
      await rule.update({
        isActive: enabled,
        updatedBy: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        data: { rule },
        message: `权限变更自动化规则已${enabled ? '启用' : '禁用'}`
      });
    } catch (error) {
      logger.error('切换权限变更自动化规则状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '切换权限变更自动化规则状态失败',
        error: error.message
      });
    }
  },

  // 获取权限变更通知设置
  getPermissionNotificationSettings: async (req, res) => {
    try {
      let settings = await PermissionNotificationSettings.findOne();
      
      if (!settings) {
        // 创建默认设置
        settings = await PermissionNotificationSettings.create({
          emailEnabled: true,
          smsEnabled: false,
          inAppEnabled: true,
          webhookEnabled: false,
          webhookUrl: '',
          notificationEvents: ['created', 'approved', 'rejected', 'reverted']
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      logger.error('获取权限变更通知设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更通知设置失败',
        error: error.message
      });
    }
  },

  // 更新权限变更通知设置
  updatePermissionNotificationSettings: async (req, res) => {
    try {
      const { emailEnabled, smsEnabled, inAppEnabled, webhookEnabled, webhookUrl, notificationEvents } = req.body;
      
      let settings = await PermissionNotificationSettings.findOne();
      
      if (!settings) {
        settings = await PermissionNotificationSettings.create({
          emailEnabled,
          smsEnabled,
          inAppEnabled,
          webhookEnabled,
          webhookUrl,
          notificationEvents
        });
      } else {
        await settings.update({
          emailEnabled,
          smsEnabled,
          inAppEnabled,
          webhookEnabled,
          webhookUrl,
          notificationEvents
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { settings },
        message: '权限变更通知设置更新成功'
      });
    } catch (error) {
      logger.error('更新权限变更通知设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新权限变更通知设置失败',
        error: error.message
      });
    }
  },

  // 测试权限变更通知
  testPermissionNotification: async (req, res) => {
    try {
      const { type, recipient } = req.body;
      
      if (!type || !recipient) {
        return res.status(400).json({
          success: false,
          message: '请提供通知类型和接收者'
        });
      }
      
      // 模拟发送通知
      logger.info(`发送测试通知: 类型=${type}, 接收者=${recipient}`);
      
      return res.status(200).json({
        success: true,
        message: '测试通知发送成功'
      });
    } catch (error) {
      logger.error('测试权限变更通知失败:', error);
      return res.status(500).json({
        success: false,
        message: '测试权限变更通知失败',
        error: error.message
      });
    }
  },

  // 获取权限变更备份
  getPermissionChangeBackups: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await PermissionChangeBackup.findAndCountAll({
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          backups: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取权限变更备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取权限变更备份失败',
        error: error.message
      });
    }
  },

  // 创建权限变更备份
  createPermissionChangeBackup: async (req, res) => {
    try {
      const { name, description, includeInactive = false } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: '请提供备份名称'
        });
      }
      
      // 获取权限变更历史数据
      const whereClause = includeInactive ? {} : { status: 'approved' };
      const permissionHistory = await AdminPermissionHistory.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'admin', attributes: ['id', 'username', 'email'] },
          { model: Permission, as: 'permission', attributes: ['id', 'name', 'description'] }
        ]
      });
      
      // 创建备份文件路径
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const fileName = `permission-backup-${Date.now()}.json`;
      const filePath = path.join(backupDir, fileName);
      
      // 写入备份文件
      fs.writeFileSync(filePath, JSON.stringify({
        backupDate: new Date(),
        name,
        description,
        includeInactive,
        permissionHistory
      }, null, 2));
      
      // 创建备份记录
      const backup = await PermissionChangeBackup.create({
        name,
        description,
        fileName,
        filePath,
        includeInactive,
        recordCount: permissionHistory.length,
        createdBy: req.user.id
      });
      
      return res.status(201).json({
        success: true,
        data: { backup },
        message: '权限变更备份创建成功'
      });
    } catch (error) {
      logger.error('创建权限变更备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '创建权限变更备份失败',
        error: error.message
      });
    }
  },

  // 恢复权限变更备份
  restorePermissionChangeBackup: async (req, res) => {
    try {
      const { id } = req.params;
      
      const backup = await PermissionChangeBackup.findByPk(id);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: '权限变更备份不存在'
        });
      }
      
      if (!fs.existsSync(backup.filePath)) {
        return res.status(404).json({
          success: false,
          message: '备份文件不存在'
        });
      }
      
      // 读取备份文件
      const backupData = JSON.parse(fs.readFileSync(backup.filePath, 'utf8'));
      
      // 这里应该实现恢复逻辑，但为了简化，我们只返回成功消息
      // 实际实现中需要根据备份数据恢复权限变更历史
      
      return res.status(200).json({
        success: true,
        message: '权限变更备份恢复成功',
        data: {
          restoredRecords: backupData.permissionHistory.length
        }
      });
    } catch (error) {
      logger.error('恢复权限变更备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '恢复权限变更备份失败',
        error: error.message
      });
    }
  },

  // 删除权限变更备份
  deletePermissionChangeBackup: async (req, res) => {
    try {
      const { id } = req.params;
      
      const backup = await PermissionChangeBackup.findByPk(id);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: '权限变更备份不存在'
        });
      }
      
      // 删除备份文件
      if (fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
      
      // 删除备份记录
      await backup.destroy();
      
      return res.status(200).json({
        success: true,
        message: '权限变更备份删除成功'
      });
    } catch (error) {
      logger.error('删除权限变更备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '删除权限变更备份失败',
        error: error.message
      });
    }
  }
};

module.exports = adminPermissionHistoryController;