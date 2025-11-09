const { AdminSession, User, SessionActivityLog, SessionAnomaly, SessionRiskAssessment } = require('../models');
const { Op } = require('sequelize');
const geoip = require('geoip-lite');
const { auditLogger } = require('../middleware/auditLogger');
const { validationResult } = require('express-validator');

/**
 * 管理员会话管理控制器
 */
const adminSessionController = {
  /**
   * 获取所有活跃会话列表
   */
  getActiveSessions: async (req, res) => {
    try {
      console.log('获取所有活跃会话列表，请求参数:', req.query);
      
      const {
        page = 1,
        pageSize = 20,
        userId,
        ipAddress,
        userAgent,
        status = 'active',
        startTime,
        endTime
      } = req.query;

      const whereClause = {
        status: status
      };

      if (userId) {
        whereClause.userId = userId;
      }

      if (ipAddress) {
        whereClause.ipAddress = { [Op.like]: `%${ipAddress}%` };
      }

      if (userAgent) {
        whereClause.userAgent = { [Op.like]: `%${userAgent}%` };
      }

      if (startTime && endTime) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startTime), new Date(endTime)]
        };
      }

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: sessions } = await AdminSession.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // 添加地理位置信息
      const sessionsWithLocation = sessions.map(session => {
        const sessionData = session.toJSON();
        const geo = geoip.lookup(session.ipAddress);
        sessionData.location = geo ? {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          ll: geo.ll
        } : null;
        return sessionData;
      });

      res.json({
        success: true,
        data: {
          sessions: sessionsWithLocation,
          pagination: {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(count / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取活跃会话列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活跃会话列表失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话详情
   */
  getSessionDetails: async (req, res) => {
    try {
      console.log('获取会话详情，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const session = await AdminSession.findOne({
        where: { id: sessionId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role', 'createdAt']
          }
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 添加地理位置信息
      const sessionData = session.toJSON();
      const geo = geoip.lookup(session.ipAddress);
      sessionData.location = geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        ll: geo.ll
      } : null;

      // 获取会话活动日志
      const activityLogs = await SessionActivityLog.findAll({
        where: { sessionId },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // 获取会话异常行为
      const anomalies = await SessionAnomaly.findAll({
        where: { sessionId },
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      // 获取会话风险评估
      const riskAssessment = await SessionRiskAssessment.findOne({
        where: { sessionId },
        order: [['createdAt', 'DESC']]
      });

      sessionData.activityLogs = activityLogs;
      sessionData.anomalies = anomalies;
      sessionData.riskAssessment = riskAssessment;

      res.json({
        success: true,
        data: sessionData
      });
    } catch (error) {
      console.error('获取会话详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话详情失败',
        error: error.message
      });
    }
  },

  /**
   * 获取用户的所有会话
   */
  getUserSessions: async (req, res) => {
    try {
      console.log('获取用户的所有会话，用户ID:', req.params.userId);
      
      const { userId } = req.params;
      const {
        page = 1,
        pageSize = 20,
        status
      } = req.query;

      const whereClause = {
        userId
      };

      if (status) {
        whereClause.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: sessions } = await AdminSession.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // 添加地理位置信息
      const sessionsWithLocation = sessions.map(session => {
        const sessionData = session.toJSON();
        const geo = geoip.lookup(session.ipAddress);
        sessionData.location = geo ? {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          ll: geo.ll
        } : null;
        return sessionData;
      });

      res.json({
        success: true,
        data: {
          sessions: sessionsWithLocation,
          pagination: {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(count / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取用户会话列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户会话列表失败',
        error: error.message
      });
    }
  },

  /**
   * 撤销指定会话
   */
  revokeSession: async (req, res) => {
    try {
      console.log('撤销指定会话，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const { reason = '管理员撤销' } = req.body;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 更新会话状态
      await session.update({
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: req.user.id,
        revokeReason: reason
      });

      // 记录活动日志
      await SessionActivityLog.create({
        sessionId,
        action: 'revoked',
        details: `会话被管理员撤销，原因: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '会话已成功撤销'
      });
    } catch (error) {
      console.error('撤销会话失败:', error);
      res.status(500).json({
        success: false,
        message: '撤销会话失败',
        error: error.message
      });
    }
  },

  /**
   * 批量撤销会话
   */
  revokeMultipleSessions: async (req, res) => {
    try {
      console.log('批量撤销会话，请求数据:', req.body);
      
      const { sessionIds, reason = '管理员批量撤销' } = req.body;

      if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的会话ID列表'
        });
      }

      // 更新所有指定会话的状态
      const [updatedCount] = await AdminSession.update(
        {
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: req.user.id,
          revokeReason: reason
        },
        {
          where: {
            id: { [Op.in]: sessionIds },
            status: 'active' // 只撤销活跃会话
          }
        }
      );

      // 为每个会话记录活动日志
      for (const sessionId of sessionIds) {
        await SessionActivityLog.create({
          sessionId,
          action: 'revoked',
          details: `会话被管理员批量撤销，原因: ${reason}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        success: true,
        message: `成功撤销 ${updatedCount} 个会话`
      });
    } catch (error) {
      console.error('批量撤销会话失败:', error);
      res.status(500).json({
        success: false,
        message: '批量撤销会话失败',
        error: error.message
      });
    }
  },

  /**
   * 撤销用户的所有会话
   */
  revokeUserAllSessions: async (req, res) => {
    try {
      console.log('撤销用户的所有会话，用户ID:', req.params.userId);
      
      const { userId } = req.params;
      const { reason = '管理员撤销用户所有会话', excludeCurrent = false } = req.body;

      const whereClause = {
        userId,
        status: 'active'
      };

      // 如果排除当前会话
      if (excludeCurrent && req.session && req.session.id) {
        whereClause.id = { [Op.ne]: req.session.id };
      }

      // 更新用户所有会话的状态
      const [updatedCount] = await AdminSession.update(
        {
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: req.user.id,
          revokeReason: reason
        },
        {
          where: whereClause
        }
      );

      // 获取被撤销的会话列表
      const revokedSessions = await AdminSession.findAll({
        where: {
          userId,
          status: 'revoked',
          revokedAt: new Date()
        },
        attributes: ['id']
      });

      // 为每个会话记录活动日志
      for (const session of revokedSessions) {
        await SessionActivityLog.create({
          sessionId: session.id,
          action: 'revoked',
          details: `用户所有会话被管理员撤销，原因: ${reason}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        success: true,
        message: `成功撤销用户 ${updatedCount} 个会话`
      });
    } catch (error) {
      console.error('撤销用户所有会话失败:', error);
      res.status(500).json({
        success: false,
        message: '撤销用户所有会话失败',
        error: error.message
      });
    }
  },

  /**
   * 延长会话有效期
   */
  extendSession: async (req, res) => {
    try {
      console.log('延长会话有效期，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const { extensionHours = 24, reason = '管理员延长会话' } = req.body;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      if (session.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: '只能延长活跃会话的有效期'
        });
      }

      // 计算新的过期时间
      const currentExpiresAt = new Date(session.expiresAt);
      const newExpiresAt = new Date(currentExpiresAt.getTime() + extensionHours * 60 * 60 * 1000);

      // 更新会话过期时间
      await session.update({
        expiresAt: newExpiresAt,
        extendedAt: new Date(),
        extendedBy: req.user.id,
        extensionReason: reason
      });

      // 记录活动日志
      await SessionActivityLog.create({
        sessionId,
        action: 'extended',
        details: `会话被管理员延长 ${extensionHours} 小时，原因: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '会话有效期已成功延长',
        data: {
          newExpiresAt
        }
      });
    } catch (error) {
      console.error('延长会话有效期失败:', error);
      res.status(500).json({
        success: false,
        message: '延长会话有效期失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话活动日志
   */
  getSessionActivityLogs: async (req, res) => {
    try {
      console.log('获取会话活动日志，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const {
        page = 1,
        pageSize = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: logs } = await SessionActivityLog.findAndCountAll({
        where: { sessionId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(count / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取会话活动日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话活动日志失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话统计信息
   */
  getSessionStatistics: async (req, res) => {
    try {
      console.log('获取会话统计信息，请求参数:', req.query);
      
      const { timeRange = 'week', startDate, endDate } = req.query;

      // 计算时间范围
      let startTime, endTime;
      const now = new Date();

      if (startDate && endDate) {
        startTime = new Date(startDate);
        endTime = new Date(endDate);
      } else {
        switch (timeRange) {
          case 'today':
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'week':
            startTime = new Date(now);
            startTime.setDate(now.getDate() - 7);
            endTime = now;
            break;
          case 'month':
            startTime = new Date(now);
            startTime.setMonth(now.getMonth() - 1);
            endTime = now;
            break;
          case 'year':
            startTime = new Date(now);
            startTime.setFullYear(now.getFullYear() - 1);
            endTime = now;
            break;
          default:
            startTime = new Date(now);
            startTime.setDate(now.getDate() - 7);
            endTime = now;
        }
      }

      // 获取统计数据
      const totalSessions = await AdminSession.count({
        where: {
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        }
      });

      const activeSessions = await AdminSession.count({
        where: {
          status: 'active',
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        }
      });

      const expiredSessions = await AdminSession.count({
        where: {
          status: 'expired',
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        }
      });

      const revokedSessions = await AdminSession.count({
        where: {
          status: 'revoked',
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        }
      });

      // 按日期统计
      const dailyStats = await AdminSession.findAll({
        attributes: [
          [AdminSession.sequelize.fn('DATE', AdminSession.sequelize.col('createdAt')), 'date'],
          [AdminSession.sequelize.fn('COUNT', AdminSession.sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        },
        group: [AdminSession.sequelize.fn('DATE', AdminSession.sequelize.col('createdAt'))],
        order: [[AdminSession.sequelize.fn('DATE', AdminSession.sequelize.col('createdAt')), 'ASC']]
      });

      // 按用户统计
      const userStats = await AdminSession.findAll({
        attributes: [
          'userId',
          [AdminSession.sequelize.fn('COUNT', AdminSession.sequelize.col('id')), 'count']
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['username', 'email']
          }
        ],
        where: {
          createdAt: {
            [Op.between]: [startTime, endTime]
          }
        },
        group: ['userId', 'user.id', 'user.username', 'user.email'],
        order: [[AdminSession.sequelize.fn('COUNT', AdminSession.sequelize.col('id')), 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalSessions,
            activeSessions,
            expiredSessions,
            revokedSessions
          },
          dailyStats,
          userStats,
          timeRange: {
            startTime,
            endTime
          }
        }
      });
    } catch (error) {
      console.error('获取会话统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话统计信息失败',
        error: error.message
      });
    }
  },

  /**
   * 获取可疑会话列表
   */
  getSuspiciousSessions: async (req, res) => {
    try {
      console.log('获取可疑会话列表，请求参数:', req.query);
      
      const {
        page = 1,
        pageSize = 20,
        riskLevel
      } = req.query;

      const whereClause = {};

      if (riskLevel) {
        whereClause.riskLevel = riskLevel;
      } else {
        // 默认显示中高风险以上的会话
        whereClause.riskLevel = { [Op.in]: ['medium', 'high', 'critical'] };
      }

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: sessions } = await AdminSession.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['riskScore', 'DESC']],
        limit,
        offset
      });

      // 添加地理位置信息
      const sessionsWithLocation = sessions.map(session => {
        const sessionData = session.toJSON();
        const geo = geoip.lookup(session.ipAddress);
        sessionData.location = geo ? {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          ll: geo.ll
        } : null;
        return sessionData;
      });

      res.json({
        success: true,
        data: {
          sessions: sessionsWithLocation,
          pagination: {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(count / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取可疑会话列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取可疑会话列表失败',
        error: error.message
      });
    }
  },

  /**
   * 标记会话为可疑
   */
  markSessionAsSuspicious: async (req, res) => {
    try {
      console.log('标记会话为可疑，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const { riskLevel = 'medium', reason = '管理员标记为可疑' } = req.body;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 更新会话风险级别
      await session.update({
        riskLevel,
        riskReason: reason,
        markedSuspiciousAt: new Date(),
        markedSuspiciousBy: req.user.id
      });

      // 记录活动日志
      await SessionActivityLog.create({
        sessionId,
        action: 'marked_suspicious',
        details: `会话被管理员标记为可疑，风险级别: ${riskLevel}，原因: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '会话已成功标记为可疑'
      });
    } catch (error) {
      console.error('标记会话为可疑失败:', error);
      res.status(500).json({
        success: false,
        message: '标记会话为可疑失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话地理位置信息
   */
  getSessionLocation: async (req, res) => {
    try {
      console.log('获取会话地理位置信息，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 获取地理位置信息
      const geo = geoip.lookup(session.ipAddress);

      if (!geo) {
        return res.json({
          success: true,
          data: {
            message: '无法获取地理位置信息',
            location: null
          }
        });
      }

      res.json({
        success: true,
        data: {
          ipAddress: session.ipAddress,
          location: {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            ll: geo.ll,
            range: geo.range
          }
        }
      });
    } catch (error) {
      console.error('获取会话地理位置信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话地理位置信息失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话设备信息
   */
  getSessionDeviceInfo: async (req, res) => {
    try {
      console.log('获取会话设备信息，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 解析用户代理字符串
      const userAgent = session.userAgent;
      const deviceInfo = {
        userAgent,
        browser: 'Unknown',
        os: 'Unknown',
        device: 'Unknown'
      };

      // 简单的用户代理解析
      if (userAgent) {
        // 检测浏览器
        if (userAgent.includes('Chrome')) {
          deviceInfo.browser = 'Chrome';
        } else if (userAgent.includes('Firefox')) {
          deviceInfo.browser = 'Firefox';
        } else if (userAgent.includes('Safari')) {
          deviceInfo.browser = 'Safari';
        } else if (userAgent.includes('Edge')) {
          deviceInfo.browser = 'Edge';
        }

        // 检测操作系统
        if (userAgent.includes('Windows')) {
          deviceInfo.os = 'Windows';
        } else if (userAgent.includes('Mac OS')) {
          deviceInfo.os = 'macOS';
        } else if (userAgent.includes('Linux')) {
          deviceInfo.os = 'Linux';
        } else if (userAgent.includes('Android')) {
          deviceInfo.os = 'Android';
        } else if (userAgent.includes('iOS')) {
          deviceInfo.os = 'iOS';
        }

        // 检测设备类型
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
          deviceInfo.device = 'Mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
          deviceInfo.device = 'Tablet';
        } else {
          deviceInfo.device = 'Desktop';
        }
      }

      res.json({
        success: true,
        data: deviceInfo
      });
    } catch (error) {
      console.error('获取会话设备信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话设备信息失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话安全信息
   */
  getSessionSecurityInfo: async (req, res) => {
    try {
      console.log('获取会话安全信息，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const session = await AdminSession.findByPk(sessionId, {
        include: [
          {
            model: SessionAnomaly,
            as: 'anomalies'
          },
          {
            model: SessionRiskAssessment,
            as: 'riskAssessments'
          }
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 获取最近的风险评估
      const latestRiskAssessment = session.riskAssessments && session.riskAssessments.length > 0
        ? session.riskAssessments[session.riskAssessments.length - 1]
        : null;

      // 获取最近的异常行为
      const recentAnomalies = session.anomalies && session.anomalies.length > 0
        ? session.anomalies.slice(0, 5)
        : [];

      // 构建安全信息
      const securityInfo = {
        sessionId: session.id,
        riskLevel: session.riskLevel,
        riskScore: session.riskScore,
        riskReason: session.riskReason,
        ipAddress: session.ipAddress,
        isSecureConnection: session.ipAddress !== '127.0.0.1' && !session.ipAddress.startsWith('192.168.'),
        hasAnomalies: session.anomalies && session.anomalies.length > 0,
        anomalyCount: session.anomalies ? session.anomalies.length : 0,
        recentAnomalies,
        latestRiskAssessment,
        securityFlags: {
          isNewLocation: session.isNewLocation,
          isNewDevice: session.isNewDevice,
          isUnusualTime: session.isUnusualTime,
          hasMultipleFailedLogins: session.hasMultipleFailedLogins
        }
      };

      res.json({
        success: true,
        data: securityInfo
      });
    } catch (error) {
      console.error('获取会话安全信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话安全信息失败',
        error: error.message
      });
    }
  },

  /**
   * 强制用户重新认证
   */
  forceUserReauthentication: async (req, res) => {
    try {
      console.log('强制用户重新认证，用户ID:', req.params.userId);
      
      const { userId } = req.params;
      const { reason = '管理员强制重新认证' } = req.body;

      // 检查用户是否存在
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 撤销用户所有活跃会话
      const [updatedCount] = await AdminSession.update(
        {
          status: 'revoked',
          revokedAt: new Date(),
          revokedBy: req.user.id,
          revokeReason: reason
        },
        {
          where: {
            userId,
            status: 'active'
          }
        }
      );

      // 获取被撤销的会话列表
      const revokedSessions = await AdminSession.findAll({
        where: {
          userId,
          status: 'revoked',
          revokedAt: new Date()
        },
        attributes: ['id']
      });

      // 为每个会话记录活动日志
      for (const session of revokedSessions) {
        await SessionActivityLog.create({
          sessionId: session.id,
          action: 'forced_reauth',
          details: `用户被管理员强制重新认证，原因: ${reason}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      res.json({
        success: true,
        message: `用户已被强制重新认证，已撤销 ${updatedCount} 个会话`
      });
    } catch (error) {
      console.error('强制用户重新认证失败:', error);
      res.status(500).json({
        success: false,
        message: '强制用户重新认证失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话访问模式
   */
  getSessionAccessPattern: async (req, res) => {
    try {
      console.log('获取会话访问模式，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 获取会话活动日志
      const activityLogs = await SessionActivityLog.findAll({
        where: { sessionId },
        order: [['createdAt', 'ASC']]
      });

      // 分析访问模式
      const accessPattern = {
        sessionId,
        firstAccess: session.createdAt,
        lastAccess: session.lastAccessAt,
        totalRequests: activityLogs.length,
        averageRequestsPerHour: 0,
        peakActivityHours: [],
        commonActions: {},
        accessFrequency: 'normal',
        unusualPatterns: []
      };

      if (activityLogs.length > 0) {
        // 计算会话持续时间（小时）
        const sessionDurationHours = (session.lastAccessAt || new Date() - session.createdAt) / (1000 * 60 * 60);
        accessPattern.averageRequestsPerHour = activityLogs.length / sessionDurationHours;

        // 分析每小时的活动
        const hourlyActivity = {};
        activityLogs.forEach(log => {
          const hour = new Date(log.createdAt).getHours();
          hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
        });

        // 找出活动高峰时段
        const sortedHours = Object.entries(hourlyActivity)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([hour]) => parseInt(hour));
        accessPattern.peakActivityHours = sortedHours;

        // 分析常见操作
        activityLogs.forEach(log => {
          accessPattern.commonActions[log.action] = (accessPattern.commonActions[log.action] || 0) + 1;
        });

        // 评估访问频率
        if (accessPattern.averageRequestsPerHour > 100) {
          accessPattern.accessFrequency = 'high';
        } else if (accessPattern.averageRequestsPerHour < 10) {
          accessPattern.accessFrequency = 'low';
        }

        // 检测异常模式
        if (accessPattern.averageRequestsPerHour > 200) {
          accessPattern.unusualPatterns.push('异常高的请求频率');
        }

        if (Object.keys(accessPattern.commonActions).length === 1) {
          accessPattern.unusualPatterns.push('单一操作模式');
        }
      }

      res.json({
        success: true,
        data: accessPattern
      });
    } catch (error) {
      console.error('获取会话访问模式失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话访问模式失败',
        error: error.message
      });
    }
  },

  /**
   * 设置会话访问限制
   */
  setSessionAccessRestrictions: async (req, res) => {
    try {
      console.log('设置会话访问限制，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const { allowedIPs, blockedIPs, allowedLocations } = req.body;

      const session = await AdminSession.findByPk(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        });
      }

      // 更新会话访问限制
      await session.update({
        accessRestrictions: {
          allowedIPs: allowedIPs || [],
          blockedIPs: blockedIPs || [],
          allowedLocations: allowedLocations || []
        },
        restrictionsUpdatedAt: new Date(),
        restrictionsUpdatedBy: req.user.id
      });

      // 记录活动日志
      await SessionActivityLog.create({
        sessionId,
        action: 'access_restrictions_updated',
        details: `管理员更新了会话访问限制`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '会话访问限制已成功更新'
      });
    } catch (error) {
      console.error('设置会话访问限制失败:', error);
      res.status(500).json({
        success: false,
        message: '设置会话访问限制失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话异常行为
   */
  getSessionAnomalies: async (req, res) => {
    try {
      console.log('获取会话异常行为，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;
      const {
        page = 1,
        pageSize = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows: anomalies } = await SessionAnomaly.findAndCountAll({
        where: { sessionId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: {
          anomalies,
          pagination: {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(count / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取会话异常行为失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话异常行为失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话风险评估
   */
  getSessionRiskAssessment: async (req, res) => {
    try {
      console.log('获取会话风险评估，会话ID:', req.params.sessionId);
      
      const { sessionId } = req.params;

      const riskAssessment = await SessionRiskAssessment.findOne({
        where: { sessionId },
        order: [['createdAt', 'DESC']]
      });

      if (!riskAssessment) {
        return res.status(404).json({
          success: false,
          message: '未找到会话风险评估'
        });
      }

      res.json({
        success: true,
        data: riskAssessment
      });
    } catch (error) {
      console.error('获取会话风险评估失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话风险评估失败',
        error: error.message
      });
    }
  },

  /**
   * 导出会话数据
   */
  exportSessionData: async (req, res) => {
    try {
      console.log('导出会话数据，请求参数:', req.query);
      
      const {
        format = 'json',
        fields,
        startDate,
        endDate
      } = req.query;

      // 构建查询条件
      const whereClause = {};

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // 获取会话数据
      const sessions = await AdminSession.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 处理导出数据
      let exportData = sessions.map(session => {
        const sessionData = session.toJSON();
        
        // 如果指定了字段，则只导出指定字段
        if (fields) {
          const fieldArray = fields.split(',');
          const filteredData = {};
          fieldArray.forEach(field => {
            if (sessionData.hasOwnProperty(field)) {
              filteredData[field] = sessionData[field];
            }
          });
          return filteredData;
        }
        
        return sessionData;
      });

      // 根据格式返回数据
      if (format === 'csv') {
        // 简单的CSV格式转换
        const csv = convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="sessions_${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
      } else if (format === 'xlsx') {
        // 这里应该使用专门的库来生成Excel文件，简化处理
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="sessions_${new Date().toISOString().split('T')[0]}.xlsx"`);
        return res.json(exportData); // 实际应该返回Excel文件
      } else {
        // 默认返回JSON格式
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="sessions_${new Date().toISOString().split('T')[0]}.json"`);
        return res.json(exportData);
      }
    } catch (error) {
      console.error('导出会话数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出会话数据失败',
        error: error.message
      });
    }
  },

  /**
   * 获取会话配置
   */
  getSessionConfig: async (req, res) => {
    try {
      console.log('获取会话配置');
      
      // 这里应该从配置表中获取，简化处理
      const config = {
        defaultSessionTimeout: 24 * 60, // 24小时，单位分钟
        maxSessionTimeout: 7 * 24 * 60, // 7天，单位分钟
        enableSessionMonitoring: true,
        enableAnomalyDetection: true,
        riskThresholds: {
          low: 30,
          medium: 60,
          high: 80,
          critical: 95
        },
        anomalyDetection: {
          enableUnusualLocationDetection: true,
          enableUnusualTimeDetection: true,
          enableHighFrequencyDetection: true,
          enableSingleActionDetection: true
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取会话配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取会话配置失败',
        error: error.message
      });
    }
  },

  /**
   * 更新会话配置
   */
  updateSessionConfig: async (req, res) => {
    try {
      console.log('更新会话配置，请求数据:', req.body);
      
      const {
        defaultSessionTimeout,
        maxSessionTimeout,
        enableSessionMonitoring,
        enableAnomalyDetection
      } = req.body;

      // 这里应该更新配置表，简化处理
      const config = {
        defaultSessionTimeout: defaultSessionTimeout || 24 * 60,
        maxSessionTimeout: maxSessionTimeout || 7 * 24 * 60,
        enableSessionMonitoring: enableSessionMonitoring !== undefined ? enableSessionMonitoring : true,
        enableAnomalyDetection: enableAnomalyDetection !== undefined ? enableAnomalyDetection : true
      };

      res.json({
        success: true,
        message: '会话配置已成功更新',
        data: config
      });
    } catch (error) {
      console.error('更新会话配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新会话配置失败',
        error: error.message
      });
    }
  }
};

/**
 * 将数据转换为CSV格式
 * @param {Array} data - 数据数组
 * @returns {string} CSV格式的字符串
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // 获取所有字段名
  const headers = Object.keys(data[0]);
  
  // 创建CSV行
  const csvRows = [];
  
  // 添加标题行
  csvRows.push(headers.join(','));
  
  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = adminSessionController;