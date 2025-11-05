/**
 * 数据库服务基类
 * 提供基础的数据库操作方法
 */

// // 临时注释掉数据库配置导入，用于排查启动问题
// const { pool } = require('../config/db');
// console.log('数据库配置已临时禁用，用于排查启动问题');

// 临时创建一个模拟的pool对象，用于排查启动问题
const mockPool = {
  query: async (sql, params) => {
    console.log('模拟数据库查询:', sql, params);
    return { rows: [], rowCount: 0 };
  }
};

class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = mockPool; // 使用模拟的pool对象
  }

  /**
   * 执行查询
   * @param {string} sql - SQL查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise<Object>} 查询结果
   */
  async query(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result;
    } catch (error) {
      console.error(`查询错误 (${this.tableName}):`, error);
      throw error;
    }
  }

  /**
   * 根据ID查找记录
   * @param {string} id - 记录ID
   * @returns {Promise<Object|null>} 查找结果
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query(sql, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 查找所有记录
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 查找结果
   */
  async findAll(options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // 添加WHERE条件
    if (options.where) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(options.where)) {
        if (typeof value === 'object' && value !== null) {
          // 处理操作符，如 { like: '%value%' }
          for (const [operator, operatorValue] of Object.entries(value)) {
            switch (operator) {
              case 'like':
                whereConditions.push(`${key} LIKE $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'gt':
                whereConditions.push(`${key} > $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'gte':
                whereConditions.push(`${key} >= $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'lt':
                whereConditions.push(`${key} < $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'lte':
                whereConditions.push(`${key} <= $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'ne':
                whereConditions.push(`${key} != $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'in':
                if (Array.isArray(operatorValue)) {
                  const placeholders = operatorValue.map(() => `$${paramIndex++}`).join(', ');
                  whereConditions.push(`${key} IN (${placeholders})`);
                  params.push(...operatorValue);
                }
                break;
            }
          }
        } else {
          whereConditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 添加ORDER BY
    if (options.order) {
      const orderConditions = [];
      for (const [field, direction] of Object.entries(options.order)) {
        orderConditions.push(`${field} ${direction.toUpperCase()}`);
      }
      sql += ` ORDER BY ${orderConditions.join(', ')}`;
    }

    // 添加LIMIT
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    // 添加OFFSET
    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * 查找单条记录
   * @param {Object} options - 查询选项
   * @returns {Promise<Object|null>} 查找结果
   */
  async findOne(options = {}) {
    const results = await this.findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 创建新记录
   * @param {Object} data - 记录数据
   * @returns {Promise<Object>} 创建的记录
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * 更新记录
   * @param {string} id - 记录ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object|null>} 更新后的记录
   */
  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await this.query(sql, [id, ...values]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 删除记录
   * @param {string} id - 记录ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query(sql, [id]);
    return result.rowCount > 0;
  }

  /**
   * 计算记录数
   * @param {Object} options - 查询选项
   * @returns {Promise<number>} 记录数
   */
  async count(options = {}) {
    let sql = `SELECT COUNT(*) FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // 添加WHERE条件
    if (options.where) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(options.where)) {
        if (typeof value === 'object' && value !== null) {
          // 处理操作符
          for (const [operator, operatorValue] of Object.entries(value)) {
            switch (operator) {
              case 'like':
                whereConditions.push(`${key} LIKE $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'gt':
                whereConditions.push(`${key} > $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'gte':
                whereConditions.push(`${key} >= $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'lt':
                whereConditions.push(`${key} < $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'lte':
                whereConditions.push(`${key} <= $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'ne':
                whereConditions.push(`${key} != $${paramIndex}`);
                params.push(operatorValue);
                paramIndex++;
                break;
              case 'in':
                if (Array.isArray(operatorValue)) {
                  const placeholders = operatorValue.map(() => `$${paramIndex++}`).join(', ');
                  whereConditions.push(`${key} IN (${placeholders})`);
                  params.push(...operatorValue);
                }
                break;
            }
          }
        } else {
          whereConditions.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await this.query(sql, params);
    return parseInt(result.rows[0].count);
  }
}

module.exports = BaseService;