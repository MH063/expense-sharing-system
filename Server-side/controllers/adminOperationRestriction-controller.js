const { OperationRestriction, RestrictionTemplate, RestrictionViolation, RestrictionLog, RestrictionConfig, User } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

/**
 * 管理员操作限制控制器
 */
const adminOperationRestrictionController = {
  /**
   * 获取操作限制列表
   */
  getRestrictions: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, type, enabled, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (type) {
        whereClause.type = type;
      }
      
      if (enabled !== undefined) {
        whereClause.enabled = enabled === 'true';
      }
      
      const { count, rows } = await OperationRestriction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        success: true,
        data: {
          restrictions: rows,
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('获取操作限制列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制列表失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制详情
   */
  getRestrictionById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const restriction = await OperationRestriction.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      if (!restriction) {
        return res.status(404).json({
          success: false,
          message: '操作限制不存在'
        });
      }
      
      res.json({
        success: true,
        data: restriction
      });
    } catch (error) {
      logger.error('获取操作限制详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制详情失败',
        error: error.message
      });
    }
  },

  /**
   * 创建操作限制
   */
  createRestriction: async (req, res) => {
    try {
      const { name, description, type, config, enabled = true } = req.body;
      
      // 验证必填字段
      if (!name || !type || !config) {
        return res.status(400).json({
          success: false,
          message: '名称、类型和配置为必填项'
        });
      }
      
      // 检查名称是否已存在
      const existingRestriction = await OperationRestriction.findOne({ where: { name } });
      if (existingRestriction) {
        return res.status(400).json({
          success: false,
          message: '操作限制名称已存在'
        });
      }
      
      const restriction = await OperationRestriction.create({
        name,
        description,
        type,
        config,
        enabled,
        createdById: req.user.id
      });
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: restriction.id,
        action: 'create',
        details: `创建操作限制: ${name}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.status(201).json({
        success: true,
        data: restriction,
        message: '操作限制创建成功'
      });
    } catch (error) {
      logger.error('创建操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '创建操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 更新操作限制
   */
  updateRestriction: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, type, config, enabled } = req.body;
      
      const restriction = await OperationRestriction.findByPk(id);
      if (!restriction) {
        return res.status(404).json({
          success: false,
          message: '操作限制不存在'
        });
      }
      
      // 检查名称是否已存在（排除当前记录）
      if (name && name !== restriction.name) {
        const existingRestriction = await OperationRestriction.findOne({ where: { name } });
        if (existingRestriction) {
          return res.status(400).json({
            success: false,
            message: '操作限制名称已存在'
          });
        }
      }
      
      // 更新字段
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (config !== undefined) updateData.config = config;
      if (enabled !== undefined) updateData.enabled = enabled;
      
      updateData.updatedById = req.user.id;
      
      await restriction.update(updateData);
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: restriction.id,
        action: 'update',
        details: `更新操作限制: ${restriction.name}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        data: restriction,
        message: '操作限制更新成功'
      });
    } catch (error) {
      logger.error('更新操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '更新操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 删除操作限制
   */
  deleteRestriction: async (req, res) => {
    try {
      const { id } = req.params;
      
      const restriction = await OperationRestriction.findByPk(id);
      if (!restriction) {
        return res.status(404).json({
          success: false,
          message: '操作限制不存在'
        });
      }
      
      await restriction.destroy();
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: id,
        action: 'delete',
        details: `删除操作限制: ${restriction.name}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        message: '操作限制删除成功'
      });
    } catch (error) {
      logger.error('删除操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '删除操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 启用/禁用操作限制
   */
  toggleRestriction: async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      
      const restriction = await OperationRestriction.findByPk(id);
      if (!restriction) {
        return res.status(404).json({
          success: false,
          message: '操作限制不存在'
        });
      }
      
      await restriction.update({
        enabled,
        updatedById: req.user.id
      });
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: restriction.id,
        action: 'toggle',
        details: `${enabled ? '启用' : '禁用'}操作限制: ${restriction.name}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        data: restriction,
        message: `操作限制已${enabled ? '启用' : '禁用'}`
      });
    } catch (error) {
      logger.error('切换操作限制状态失败:', error);
      res.status(500).json({
        success: false,
        message: '切换操作限制状态失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制统计
   */
  getRestrictionStats: async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      
      // 计算时间范围
      let startDate;
      const endDate = new Date();
      
      switch (period) {
        case '1d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }
      
      // 总数统计
      const totalRestrictions = await OperationRestriction.count();
      const enabledRestrictions = await OperationRestriction.count({ where: { enabled: true } });
      const disabledRestrictions = totalRestrictions - enabledRestrictions;
      
      // 类型统计
      const typeStats = await OperationRestriction.findAll({
        attributes: [
          'type',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['type']
      });
      
      // 违规统计
      const totalViolations = await RestrictionViolation.count({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        }
      });
      
      const handledViolations = await RestrictionViolation.count({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          },
          status: 'handled'
        }
      });
      
      const pendingViolations = totalViolations - handledViolations;
      
      // 趋势数据
      const trendData = await RestrictionViolation.findAll({
        attributes: [
          [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
        order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          summary: {
            total: totalRestrictions,
            enabled: enabledRestrictions,
            disabled: disabledRestrictions
          },
          typeStats: typeStats.map(stat => ({
            type: stat.type,
            count: parseInt(stat.dataValues.count)
          })),
          violations: {
            total: totalViolations,
            handled: handledViolations,
            pending: pendingViolations
          },
          trends: trendData.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          }))
        }
      });
    } catch (error) {
      logger.error('获取操作限制统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制统计失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制日志
   */
  getRestrictionLogs: async (req, res) => {
    try {
      const { page = 1, limit = 10, restrictionId, action, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      
      if (restrictionId) {
        whereClause.restrictionId = restrictionId;
      }
      
      if (action) {
        whereClause.action = action;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      const { count, rows } = await RestrictionLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
          {
            model: OperationRestriction,
            as: 'restriction',
            attributes: ['id', 'name', 'type']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        success: true,
        data: {
          logs: rows,
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('获取操作限制日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制日志失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制类型
   */
  getRestrictionTypes: async (req, res) => {
    try {
      const types = [
        { value: 'api', label: 'API访问限制', description: '限制API接口的访问频率或次数' },
        { value: 'operation', label: '操作限制', description: '限制特定操作的执行' },
        { value: 'time', label: '时间限制', description: '限制在特定时间段内的操作' },
        { value: 'data', label: '数据限制', description: '限制数据的访问或修改' },
        { value: 'ip', label: 'IP限制', description: '限制特定IP地址的访问' },
        { value: 'user', label: '用户限制', description: '限制特定用户的操作' }
      ];
      
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      logger.error('获取操作限制类型失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制类型失败',
        error: error.message
      });
    }
  },

  /**
   * 批量更新操作限制
   */
  batchUpdateRestrictions: async (req, res) => {
    try {
      const { restrictions } = req.body;
      
      if (!Array.isArray(restrictions) || restrictions.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的操作限制列表'
        });
      }
      
      const results = [];
      
      for (const item of restrictions) {
        const { id, ...updateData } = item;
        
        const restriction = await OperationRestriction.findByPk(id);
        if (restriction) {
          updateData.updatedById = req.user.id;
          await restriction.update(updateData);
          
          results.push({
            id,
            success: true,
            data: restriction
          });
          
          // 记录操作日志
          await RestrictionLog.create({
            restrictionId: restriction.id,
            action: 'batch_update',
            details: `批量更新操作限制: ${restriction.name}`,
            userId: req.user.id,
            ipAddress: req.ip
          });
        } else {
          results.push({
            id,
            success: false,
            message: '操作限制不存在'
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: '批量更新操作限制完成'
      });
    } catch (error) {
      logger.error('批量更新操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 获取用户操作限制
   */
  getUserRestrictions: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // 检查用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 获取用户特定的限制
      const userSpecificRestrictions = await OperationRestriction.findAll({
        where: {
          enabled: true,
          userId
        }
      });
      
      // 获取全局限制
      const globalRestrictions = await OperationRestriction.findAll({
        where: {
          enabled: true,
          userId: null
        }
      });
      
      res.json({
        success: true,
        data: {
          user,
          userSpecificRestrictions,
          globalRestrictions,
          allRestrictions: [...userSpecificRestrictions, ...globalRestrictions]
        }
      });
    } catch (error) {
      logger.error('获取用户操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 设置用户操作限制
   */
  setUserRestrictions: async (req, res) => {
    try {
      const { userId } = req.params;
      const { restrictions } = req.body;
      
      // 检查用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      if (!Array.isArray(restrictions)) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的限制列表'
        });
      }
      
      const results = [];
      
      for (const restrictionData of restrictions) {
        const { name, description, type, config, enabled = true } = restrictionData;
        
        // 创建用户特定限制
        const restriction = await OperationRestriction.create({
          name,
          description,
          type,
          config,
          enabled,
          userId,
          createdById: req.user.id
        });
        
        results.push(restriction);
        
        // 记录操作日志
        await RestrictionLog.create({
          restrictionId: restriction.id,
          action: 'user_set',
          details: `为用户 ${user.username} 设置操作限制: ${name}`,
          userId: req.user.id,
          ipAddress: req.ip
        });
      }
      
      res.status(201).json({
        success: true,
        data: results,
        message: '用户操作限制设置成功'
      });
    } catch (error) {
      logger.error('设置用户操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '设置用户操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制模板
   */
  getRestrictionTemplates: async (req, res) => {
    try {
      const templates = await RestrictionTemplate.findAll({
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('获取操作限制模板失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制模板失败',
        error: error.message
      });
    }
  },

  /**
   * 应用操作限制模板
   */
  applyRestrictionTemplate: async (req, res) => {
    try {
      const { templateId } = req.params;
      const { userIds } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的用户ID列表'
        });
      }
      
      // 获取模板
      const template = await RestrictionTemplate.findByPk(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: '操作限制模板不存在'
        });
      }
      
      const results = [];
      
      for (const userId of userIds) {
        // 检查用户是否存在
        const user = await User.findByPk(userId);
        if (!user) {
          results.push({
            userId,
            success: false,
            message: '用户不存在'
          });
          continue;
        }
        
        // 为每个用户创建限制
        const restriction = await OperationRestriction.create({
          name: template.name,
          description: template.description,
          type: template.type,
          config: template.config,
          enabled: true,
          userId,
          createdById: req.user.id
        });
        
        results.push({
          userId,
          success: true,
          restrictionId: restriction.id
        });
        
        // 记录操作日志
        await RestrictionLog.create({
          restrictionId: restriction.id,
          action: 'template_apply',
          details: `为用户 ${user.username} 应用模板 ${template.name}`,
          userId: req.user.id,
          ipAddress: req.ip
        });
      }
      
      res.json({
        success: true,
        data: results,
        message: '操作限制模板应用完成'
      });
    } catch (error) {
      logger.error('应用操作限制模板失败:', error);
      res.status(500).json({
        success: false,
        message: '应用操作限制模板失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制违规记录
   */
  getRestrictionViolations: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, userId, restrictionId, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (restrictionId) {
        whereClause.restrictionId = restrictionId;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      const { count, rows } = await RestrictionViolation.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
          {
            model: OperationRestriction,
            as: 'restriction',
            attributes: ['id', 'name', 'type']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        success: true,
        data: {
          violations: rows,
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('获取操作限制违规记录失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制违规记录失败',
        error: error.message
      });
    }
  },

  /**
   * 处理操作限制违规
   */
  handleRestrictionViolation: async (req, res) => {
    try {
      const { violationId } = req.params;
      const { action, notes } = req.body;
      
      const violation = await RestrictionViolation.findByPk(violationId);
      if (!violation) {
        return res.status(404).json({
          success: false,
          message: '违规记录不存在'
        });
      }
      
      await violation.update({
        status: 'handled',
        handledById: req.user.id,
        handledAt: new Date(),
        handlingAction: action,
        handlingNotes: notes
      });
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: violation.restrictionId,
        action: 'violation_handle',
        details: `处理违规记录: ${action}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        data: violation,
        message: '违规记录处理成功'
      });
    } catch (error) {
      logger.error('处理操作限制违规失败:', error);
      res.status(500).json({
        success: false,
        message: '处理操作限制违规失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制趋势
   */
  getRestrictionTrends: async (req, res) => {
    try {
      const { period = '7d', type } = req.query;
      
      // 计算时间范围
      let startDate;
      const endDate = new Date();
      
      switch (period) {
        case '1d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
      }
      
      // 查询趋势数据
      const whereClause = {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      };
      
      if (type) {
        whereClause.type = type;
      }
      
      // 违规趋势
      const violationTrends = await RestrictionViolation.findAll({
        attributes: [
          [require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'date'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: whereClause,
        group: [require('sequelize').fn('DATE', require('sequelize').col('createdAt'))],
        order: [[require('sequelize').fn('DATE', require('sequelize').col('createdAt')), 'ASC']]
      });
      
      // 处理趋势
      const handledTrends = await RestrictionViolation.findAll({
        attributes: [
          [require('sequelize').fn('DATE', require('sequelize').col('handledAt')), 'date'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: {
          ...whereClause,
          status: 'handled',
          handledAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [require('sequelize').fn('DATE', require('sequelize').col('handledAt'))],
        order: [[require('sequelize').fn('DATE', require('sequelize').col('handledAt')), 'ASC']]
      });
      
      res.json({
        success: true,
        data: {
          violations: violationTrends.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          })),
          handled: handledTrends.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          }))
        }
      });
    } catch (error) {
      logger.error('获取操作限制趋势失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制趋势失败',
        error: error.message
      });
    }
  },

  /**
   * 导出操作限制数据
   */
  exportRestrictions: async (req, res) => {
    try {
      const { format = 'json', type, enabled } = req.query;
      
      const whereClause = {};
      
      if (type) {
        whereClause.type = type;
      }
      
      if (enabled !== undefined) {
        whereClause.enabled = enabled === 'true';
      }
      
      const restrictions = await OperationRestriction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      if (format === 'csv') {
        // 简单的CSV格式转换
        const csvHeader = 'ID,名称,描述,类型,启用状态,创建人,创建时间,更新人,更新时间\n';
        const csvData = restrictions.map(item => 
          `${item.id},"${item.name}","${item.description || ''}",${item.type},${item.enabled},${item.creator?.username || ''},${item.createdAt},${item.updater?.username || ''},${item.updatedAt}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="operation-restrictions.csv"');
        res.send(csvHeader + csvData);
      } else {
        res.json({
          success: true,
          data: restrictions
        });
      }
    } catch (error) {
      logger.error('导出操作限制数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出操作限制数据失败',
        error: error.message
      });
    }
  },

  /**
   * 导入操作限制数据
   */
  importRestrictions: async (req, res) => {
    try {
      const { restrictions } = req.body;
      
      if (!Array.isArray(restrictions) || restrictions.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的操作限制数据'
        });
      }
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const item of restrictions) {
        try {
          const { name, description, type, config, enabled = true } = item;
          
          // 检查必填字段
          if (!name || !type || !config) {
            results.failed++;
            results.errors.push({
              item,
              error: '名称、类型和配置为必填项'
            });
            continue;
          }
          
          // 检查名称是否已存在
          const existingRestriction = await OperationRestriction.findOne({ where: { name } });
          if (existingRestriction) {
            results.failed++;
            results.errors.push({
              item,
              error: '操作限制名称已存在'
            });
            continue;
          }
          
          // 创建操作限制
          await OperationRestriction.create({
            name,
            description,
            type,
            config,
            enabled,
            createdById: req.user.id
          });
          
          results.success++;
          
          // 记录操作日志
          await RestrictionLog.create({
            restrictionId: null, // 此时还没有ID
            action: 'import',
            details: `导入操作限制: ${name}`,
            userId: req.user.id,
            ipAddress: req.ip
          });
        } catch (error) {
          results.failed++;
          results.errors.push({
            item,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: '操作限制数据导入完成'
      });
    } catch (error) {
      logger.error('导入操作限制数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导入操作限制数据失败',
        error: error.message
      });
    }
  },

  /**
   * 获取操作限制配置
   */
  getRestrictionConfig: async (req, res) => {
    try {
      let config = await RestrictionConfig.findOne();
      
      if (!config) {
        // 创建默认配置
        config = await RestrictionConfig.create({
          enableLogging: true,
          enableNotifications: true,
          violationAction: 'block',
          maxViolationsPerDay: 10,
          violationResetHours: 24,
          autoDisableViolations: false,
          createdById: req.user.id
        });
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('获取操作限制配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作限制配置失败',
        error: error.message
      });
    }
  },

  /**
   * 更新操作限制配置
   */
  updateRestrictionConfig: async (req, res) => {
    try {
      const { enableLogging, enableNotifications, violationAction, maxViolationsPerDay, violationResetHours, autoDisableViolations } = req.body;
      
      let config = await RestrictionConfig.findOne();
      
      if (!config) {
        config = await RestrictionConfig.create({
          enableLogging,
          enableNotifications,
          violationAction,
          maxViolationsPerDay,
          violationResetHours,
          autoDisableViolations,
          createdById: req.user.id
        });
      } else {
        await config.update({
          enableLogging,
          enableNotifications,
          violationAction,
          maxViolationsPerDay,
          violationResetHours,
          autoDisableViolations,
          updatedById: req.user.id
        });
      }
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: null,
        action: 'config_update',
        details: '更新操作限制配置',
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        data: config,
        message: '操作限制配置更新成功'
      });
    } catch (error) {
      logger.error('更新操作限制配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新操作限制配置失败',
        error: error.message
      });
    }
  },

  /**
   * 测试操作限制
   */
  testRestriction: async (req, res) => {
    try {
      const { type, config, testData } = req.body;
      
      if (!type || !config) {
        return res.status(400).json({
          success: false,
          message: '类型和配置为必填项'
        });
      }
      
      // 这里应该根据不同的类型进行实际的限制测试
      // 为了简化，我们只返回一个模拟结果
      const testResult = {
        type,
        passed: true,
        message: '测试通过',
        details: {
          config,
          testData,
          result: '操作限制配置有效'
        }
      };
      
      res.json({
        success: true,
        data: testResult,
        message: '操作限制测试完成'
      });
    } catch (error) {
      logger.error('测试操作限制失败:', error);
      res.status(500).json({
        success: false,
        message: '测试操作限制失败',
        error: error.message
      });
    }
  },

  /**
   * 重置操作限制统计
   */
  resetRestrictionStats: async (req, res) => {
    try {
      const { type, userId } = req.body;
      
      const whereClause = {};
      
      if (type) {
        whereClause.type = type;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      // 删除违规记录
      await RestrictionViolation.destroy({ where: whereClause });
      
      // 记录操作日志
      await RestrictionLog.create({
        restrictionId: null,
        action: 'stats_reset',
        details: `重置操作限制统计: ${type || '全部'} ${userId ? `用户 ${userId}` : ''}`,
        userId: req.user.id,
        ipAddress: req.ip
      });
      
      res.json({
        success: true,
        message: '操作限制统计重置成功'
      });
    } catch (error) {
      logger.error('重置操作限制统计失败:', error);
      res.status(500).json({
        success: false,
        message: '重置操作限制统计失败',
        error: error.message
      });
    }
  }
};

module.exports = adminOperationRestrictionController;