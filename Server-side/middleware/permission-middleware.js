/**
 * 权限验证中间件
 * 用于检查用户是否具有执行特定操作所需的权限
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * 检查用户是否具有特定权限
 * @param {string} permission - 权限代码
 * @returns {Function} - Express中间件函数
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户ID (JWT token中用户ID字段是sub)
      const userId = req.user ? req.user.sub : null;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问'
        });
      }

      // 查询用户权限
      const queryText = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = $2
      `;
      
      const result = await pool.query(queryText, [userId, permission]);
      
      if (result.rows.length === 0) {
        logger.warn(`用户 ${userId} 尝试访问需要权限 ${permission} 的资源但权限不足`);
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所需权限，继续执行
      next();
    } catch (error) {
      logger.error('权限验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 检查用户是否具有任一权限
 * @param {Array} permissions - 权限代码数组
 * @returns {Function} - Express中间件函数
 */
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户ID (JWT token中用户ID字段是sub)
      const userId = req.user ? req.user.sub : null;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问'
        });
      }

      // 查询用户权限
      const queryText = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = ANY($2)
      `;
      
      const result = await pool.query(queryText, [userId, permissions]);
      
      if (result.rows.length === 0) {
        logger.warn(`用户 ${userId} 尝试访问需要权限 ${permissions.join(' 或 ')} 的资源但权限不足`);
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所需权限之一，继续执行
      next();
    } catch (error) {
      logger.error('权限验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 检查用户是否具有所有权限
 * @param {Array} permissions - 权限代码数组
 * @returns {Function} - Express中间件函数
 */
const checkAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户ID (JWT token中用户ID字段是sub)
      const userId = req.user ? req.user.sub : null;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问'
        });
      }

      // 查询用户权限
      const queryText = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = ANY($2)
      `;
      
      const result = await pool.query(queryText, [userId, permissions]);
      
      // 检查用户是否具有所有所需权限
      const userPermissions = result.rows.map(row => row.code);
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => 
          !userPermissions.includes(permission)
        );
        
        logger.warn(`用户 ${userId} 尝试访问需要权限 ${permissions.join(' 和 ')} 的资源但缺少权限 ${missingPermissions.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所有所需权限，继续执行
      next();
    } catch (error) {
      logger.error('权限验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 检查用户是否具有特定角色
 * @param {string|Array} roles - 角色名称或角色名称数组
 * @returns {Function} - Express中间件函数
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户ID (JWT token中用户ID字段是sub)
      const userId = req.user ? req.user.sub : null;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问'
        });
      }

      // 标准化角色参数为数组
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // 查询用户角色
      const queryText = `
        SELECT DISTINCT r.name
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.name = ANY($2)
      `;
      
      const result = await pool.query(queryText, [userId, requiredRoles]);
      
      if (result.rows.length === 0) {
        logger.warn(`用户 ${userId} 尝试访问需要角色 ${requiredRoles.join(' 或 ')} 的资源但角色不符`);
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所需角色，继续执行
      next();
    } catch (error) {
      logger.error('角色验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 检查用户是否为资源所有者或具有特定权限
 * @param {string} resourceIdParam - 请求参数中的资源ID字段名
 * @param {string} permission - 所需权限代码（如果不是资源所有者）
 * @param {string} resourceType - 资源类型（用于查询资源所有者）
 * @returns {Function} - Express中间件函数
 */
const checkOwnershipOrPermission = (resourceIdParam, permission, resourceType) => {
  return async (req, res, next) => {
    try {
      // 从请求中获取用户ID和资源ID (JWT token中用户ID字段是sub)
      const userId = req.user ? req.user.sub : null;
      const resourceId = req.params[resourceIdParam];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问'
        });
      }

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: '缺少资源ID'
        });
      }

      // 检查用户是否为资源所有者
      let isOwner = false;
      
      try {
        let ownerQuery;
        
        switch (resourceType) {
          case 'expense':
            ownerQuery = 'SELECT user_id FROM expenses WHERE id = $1';
            break;
          case 'room':
            ownerQuery = 'SELECT creator_id FROM rooms WHERE id = $1';
            break;
          case 'bill':
            ownerQuery = 'SELECT payer_id FROM bills WHERE id = $1';
            break;
          default:
            return res.status(400).json({
              success: false,
              message: '不支持的资源类型'
            });
        }
        
        const ownerResult = await pool.query(ownerQuery, [resourceId]);
        
        if (ownerResult.rows.length > 0 && ownerResult.rows[0].user_id === userId) {
          isOwner = true;
        }
      } catch (error) {
        logger.error('检查资源所有权失败:', error);
      }
      
      // 如果是资源所有者，继续执行
      if (isOwner) {
        return next();
      }
      
      // 如果不是资源所有者，检查是否具有所需权限
      const permissionQuery = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = $2
      `;
      
      const permissionResult = await pool.query(permissionQuery, [userId, permission]);
      
      if (permissionResult.rows.length === 0) {
        logger.warn(`用户 ${userId} 尝试访问 ${resourceType} ${resourceId} 但既不是所有者也不具有权限 ${permission}`);
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      // 用户具有所需权限，继续执行
      next();
    } catch (error) {
      logger.error('权限验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 获取用户所有权限
 * @param {Object} req - Express请求对象
 * @returns {Promise<Array>} - 用户权限代码数组
 */
const getUserPermissions = async (req) => {
  try {
    // 从请求中获取用户ID (JWT token中用户ID字段是sub)
    const userId = req.user ? req.user.sub : null;
    
    if (!userId) {
      return [];
    }

    const queryText = `
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const result = await pool.query(queryText, [userId]);
    return result.rows.map(row => row.code);
  } catch (error) {
    logger.error('获取用户权限失败:', error);
    return [];
  }
};

/**
 * 获取用户所有角色
 * @param {Object} req - Express请求对象
 * @returns {Promise<Array>} - 用户角色名称数组
 */
const getUserRoles = async (req) => {
  try {
    // 从请求中获取用户ID (JWT token中用户ID字段是sub)
    const userId = req.user ? req.user.sub : null;
    
    if (!userId) {
      return [];
    }

    const queryText = `
      SELECT DISTINCT r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const result = await pool.query(queryText, [userId]);
    return result.rows.map(row => row.name);
  } catch (error) {
    logger.error('获取用户角色失败:', error);
    return [];
  }
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  checkRole,
  checkOwnershipOrPermission,
  getUserPermissions,
  getUserRoles
};