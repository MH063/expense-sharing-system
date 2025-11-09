const { enhancedAuditService } = require('../services/enhanced-audit-service');
const { authenticateToken, requireRole } = require('../middleware/tokenManager');

// 增强的审计日志控制器
class EnhancedAuditController {
  // 获取用户活动日志
  async getUserActivityLogs(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { 
        userId, 
        username, 
        action, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      // 构建过滤条件
      const filters = {};
      if (userId) filters.userId = userId;
      if (username) filters.username = username;
      if (action) filters.action = action;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      // 构建分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pagination = {
        limit: parseInt(limit),
        offset
      };

      // 获取用户活动日志
      const logs = await enhancedAuditService.getUserActivityLogs(filters, pagination);

      // 获取总数（用于分页）
      const totalCount = await enhancedAuditService.getUserActivityLogs(filters, {}).then(
        result => result.length
      );

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('获取用户活动日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户活动日志失败',
        error: error.message
      });
    }
  }

  // 获取数据变更审计日志
  async getDataChangeAudits(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { 
        userId, 
        username, 
        tableName, 
        operation, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      // 构建过滤条件
      const filters = {};
      if (userId) filters.userId = userId;
      if (username) filters.username = username;
      if (tableName) filters.tableName = tableName;
      if (operation) filters.operation = operation;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      // 构建分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pagination = {
        limit: parseInt(limit),
        offset
      };

      // 获取数据变更审计日志
      const audits = await enhancedAuditService.getDataChangeAudits(filters, pagination);

      // 获取总数（用于分页）
      const totalCount = await enhancedAuditService.getDataChangeAudits(filters, {}).then(
        result => result.length
      );

      res.status(200).json({
        success: true,
        data: {
          audits,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('获取数据变更审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取数据变更审计日志失败',
        error: error.message
      });
    }
  }

  // 获取系统审计日志
  async getSystemAuditLogs(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { 
        eventType, 
        eventName, 
        severity, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      // 构建过滤条件
      const filters = {};
      if (eventType) filters.eventType = eventType;
      if (eventName) filters.eventName = eventName;
      if (severity) filters.severity = severity;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      // 构建分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pagination = {
        limit: parseInt(limit),
        offset
      };

      // 获取系统审计日志
      const logs = await enhancedAuditService.getSystemAuditLogs(filters, pagination);

      // 获取总数（用于分页）
      const totalCount = await enhancedAuditService.getSystemAuditLogs(filters, {}).then(
        result => result.length
      );

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('获取系统审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取系统审计日志失败',
        error: error.message
      });
    }
  }

  // 记录用户活动（用于测试）
  async logUserActivity(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { userId, username, action, details } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // 记录用户活动
      const activityId = await enhancedAuditService.logUserActivity(
        userId, 
        username, 
        action, 
        details, 
        ipAddress, 
        userAgent
      );

      res.status(201).json({
        success: true,
        message: '用户活动记录成功',
        data: {
          activityId
        }
      });
    } catch (error) {
      console.error('记录用户活动失败:', error);
      res.status(500).json({
        success: false,
        message: '记录用户活动失败',
        error: error.message
      });
    }
  }

  // 记录数据变更（用于测试）
  async logDataChange(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { 
        userId, 
        username, 
        tableName, 
        recordId, 
        operation, 
        oldData, 
        newData, 
        details 
      } = req.body;

      // 记录数据变更
      const changeId = await enhancedAuditService.logDataChange(
        userId, 
        username, 
        tableName, 
        recordId, 
        operation, 
        oldData, 
        newData, 
        details
      );

      res.status(201).json({
        success: true,
        message: '数据变更记录成功',
        data: {
          changeId
        }
      });
    } catch (error) {
      console.error('记录数据变更失败:', error);
      res.status(500).json({
        success: false,
        message: '记录数据变更失败',
        error: error.message
      });
    }
  }

  // 记录系统事件（用于测试）
  async logSystemEvent(req, res) {
    try {
      // 验证管理员权限
      if (!requireRole(req.user, ['admin'])) {
        return res.status(403).json({
          success: false,
          message: '需要管理员权限'
        });
      }

      const { eventType, eventName, details, severity = 'info' } = req.body;

      // 记录系统事件
      const eventId = await enhancedAuditService.logSystemEvent(
        eventType, 
        eventName, 
        details, 
        severity
      );

      res.status(201).json({
        success: true,
        message: '系统事件记录成功',
        data: {
          eventId
        }
      });
    } catch (error) {
      console.error('记录系统事件失败:', error);
      res.status(500).json({
        success: false,
        message: '记录系统事件失败',
        error: error.message
      });
    }
  }
}

module.exports = {
  EnhancedAuditController
};