/**
 * 基础控制器类
 * 提供通用的控制器结构和错误处理方法
 */

const winston = require('winston');
const { DatabaseHelper } = require('../utils/database-helper');
const { 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ConflictError,
  DatabaseError
} = require('../middleware/unified-error-handler');

/**
 * 基础控制器类
 * 所有控制器都应该继承此类
 */
class BaseController {
  constructor(controllerName) {
    this.controllerName = controllerName;
    
    // 创建日志记录器
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `logs/${controllerName}-controller.log` 
        })
      ]
    });
  }

  /**
   * 处理控制器方法，统一错误处理和日志记录
   * @param {Function} handler - 控制器方法
   * @returns {Function} 包装后的控制器方法
   */
  handle(handler) {
    return async (req, res, next) => {
      const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();
      
      try {
        // 记录请求开始
        this.logger.info(`[${requestId}] 开始处理${this.controllerName}请求`, {
          requestId,
          method: req.method,
          url: req.url,
          userId: req.user ? req.user.sub : '未认证',
          body: this.sanitizeRequestBody(req.body)
        });
        
        // 执行控制器方法
        const result = await handler.call(this, req, res, next);
        
        // 记录请求完成
        const duration = Date.now() - startTime;
        this.logger.info(`[${requestId}] ${this.controllerName}请求处理成功`, {
          requestId,
          method: req.method,
          url: req.url,
          userId: req.user ? req.user.sub : '未认证',
          duration: `${duration}ms`
        });
        
        return result;
      } catch (error) {
        // 记录请求失败
        const duration = Date.now() - startTime;
        this.logger.error(`[${requestId}] ${this.controllerName}请求处理失败`, {
          requestId,
          method: req.method,
          url: req.url,
          userId: req.user ? req.user.sub : '未认证',
          error: error.message,
          stack: error.stack,
          duration: `${duration}ms`
        });
        
        // 将错误传递给错误处理中间件
        return next(error);
      }
    };
  }

  /**
   * 清理请求体，移除敏感信息
   * @param {Object} body - 请求体
   * @returns {Object} 清理后的请求体
   */
  sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * 验证必填字段
   * @param {Object} data - 要验证的数据
   * @param {Array} requiredFields - 必填字段列表
   * @param {string} requestId - 请求ID
   * @throws {ValidationError} 如果缺少必填字段
   */
  validateRequiredFields(data, requiredFields, requestId) {
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      this.logger.warn(`[${requestId}] 缺少必填字段`, {
        requestId,
        missingFields
      });
      
      throw new ValidationError(`缺少必填字段: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 验证用户权限
   * @param {Object} req - 请求对象
   * @param {string|Array} requiredRoles - 必需的角色
   * @param {string} requestId - 请求ID
   * @throws {UnauthorizedError} 如果用户未认证
   * @throws {ForbiddenError} 如果用户权限不足
   */
  validateUserPermission(req, requiredRoles, requestId) {
    if (!req.user) {
      this.logger.warn(`[${requestId}] 用户未认证`, {
        requestId
      });
      
      throw new UnauthorizedError('用户未认证');
    }
    
    if (requiredRoles) {
      const userRoles = req.user.roles || [];
      const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      const hasPermission = required.some(role => userRoles.includes(role));
      
      if (!hasPermission) {
        this.logger.warn(`[${requestId}] 用户权限不足`, {
          requestId,
          userRoles,
          requiredRoles: required
        });
        
        throw new ForbiddenError('用户权限不足');
      }
    }
  }

  /**
   * 验证资源所有权
   * @param {string} tableName - 表名
   * @param {string} resourceIdField - 资源ID字段名
   * @param {string} resourceOwnerIdField - 资源所有者ID字段名
   * @param {string} resourceId - 资源ID
   * @param {string} userId - 用户ID
   * @param {string} requestId - 请求ID
   * @throws {NotFoundError} 如果资源不存在
   * @throws {ForbiddenError} 如果用户不是资源所有者
   */
  async validateResourceOwnership(
    tableName, 
    resourceIdField, 
    resourceOwnerIdField, 
    resourceId, 
    userId, 
    requestId
  ) {
    const resource = await DatabaseHelper.queryOne(
      `SELECT ${resourceOwnerIdField} FROM ${tableName} WHERE ${resourceIdField} = $1`,
      [resourceId],
      requestId
    );
    
    if (!resource) {
      this.logger.warn(`[${requestId}] 资源不存在`, {
        requestId,
        tableName,
        resourceIdField,
        resourceId
      });
      
      throw new NotFoundError('资源不存在');
    }
    
    if (resource[resourceOwnerIdField] !== userId) {
      this.logger.warn(`[${requestId}] 用户不是资源所有者`, {
        requestId,
        tableName,
        resourceIdField,
        resourceId,
        resourceOwnerId: resource[resourceOwnerIdField],
        userId
      });
      
      throw new ForbiddenError('您没有权限访问此资源');
    }
  }

  /**
   * 验证用户是否是房间成员
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @param {string} requestId - 请求ID
   * @throws {ForbiddenError} 如果用户不是房间成员
   */
  async validateRoomMembership(userId, roomId, requestId) {
    const isMember = await DatabaseHelper.exists(
      'user_room_relations',
      { user_id: userId, room_id: roomId, is_active: true },
      requestId
    );
    
    if (!isMember) {
      this.logger.warn(`[${requestId}] 用户不是房间成员`, {
        requestId,
        userId,
        roomId
      });
      
      throw new ForbiddenError('您不是该房间的成员');
    }
  }

  /**
   * 创建资源
   * @param {string} tableName - 表名
   * @param {Object} data - 要创建的数据
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object>} 创建的资源
   */
  async createResource(tableName, data, requestId) {
    try {
      const resource = await DatabaseHelper.insert(tableName, data, requestId);
      
      this.logger.info(`[${requestId}] 资源创建成功`, {
        requestId,
        tableName,
        resourceId: resource.id
      });
      
      return resource;
    } catch (error) {
      this.logger.error(`[${requestId}] 资源创建失败`, {
        requestId,
        tableName,
        error: error.message
      });
      
      if (error.code === '23505') {
        throw new ConflictError('资源已存在');
      }
      
      throw new DatabaseError('资源创建失败', error);
    }
  }

  /**
   * 获取资源
   * @param {string} tableName - 表名
   * @param {string|Object} where - WHERE条件
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object|null>} 资源，如果不存在返回null
   */
  async getResource(tableName, where, requestId) {
    try {
      const resource = await DatabaseHelper.queryOne(
        `SELECT * FROM ${tableName} WHERE ${typeof where === 'string' ? where : Object.keys(where).map(k => `${k} = $${Object.keys(where).indexOf(k) + 1}`).join(' AND ')}`,
        typeof where === 'string' ? [] : Object.values(where),
        requestId
      );
      
      return resource;
    } catch (error) {
      this.logger.error(`[${requestId}] 资源获取失败`, {
        requestId,
        tableName,
        error: error.message
      });
      
      throw new DatabaseError('资源获取失败', error);
    }
  }

  /**
   * 更新资源
   * @param {string} tableName - 表名
   * @param {Object} data - 要更新的数据
   * @param {Object} where - WHERE条件
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object|null>} 更新后的资源，如果不存在返回null
   */
  async updateResource(tableName, data, where, requestId) {
    try {
      const resource = await DatabaseHelper.update(tableName, data, where, requestId);
      
      if (resource) {
        this.logger.info(`[${requestId}] 资源更新成功`, {
          requestId,
          tableName,
          resourceId: resource.id
        });
      } else {
        this.logger.warn(`[${requestId}] 资源更新失败，资源不存在`, {
          requestId,
          tableName,
          where
        });
      }
      
      return resource;
    } catch (error) {
      this.logger.error(`[${requestId}] 资源更新失败`, {
        requestId,
        tableName,
        error: error.message
      });
      
      if (error.code === '23505') {
        throw new ConflictError('资源已存在');
      }
      
      throw new DatabaseError('资源更新失败', error);
    }
  }

  /**
   * 删除资源
   * @param {string} tableName - 表名
   * @param {Object} where - WHERE条件
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object|null>} 删除的资源，如果不存在返回null
   */
  async deleteResource(tableName, where, requestId) {
    try {
      const resource = await DatabaseHelper.delete(tableName, where, requestId);
      
      if (resource) {
        this.logger.info(`[${requestId}] 资源删除成功`, {
          requestId,
          tableName,
          resourceId: resource.id
        });
      } else {
        this.logger.warn(`[${requestId}] 资源删除失败，资源不存在`, {
          requestId,
          tableName,
          where
        });
      }
      
      return resource;
    } catch (error) {
      this.logger.error(`[${requestId}] 资源删除失败`, {
        requestId,
        tableName,
        error: error.message
      });
      
      throw new DatabaseError('资源删除失败', error);
    }
  }

  /**
   * 分页查询资源
   * @param {string} tableName - 表名
   * @param {Object} options - 查询选项
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object>} 分页查询结果
   */
  async paginateResources(tableName, options = {}, requestId) {
    try {
      const result = await DatabaseHelper.paginate(tableName, options, requestId);
      
      this.logger.info(`[${requestId}] 资源分页查询成功`, {
        requestId,
        tableName,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize
      });
      
      return result;
    } catch (error) {
      this.logger.error(`[${requestId}] 资源分页查询失败`, {
        requestId,
        tableName,
        error: error.message
      });
      
      throw new DatabaseError('资源分页查询失败', error);
    }
  }
}

module.exports = {
  BaseController
};