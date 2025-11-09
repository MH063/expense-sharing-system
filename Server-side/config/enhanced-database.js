/**
 * 增强的数据库服务
 * 整合加密功能，提供安全的数据库操作
 */

const { Pool } = require('pg');
const { SecureLogger } = require('./secure-logger');
const { DatabaseEncryption } = require('./data-encryption');
const { getSecrets } = require('./enhanced-secrets');

/**
 * 数据库连接池配置
 */
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'accounting_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
  // SSL配置
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
};

/**
 * 增强的数据库服务类
 */
class EnhancedDatabaseService {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  /**
   * 初始化数据库连接池
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // 从密钥管理服务获取数据库密码
      const secrets = await getSecrets();
      
      if (secrets.database && secrets.database.password) {
        DB_CONFIG.password = secrets.database.password;
      }

      // 创建连接池
      this.pool = new Pool(DB_CONFIG);

      // 监听连接池事件
      this.pool.on('connect', (client) => {
        SecureLogger.debug('新的数据库客户端已连接');
      });

      this.pool.on('error', (err, client) => {
        SecureLogger.error('数据库连接池错误:', { message: err.message });
      });

      // 测试连接
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.initialized = true;
      SecureLogger.info('数据库连接池初始化成功');
    } catch (error) {
      SecureLogger.error('数据库连接池初始化失败:', { message: error.message });
      throw error;
    }
  }

  /**
   * 执行查询（带加密支持）
   * @param {string} text - SQL查询语句
   * @param {Array} params - 查询参数
   * @param {Object} options - 查询选项 { encryptFields, decryptResults }
   * @returns {Promise<Object>} 查询结果
   */
  async query(text, params = [], options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    let result;

    try {
      const start = Date.now();
      result = await client.query(text, params);
      const duration = Date.now() - start;

      // 记录查询日志（不包含敏感参数）
      const sanitizedParams = this._sanitizeParams(params);
      SecureLogger.debug(`执行查询: ${text}`, { 
        params: sanitizedParams, 
        duration: `${duration}ms`,
        rowCount: result.rowCount 
      });

      // 如果需要解密结果
      if (options.decryptResults && result.rows.length > 0) {
        result.rows = await DatabaseEncryption.decryptQueryResults(
          result.rows, 
          options.encryptFields
        );
      }

      return result;
    } catch (error) {
      SecureLogger.error('数据库查询错误:', { 
        message: error.message,
        query: text, 
        params: this._sanitizeParams(params) 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 执行事务（带加密支持）
   * @param {Function} callback - 事务回调函数
   * @param {Object} options - 事务选项
   * @returns {Promise<any>} 事务结果
   */
  async transaction(callback, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      SecureLogger.debug('事务已开始');

      // 创建事务上下文
      const transactionContext = {
        query: (text, params, queryOptions = {}) => {
          // 合并事务选项和查询选项
          const mergedOptions = { ...options, ...queryOptions };
          
          return client.query(text, params).then(async (result) => {
            // 如果需要解密结果
            if (mergedOptions.decryptResults && result.rows.length > 0) {
              result.rows = await DatabaseEncryption.decryptQueryResults(
                result.rows, 
                mergedOptions.encryptFields
              );
            }
            
            return result;
          });
        }
      };

      // 执行事务回调
      const result = await callback(transactionContext);

      await client.query('COMMIT');
      SecureLogger.debug('事务已提交');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      SecureLogger.error('事务已回滚:', { message: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 创建加密的插入查询
   * @param {string} table - 表名
   * @param {Object} data - 插入数据
   * @param {Array<string>} encryptFields - 需要加密的字段
   * @returns {Promise<Object>} 查询结果
   */
  async insert(table, data, encryptFields) {
    const { query, values } = await DatabaseEncryption.createInsertQuery(
      table, 
      data, 
      encryptFields
    );

    return this.query(query, values);
  }

  /**
   * 创建加密的更新查询
   * @param {string} table - 表名
   * @param {Object} data - 更新数据
   * @param {Object} condition - 更新条件
   * @param {Array<string>} encryptFields - 需要加密的字段
   * @returns {Promise<Object>} 查询结果
   */
  async update(table, data, condition, encryptFields) {
    const { query, values } = await DatabaseEncryption.createUpdateQuery(
      table, 
      data, 
      condition, 
      encryptFields
    );

    return this.query(query, values);
  }

  /**
   * 查询数据（自动解密）
   * @param {string} table - 表名
   * @param {Object} condition - 查询条件
   * @param {Array<string>} decryptFields - 需要解密的字段
   * @returns {Promise<Array>} 查询结果
   */
  async select(table, condition = {}, decryptFields) {
    let query = `SELECT * FROM ${table}`;
    const values = [];
    let paramIndex = 1;

    if (Object.keys(condition).length > 0) {
      const conditionParts = Object.keys(condition).map(key => {
        values.push(condition[key]);
        return `${key} = $${paramIndex++}`;
      });
      
      query += ` WHERE ${conditionParts.join(' AND ')}`;
    }

    const result = await this.query(query, values, { 
      decryptResults: true, 
      encryptFields: decryptFields 
    });

    return result.rows;
  }

  /**
   * 删除数据
   * @param {string} table - 表名
   * @param {Object} condition - 删除条件
   * @returns {Promise<Object>} 查询结果
   */
  async delete(table, condition) {
    let query = `DELETE FROM ${table}`;
    const values = [];
    let paramIndex = 1;

    if (Object.keys(condition).length > 0) {
      const conditionParts = Object.keys(condition).map(key => {
        values.push(condition[key]);
        return `${key} = $${paramIndex++}`;
      });
      
      query += ` WHERE ${conditionParts.join(' AND ')}`;
    }

    return this.query(query, values);
  }

  /**
   * 关闭数据库连接池
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      SecureLogger.info('数据库连接池已关闭');
    }
  }

  /**
   * 清理查询参数中的敏感信息
   * @param {Array} params - 查询参数
   * @returns {Array} 清理后的参数
   */
  _sanitizeParams(params) {
    if (!params || !Array.isArray(params)) {
      return params;
    }

    return params.map(param => {
      if (typeof param === 'string') {
        // 如果参数包含敏感信息，用占位符替换
        if (param.includes('password') || 
            param.includes('token') || 
            param.includes('secret') ||
            param.length > 50) {
          return '[REDACTED]';
        }
      }
      return param;
    });
  }
}

// 创建单例实例
const dbService = new EnhancedDatabaseService();

// 初始化数据库服务
dbService.initialize().catch(error => {
  SecureLogger.error('数据库服务初始化失败:', { message: error.message });
});

module.exports = {
  dbService,
  EnhancedDatabaseService
};