/**
 * 敏感信息加密存储模块
 * 对敏感字段实施加密存储策略
 */

const crypto = require('crypto');
const { logger } = require('./logger');
const { getSecrets } = require('./enhanced-secrets');

/**
 * 加密配置
 */
const ENCRYPTION_CONFIG = {
  // 算法
  algorithm: 'aes-256-gcm',
  
  // 密钥长度
  keyLength: 32,
  
  // IV长度
  ivLength: 16,
  
  // 认证标签长度
  authTagLength: 16,
  
  // 编码格式
  encoding: 'base64',
  
  // 需要加密的敏感字段
  sensitiveFields: [
    // 用户相关
    'password_hash', // 注意：密码通常是哈希存储，这里是指其他可能需要加密的密码相关字段
    'mfa_secret',
    'recovery_code',
    'security_question_answer',
    
    // 支付相关
    'bank_account',
    'card_number',
    'cvv',
    'expiry_date',
    
    // 个人信息
    'ssn',
    'tax_id',
    'national_id',
    'phone',
    'email',
    
    // 系统相关
    'api_key',
    'api_secret',
    'access_token',
    'refresh_token',
    'private_key',
    'certificate'
  ]
};

/**
 * 加密工具类
 */
class DataEncryption {
  /**
   * 获取加密密钥
   * @returns {Promise<string>} 加密密钥
   */
  static async getEncryptionKey() {
    try {
      // 从增强的密钥管理服务获取加密密钥
      const secrets = await getSecrets();
      
      // 如果有专门的加密密钥，使用它；否则使用JWT密钥派生
      if (secrets.encryption && secrets.encryption.key) {
        return secrets.encryption.key;
      }
      
      // 从JWT密钥派生加密密钥
      const jwtSecret = secrets.jwt.accessSecrets[0];
      return crypto.createHash('sha256').update(jwtSecret).digest('hex').substring(0, 32);
    } catch (error) {
      logger.error('获取加密密钥失败:', error.message);
      
      // 回退到环境变量
      const fallbackKey = process.env.ENCRYPTION_KEY;
      if (!fallbackKey) {
        throw new Error('无法获取加密密钥，请设置ENCRYPTION_KEY环境变量');
      }
      
      return fallbackKey;
    }
  }

  /**
   * 加密数据
   * @param {string} plaintext - 明文数据
   * @returns {Promise<Object>} 加密结果 { iv, authTag, encryptedData }
   */
  static async encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('加密数据必须是非空字符串');
    }
    
    try {
      // 获取加密密钥
      const key = await this.getEncryptionKey();
      
      // 生成随机IV
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      
      // 创建加密器 - 使用createCipheriv而不是createCipher
      const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
      
      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', ENCRYPTION_CONFIG.encoding);
      encrypted += cipher.final(ENCRYPTION_CONFIG.encoding);
      
      // 获取认证标签
      const authTag = cipher.getAuthTag();
      
      return {
        iv: iv.toString(ENCRYPTION_CONFIG.encoding),
        authTag: authTag.toString(ENCRYPTION_CONFIG.encoding),
        encryptedData: encrypted
      };
    } catch (error) {
      logger.error('数据加密失败:', error.message);
      throw new Error(`数据加密失败: ${error.message}`);
    }
  }

  /**
   * 解密数据
   * @param {Object} encryptedData - 加密数据对象 { iv, authTag, encryptedData }
   * @returns {Promise<string>} 解密后的明文
   */
  static async decrypt({ iv, authTag, encryptedData }) {
    if (!iv || !authTag || !encryptedData) {
      throw new Error('加密数据格式不正确');
    }
    
    try {
      // 获取加密密钥
      const key = await this.getEncryptionKey();
      
      // 创建解密器 - 使用createDecipheriv而不是createDecipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, Buffer.from(iv, ENCRYPTION_CONFIG.encoding));
      
      // 设置认证标签
      decipher.setAuthTag(Buffer.from(authTag, ENCRYPTION_CONFIG.encoding));
      
      // 解密数据
      let decrypted = decipher.update(encryptedData, ENCRYPTION_CONFIG.encoding, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('数据解密失败:', error.message);
      throw new Error(`数据解密失败: ${error.message}`);
    }
  }

  /**
   * 加密对象中的敏感字段
   * @param {Object} obj - 原始对象
   * @param {Array<string>} fields - 需要加密的字段列表
   * @returns {Promise<Object>} 加密后的对象
   */
  static async encryptObjectFields(obj, fields = ENCRYPTION_CONFIG.sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const result = { ...obj };
    
    for (const field of fields) {
      if (obj.hasOwnProperty(field) && obj[field]) {
        try {
          // 如果字段值是字符串，直接加密
          if (typeof obj[field] === 'string') {
            const encrypted = await this.encrypt(obj[field]);
            result[field] = JSON.stringify(encrypted);
          }
          // 如果字段值是对象，先序列化再加密
          else if (typeof obj[field] === 'object') {
            const serialized = JSON.stringify(obj[field]);
            const encrypted = await this.encrypt(serialized);
            result[field] = JSON.stringify(encrypted);
          }
        } catch (error) {
          logger.error(`加密字段 ${field} 失败:`, error.message);
          // 保留原始值，避免数据丢失
        }
      }
    }
    
    return result;
  }

  /**
   * 解密对象中的敏感字段
   * @param {Object} obj - 加密对象
   * @param {Array<string>} fields - 需要解密的字段列表
   * @returns {Promise<Object>} 解密后的对象
   */
  static async decryptObjectFields(obj, fields = ENCRYPTION_CONFIG.sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const result = { ...obj };
    
    for (const field of fields) {
      if (obj.hasOwnProperty(field) && obj[field]) {
        try {
          // 尝试解析加密数据
          const encryptedData = JSON.parse(obj[field]);
          
          // 解密数据
          const decrypted = await this.decrypt(encryptedData);
          
          // 尝试反序列化
          try {
            result[field] = JSON.parse(decrypted);
          } catch (e) {
            // 如果反序列化失败，直接使用字符串
            result[field] = decrypted;
          }
        } catch (error) {
          // 如果解析失败，可能是未加密的数据，保留原值
          logger.debug(`字段 ${field} 可能不是加密数据:`, error.message);
        }
      }
    }
    
    return result;
  }

  /**
   * 生成数据哈希（用于验证数据完整性）
   * @param {string} data - 原始数据
   * @returns {string} 数据哈希
   */
  static generateHash(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('哈希数据必须是非空字符串');
    }
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 验证数据哈希
   * @param {string} data - 原始数据
   * @param {string} hash - 预期哈希
   * @returns {boolean} 验证结果
   */
  static verifyHash(data, hash) {
    if (!data || !hash) {
      return false;
    }
    
    const computedHash = this.generateHash(data);
    return computedHash === hash;
  }
}

/**
 * 数据库加密中间件
 * 自动加密和解密数据库中的敏感字段
 */
class DatabaseEncryption {
  /**
   * 创建加密的数据插入语句
   * @param {string} table - 表名
   * @param {Object} data - 插入数据
   * @param {Array<string>} fields - 需要加密的字段
   * @returns {Promise<Object>} { query, values }
   */
  static async createInsertQuery(table, data, fields = ENCRYPTION_CONFIG.sensitiveFields) {
    // 加密敏感字段
    const encryptedData = await DataEncryption.encryptObjectFields(data, fields);
    
    // 构建插入语句
    const columns = Object.keys(encryptedData).join(', ');
    const placeholders = Object.keys(encryptedData).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(encryptedData);
    
    return {
      query: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    };
  }

  /**
   * 创建加密的数据更新语句
   * @param {string} table - 表名
   * @param {Object} data - 更新数据
   * @param {Object} condition - 更新条件
   * @param {Array<string>} fields - 需要加密的字段
   * @returns {Promise<Object>} { query, values }
   */
  static async createUpdateQuery(table, data, condition, fields = ENCRYPTION_CONFIG.sensitiveFields) {
    // 加密敏感字段
    const encryptedData = await DataEncryption.encryptObjectFields(data, fields);
    
    // 构建更新语句
    const setClause = Object.keys(encryptedData).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = [...Object.values(encryptedData)];
    
    // 添加条件参数
    let whereClause = '';
    let paramIndex = values.length + 1;
    
    if (condition) {
      const conditionKeys = Object.keys(condition);
      const conditionParts = conditionKeys.map(key => {
        if (typeof condition[key] === 'object' && condition[key].operator) {
          const op = condition[key].operator;
          values.push(condition[key].value);
          return `${key} ${op} $${paramIndex++}`;
        } else {
          values.push(condition[key]);
          return `${key} = $${paramIndex++}`;
        }
      });
      
      whereClause = `WHERE ${conditionParts.join(' AND ')}`;
    }
    
    return {
      query: `UPDATE ${table} SET ${setClause} ${whereClause} RETURNING *`,
      values
    };
  }

  /**
   * 解密查询结果
   * @param {Array<Object>} rows - 查询结果行
   * @param {Array<string>} fields - 需要解密的字段
   * @returns {Promise<Array<Object>>} 解密后的结果
   */
  static async decryptQueryResults(rows, fields = ENCRYPTION_CONFIG.sensitiveFields) {
    if (!rows || !Array.isArray(rows)) {
      return rows;
    }
    
    const decryptedRows = [];
    
    for (const row of rows) {
      const decryptedRow = await DataEncryption.decryptObjectFields(row, fields);
      decryptedRows.push(decryptedRow);
    }
    
    return decryptedRows;
  }
}

/**
 * 初始化加密模块
 */
async function initializeEncryption() {
  try {
    // 测试加密密钥是否可用
    await DataEncryption.getEncryptionKey();
    
    // 测试加密解密功能
    const testData = 'test-encryption-data';
    const encrypted = await DataEncryption.encrypt(testData);
    const decrypted = await DataEncryption.decrypt(encrypted);
    
    if (decrypted !== testData) {
      throw new Error('加密解密测试失败');
    }
    
    logger.info('加密模块初始化成功');
    return true;
  } catch (error) {
    logger.error('加密模块初始化失败:', error.message);
    return false;
  }
}

module.exports = {
  DataEncryption,
  DatabaseEncryption,
  ENCRYPTION_CONFIG,
  initializeEncryption
};