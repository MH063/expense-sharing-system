const { pool } = require('../config/db');

/**
 * 数据隔离中间件
 * 验证用户与请求资源的寝室关联关系
 */

/**
 * 验证用户是否属于指定的寝室
 * @param {string} userId - 用户ID
 * @param {string} roomId - 寝室ID
 * @returns {Promise<boolean>} 用户是否属于该寝室
 */
async function isUserInRoom(userId, roomId) {
  try {
    const result = await pool.query(
      'SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('验证用户寝室关系失败:', error);
    return false;
  }
}

/**
 * 验证用户是否为寝室的寝室长
 * @param {string} userId - 用户ID
 * @param {string} roomId - 寝室ID
 * @returns {Promise<boolean>} 用户是否为寝室长
 */
async function isRoomLeader(userId, roomId) {
  try {
    const result = await pool.query(
      "SELECT 1 FROM room_members WHERE user_id = $1 AND room_id = $2 AND role = 'room_leader'",
      [userId, roomId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('验证寝室长身份失败:', error);
    return false;
  }
}

/**
 * 获取资源所属的寝室ID
 * @param {string} tableName - 表名
 * @param {string} resourceId - 资源ID
 * @returns {Promise<string|null>} 寝室ID或null
 */
async function getResourceRoomId(tableName, resourceId) {
  try {
    // 定义资源表与寝室ID字段的映射关系
    const tableRoomMapping = {
      bills: 'room_id',
      expenses: 'room_id',
      payments: 'bill_id', // 需要通过bill_id关联到bills表获取room_id
      bill_participants: 'bill_id', // 需要通过bill_id关联到bills表获取room_id
      expense_splits: 'expense_id', // 需要通过expense_id关联到expenses表获取room_id
      // 可以根据需要添加更多表的映射关系
    };

    if (!tableRoomMapping[tableName]) {
      throw new Error(`不支持的资源表: ${tableName}`);
    }

    const roomIdField = tableRoomMapping[tableName];
    
    // 如果roomIdField直接是room_id，则直接查询
    if (roomIdField === 'room_id') {
      const result = await pool.query(
        `SELECT room_id FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );
      return result.rows.length > 0 ? result.rows[0].room_id : null;
    } else {
      // 如果roomIdField是关联字段，则需要关联查询
      const result = await pool.query(
        `SELECT b.room_id FROM ${tableName} t 
         JOIN bills b ON t.${roomIdField} = b.id 
         WHERE t.id = $1`,
        [resourceId]
      );
      return result.rows.length > 0 ? result.rows[0].room_id : null;
    }
  } catch (error) {
    console.error('获取资源寝室ID失败:', error);
    return null;
  }
}

/**
 * 数据隔离中间件
 * 验证用户是否有权限访问指定的资源
 * @param {Object} options - 配置选项
 * @param {string} options.resourceTable - 资源表名
 * @param {string} options.resourceIdParam - 资源ID在请求参数中的名称
 * @param {boolean} options.requireRoomLeader - 是否要求用户为寝室长
 */
function dataIsolationMiddleware(options = {}) {
  const {
    resourceTable,
    resourceIdParam = 'id',
    requireRoomLeader = false
  } = options;

  return async (req, res, next) => {
    try {
      // 确保用户已通过认证
      if (!req.user || !req.user.sub) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      // 获取资源ID
      const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: '缺少资源ID'
        });
      }

      // 获取资源所属的寝室ID
      const resourceRoomId = await getResourceRoomId(resourceTable, resourceId);
      if (!resourceRoomId) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        });
      }

      // 验证用户是否属于该寝室
      const userInRoom = await isUserInRoom(req.user.sub, resourceRoomId);
      if (!userInRoom) {
        return res.status(403).json({
          success: false,
          message: '无权访问该资源'
        });
      }

      // 如果需要寝室长权限，则验证用户是否为寝室长
      if (requireRoomLeader) {
        const userIsRoomLeader = await isRoomLeader(req.user.sub, resourceRoomId);
        if (!userIsRoomLeader) {
          return res.status(403).json({
            success: false,
            message: '需要寝室长权限'
          });
        }
      }

      // 将寝室ID添加到请求对象中，供后续使用
      req.roomId = resourceRoomId;
      next();
    } catch (error) {
      console.error('数据隔离验证失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
}

module.exports = {
  isUserInRoom,
  isRoomLeader,
  getResourceRoomId,
  dataIsolationMiddleware
};