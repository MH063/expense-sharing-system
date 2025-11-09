/**
 * 安全密钥管理配置
 * 负责管理应用中的各种密钥和证书
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

// 密钥轮换配置
const KEY_ROTATION_CONFIG = {
  // JWT访问令牌密钥轮换周期（毫秒）- 30天
  accessTokenRotationMs: 30 * 24 * 60 * 60 * 1000,
  // JWT刷新令牌密钥轮换周期（毫秒）- 90天
  refreshTokenRotationMs: 90 * 24 * 60 * 60 * 1000
};

/**
 * 生成安全的随机密钥
 * @param {number} length - 密钥长度（字节）
 * @returns {string} Base64编码的随机密钥
 */
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * 从环境变量或文件加载密钥
 * @param {string} envVarName - 环境变量名称
 * @param {string} fileName - 文件名（相对于config目录）
 * @param {number} keyLength - 密钥长度（字节）
 * @returns {string} 密钥
 */
function loadKey(envVarName, fileName, keyLength = 32) {
  // 首先尝试从环境变量加载
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }

  // 如果环境变量不存在，尝试从文件加载
  const filePath = path.join(__dirname, fileName);
  try {
    if (fs.existsSync(filePath)) {
      const key = fs.readFileSync(filePath, 'utf8').trim();
      if (key) {
        logger.info(`${envVarName}密钥从文件加载成功`);
        return key;
      }
    }
  } catch (error) {
    logger.warn(`从文件加载${envVarName}密钥失败:`, error.message);
  }

  // 如果都不存在，生成新的密钥并保存到文件
  const newKey = generateSecureKey(keyLength);
  try {
    fs.writeFileSync(filePath, newKey, 'utf8');
    fs.chmodSync(filePath, 0o600); // 设置文件权限为仅所有者可读写
    logger.info(`新的${envVarName}密钥已生成并保存到文件`);
  } catch (error) {
    logger.error(`保存${envVarName}密钥到文件失败:`, error.message);
  }

  return newKey;
}

/**
 * 密钥轮换管理器
 */
class KeyRotationManager {
  constructor() {
    this.keys = {
      accessTokens: [],
      refreshTokens: []
    };
    this.lastRotation = {
      accessTokens: 0,
      refreshTokens: 0
    };
  }

  /**
   * 初始化密钥轮换管理器
   */
  initialize() {
    // 加载JWT访问令牌密钥
    const accessTokenSecrets = (process.env.JWT_SECRETS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (accessTokenSecrets.length > 0) {
      this.keys.accessTokens = accessTokenSecrets;
    } else {
      // 如果没有配置，使用默认密钥
      this.keys.accessTokens = [loadKey('JWT_SECRET', 'jwt-secret.key', 32)];
    }

    // 加载JWT刷新令牌密钥
    const refreshTokenSecrets = (process.env.JWT_REFRESH_SECRETS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (refreshTokenSecrets.length > 0) {
      this.keys.refreshTokens = refreshTokenSecrets;
    } else {
      // 如果没有配置，使用默认密钥
      this.keys.refreshTokens = [loadKey('JWT_REFRESH_SECRET', 'jwt-refresh-secret.key', 32)];
    }

    // 设置上次轮换时间
    this.lastRotation.accessTokens = Date.now();
    this.lastRotation.refreshTokens = Date.now();

    logger.info('密钥轮换管理器初始化完成');
  }

  /**
   * 获取当前有效的密钥列表
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens')
   * @returns {Array<string>} 当前有效的密钥列表
   */
  getCurrentKeys(keyType) {
    return this.keys[keyType] || [];
  }

  /**
   * 获取用于签名的主要密钥
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens')
   * @returns {string} 主要密钥
   */
  getPrimarySigningKey(keyType) {
    const keys = this.getCurrentKeys(keyType);
    return keys[0] || '';
  }

  /**
   * 获取用于验证的所有密钥（包括旧密钥）
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens')
   * @returns {Array<string>} 用于验证的所有密钥
   */
  getVerificationKeys(keyType) {
    return this.getCurrentKeys(keyType);
  }

  /**
   * 检查是否需要轮换密钥
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens')
   * @returns {boolean} 是否需要轮换
   */
  shouldRotateKeys(keyType) {
    const now = Date.now();
    const lastRotationTime = this.lastRotation[keyType];
    const rotationInterval = keyType === 'accessTokens' 
      ? KEY_ROTATION_CONFIG.accessTokenRotationMs 
      : KEY_ROTATION_CONFIG.refreshTokenRotationMs;

    return (now - lastRotationTime) > rotationInterval;
  }

  /**
   * 轮换密钥
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens')
   */
  rotateKeys(keyType) {
    if (!this.shouldRotateKeys(keyType)) {
      return;
    }

    logger.info(`开始轮换${keyType}密钥`);
    
    // 生成新的密钥
    const newKey = generateSecureKey(32);
    
    // 将新密钥添加到密钥列表的开头
    this.keys[keyType].unshift(newKey);
    
    // 保留最多3个旧密钥用于验证
    if (this.keys[keyType].length > 3) {
      this.keys[keyType] = this.keys[keyType].slice(0, 3);
    }
    
    // 更新轮换时间
    this.lastRotation[keyType] = Date.now();
    
    logger.info(`${keyType}密钥轮换完成，当前密钥数量: ${this.keys[keyType].length}`);
  }
}

// 创建密钥轮换管理器实例
const keyRotationManager = new KeyRotationManager();

// 初始化密钥轮换管理器
keyRotationManager.initialize();

/**
 * 获取当前密钥配置
 * @returns {Object} 密钥配置对象
 */
function getSecrets() {
  return {
    jwt: {
      accessSecrets: keyRotationManager.getCurrentKeys('accessTokens'),
      refreshSecrets: keyRotationManager.getCurrentKeys('refreshTokens'),
      algorithm: 'HS512'
    }
  };
}

module.exports = {
  loadKey,
  generateSecureKey,
  keyRotationManager,
  KEY_ROTATION_CONFIG,
  getSecrets
};