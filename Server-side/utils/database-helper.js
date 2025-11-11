/**
 * 数据库操作辅助函数
 * 提供通用的数据库操作方法，减少代码重复
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { DatabaseError, NotFoundError, ConflictError } = require('../middleware/unified-error-handler');

/**
 * 数据库操作辅助类
 */
class DatabaseHelper {
  /**
   * 执行查询并返回结果
   * @param {string} query - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<Object>} 查询结果
   */
  static async query(query, params = [], requestId = null) {
    const startTime = Date.now();
    try {
      const result = await pool.query(query, params);
      const duration = Date.now() - startTime;
      
      if (requestId) {
        logger.debug(`[${requestId}] 数据库查询成功`, {
          requestId,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          params: params.length > 0 ? params : undefined,
          rowCount: result.rowCount,
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (requestId) {
        logger.error(`[${requestId}] 数据库查询失败`, {
          requestId,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          params: params.length > 0 ? params : undefined,
          error: error.message,
          duration: `${duration}ms`
        });
      }
      
      throw new DatabaseError('数据库查询失败', error);
    }
  }

  /**
   * 查询单条记录
   * @param {string} query - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<Object|null>} 查询结果，如果未找到返回null
   */
  static async queryOne(query, params = [], requestId = null) {
    const result = await this.query(query, params, requestId);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 查询多条记录
   * @param {string} query - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<Array>} 查询结果数组
   */
  static async queryMany(query, params = [], requestId = null) {
    const result = await this.query(query, params, requestId);
    return result.rows;
  }

  /**
   * 插入记录并返回插入的记录
   * @param {string} tableName - 表名
   * @param {Object} data - 要插入的数据
   * @param {string} requestId - 请求ID，用于日志追踪
   * @param {Array} returningFields - 要返回的字段，默认返回所有字段
   * @returns {Promise<Object>} 插入的记录
   */
  static async insert(tableName, data, requestId = null, returningFields = ['*']) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
    const returningClause = returningFields.join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING ${returningClause}
    `;
    
    const result = await this.query(query, values, requestId);
    return result.rows[0];
  }

  /**
   * 更新记录并返回更新的记录
   * @param {string} tableName - 表名
   * @param {Object} data - 要更新的数据
   * @param {Object} where - WHERE条件
   * @param {string} requestId - 请求ID，用于日志追踪
   * @param {Array} returningFields - 要返回的字段，默认返回所有字段
   * @returns {Promise<Object|null>} 更新的记录，如果未找到返回null
   */
  static async update(tableName, data, where, requestId = null, returningFields = ['*']) {
    const updateFields = Object.keys(data);
    const updateValues = Object.values(data);
    const whereFields = Object.keys(where);
    const whereValues = Object.values(where);
    
    // 构建SET子句
    const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    // 构建WHERE子句
    const whereClause = whereFields.map((field, index) => `${field} = $${updateFields.length + index + 1}`).join(' AND ');
    
    // 合并参数值
    const allValues = [...updateValues, ...whereValues];
    
    const returningClause = returningFields.join(', ');
    
    const query = `
      UPDATE ${tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause}
      RETURNING ${returningClause}
    `;
    
    const result = await this.query(query, allValues, requestId);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 删除记录并返回删除的记录
   * @param {string} tableName - 表名
   * @param {Object} where - WHERE条件
   * @param {string} requestId - 请求ID，用于日志追踪
   * @param {Array} returningFields - 要返回的字段，默认返回所有字段
   * @returns {Promise<Object|null>} 删除的记录，如果未找到返回null
   */
  static async delete(tableName, where, requestId = null, returningFields = ['*']) {
    const whereFields = Object.keys(where);
    const whereValues = Object.values(where);
    
    // 构建WHERE子句
    const whereClause = whereFields.map((field, index) => `${field} = $${index + 1}`).join(' AND ');
    
    const returningClause = returningFields.join(', ');
    
    const query = `
      DELETE FROM ${tableName}
      WHERE ${whereClause}
      RETURNING ${returningClause}
    `;
    
    const result = await this.query(query, whereValues, requestId);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 检查记录是否存在
   * @param {string} tableName - 表名
   * @param {Object} where - WHERE条件
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<boolean>} 记录是否存在
   */
  static async exists(tableName, where, requestId = null) {
    const whereFields = Object.keys(where);
    const whereValues = Object.values(where);
    
    // 构建WHERE子句
    const whereClause = whereFields.map((field, index) => `${field} = $${index + 1}`).join(' AND ');
    
    const query = `
      SELECT 1 FROM ${tableName}
      WHERE ${whereClause}
      LIMIT 1
    `;
    
    const result = await this.query(query, whereValues, requestId);
    return result.rows.length > 0;
  }

  /**
   * 查询记录数量
   * @param {string} tableName - 表名
   * @param {Object} where - WHERE条件，可选
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<number>} 记录数量
   */
  static async count(tableName, where = {}, requestId = null) {
    let query = `SELECT COUNT(*) as count FROM ${tableName}`;
    let params = [];
    
    if (Object.keys(where).length > 0) {
      const whereFields = Object.keys(where);
      const whereValues = Object.values(where);
      
      // 构建WHERE子句
      const whereClause = whereFields.map((field, index) => `${field} = $${index + 1}`).join(' AND ');
      
      query += ` WHERE ${whereClause}`;
      params = whereValues;
    }
    
    const result = await this.query(query, params, requestId);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * 分页查询
   * @param {string} tableName - 表名
   * @param {Object} options - 查询选项
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<Object>} 分页查询结果
   */
  static async paginate(tableName, options = {}, requestId = null) {
    const {
      where = {},
      orderBy = 'id',
      order = 'ASC',
      page = 1,
      pageSize = 10,
      fields = ['*']
    } = options;
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建WHERE子句
    let whereClause = '';
    let params = [];
    
    if (Object.keys(where).length > 0) {
      const whereFields = Object.keys(where);
      const whereValues = Object.values(where);
      
      whereClause = `WHERE ${whereFields.map((field, index) => `${field} = $${index + 1}`).join(' AND ')}`;
      params = whereValues;
    }
    
    // 查询总记录数
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const countResult = await this.query(countQuery, params, requestId);
    const total = parseInt(countResult.rows[0].total, 10);
    
    // 查询分页数据
    const fieldsClause = Array.isArray(fields) ? fields.join(', ') : fields;
    const dataQuery = `
      SELECT ${fieldsClause} 
      FROM ${tableName} 
      ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const dataResult = await this.query(dataQuery, [...params, pageSize, offset], requestId);
    
    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      items: dataResult.rows,
      pagination: {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 执行事务
   * @param {Function} callback - 事务回调函数，接收client作为参数
   * @param {string} requestId - 请求ID，用于日志追踪
   * @returns {Promise<any>} 事务执行结果
   */
  static async transaction(callback, requestId = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (requestId) {
        logger.debug(`[${requestId}] 开始数据库事务`);
      }
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      if (requestId) {
        logger.debug(`[${requestId}] 数据库事务提交成功`);
      }
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      
      if (requestId) {
        logger.error(`[${requestId}] 数据库事务回滚`, {
          requestId,
          error: error.message
        });
      }
      
      throw new DatabaseError('事务执行失败', error);
    } finally {
      client.release();
    }
  }
}

module.exports = {
  DatabaseHelper
};