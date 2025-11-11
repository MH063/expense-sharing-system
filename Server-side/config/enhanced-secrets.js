/**
 * 增强的密钥管理服务
 * 整合Vault服务和本地密钥管理，支持自动密钥轮换和非对称加密
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const { vaultService } = require('./vault');

// 密钥轮换配置
const KEY_ROTATION_CONFIG = {
  // JWT访问令牌密钥轮换周期（毫秒）- 30天
  accessTokenRotationMs: 30 * 24 * 60 * 60 * 1000,
  // JWT刷新令牌密钥轮换周期（毫秒）- 90天
  refreshTokenRotationMs: 90 * 24 * 60 * 60 * 1000,
  // RSA密钥对轮换周期（毫秒）- 180天
  rsaKeyRotationMs: 180 * 24 * 60 * 60 * 1000
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
 * 从环境变量加载密钥
 * @param {string} envVarName - 环境变量名称
 * @param {number} keyLength - 密钥长度（字节）
 * @returns {string} 密钥
 */
function loadKey(envVarName, keyLength = 32) {
  // 从环境变量加载
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }

  // 如果环境变量不存在，生成新的密钥（但不保存到文件）
  const newKey = generateSecureKey(keyLength);
  logger.warn(`${envVarName}环境变量未设置，生成临时密钥。请设置${envVarName}环境变量以避免密钥重新生成`);
  return newKey;
}

/**
 * 生成RSA密钥对
 * @returns {Object} 包含公钥和私钥的对象
 */
function generateRsaKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

/**
 * 从环境变量加载RSA密钥对
 * @returns {Object|null} 包含公钥和私钥的对象，如果不存在则返回null
 */
function loadRsaKeyPair() {
  const publicKey = process.env.RSA_PUBLIC_KEY;
  const privateKey = process.env.RSA_PRIVATE_KEY;
  
  if (publicKey && privateKey) {
    logger.info('RSA密钥对从环境变量加载成功');
    return { publicKey, privateKey };
  }
  
  logger.warn('RSA密钥对未在环境变量中配置');
  return null;
}

/**
 * 保存RSA密钥对到文件
 * @param {string} publicKey - 公钥
 * @param {string} privateKey - 私钥
 */
function saveRsaKeyPair(publicKey, privateKey) {
  const publicKeyPath = path.join(__dirname, 'rsa-public.key');
  const privateKeyPath = path.join(__dirname, 'rsa-private.key');
  
  try {
    fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
    fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
    
    // 设置文件权限为仅所有者可读写
    fs.chmodSync(publicKeyPath, 0o600);
    fs.chmodSync(privateKeyPath, 0o600);
    
    logger.info('RSA密钥对已保存到文件');
  } catch (error) {
    logger.error('保存RSA密钥对到文件失败:', error.message);
  }
}

/**
 * 增强的密钥轮换管理器
 */
class EnhancedKeyRotationManager {
  constructor() {
    this.keys = {
      accessTokens: [],
      refreshTokens: [],
      rsa: { publicKey: null, privateKey: null }
    };
    this.lastRotation = {
      accessTokens: 0,
      refreshTokens: 0,
      rsa: 0
    };
    this.vaultEnabled = false;
  }

  /**
   * 初始化密钥轮换管理器
   */
  async initialize() {
    try {
      // 初始化Vault服务
      await vaultService.initialize();
      this.vaultEnabled = vaultService.enabled;
      
      if (this.vaultEnabled) {
        logger.info('使用Vault服务管理密钥');
        await this.loadKeysFromVault();
      } else {
        logger.info('Vault服务不可用，使用本地密钥管理');
        await this.loadKeysFromLocal();
      }
      
      // 启动自动轮换定时器
      this.startRotationTimers();
      
      logger.info('增强密钥轮换管理器初始化完成');
    } catch (error) {
      logger.error('增强密钥轮换管理器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 从Vault加载密钥
   */
  async loadKeysFromVault() {
    try {
      // 获取JWT密钥
      this.keys.accessTokens = await vaultService.getAccessKeys();
      this.keys.refreshTokens = await vaultService.getRefreshKeys();
      
      // 获取RSA密钥对
      this.keys.rsa.publicKey = await vaultService.getPublicKey();
      this.keys.rsa.privateKey = await vaultService.getPrivateKey();
      
      // 如果RSA密钥不存在，生成并保存到Vault
      if (!this.keys.rsa.publicKey || !this.keys.rsa.privateKey) {
        await this.generateAndSaveRsaKeys();
      }
      
      logger.info('从Vault加载密钥成功');
    } catch (error) {
      logger.error('从Vault加载密钥失败:', error.message);
      throw error;
    }
  }

  /**
   * 从环境变量加载密钥
   */
  async loadKeysFromLocal() {
    try {
      // 加载JWT访问令牌密钥
      const accessTokenSecrets = (process.env.JWT_SECRETS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (accessTokenSecrets.length > 0) {
        this.keys.accessTokens = accessTokenSecrets;
      } else {
        this.keys.accessTokens = [loadKey('JWT_SECRET', 32)];
      }

      // 加载JWT刷新令牌密钥
      const refreshTokenSecrets = (process.env.JWT_REFRESH_SECRETS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (refreshTokenSecrets.length > 0) {
        this.keys.refreshTokens = refreshTokenSecrets;
      } else {
        this.keys.refreshTokens = [loadKey('JWT_REFRESH_SECRET', 32)];
      }

      // 加载RSA密钥对
      const rsaKeyPair = loadRsaKeyPair();
      if (rsaKeyPair) {
        this.keys.rsa = rsaKeyPair;
      } else {
        // 如果RSA密钥不存在，仅生成在内存中
        const { publicKey, privateKey } = generateRsaKeyPair();
        this.keys.rsa = { publicKey, privateKey };
        logger.warn('RSA密钥对未配置，将在内存中生成临时密钥对。请设置RSA_PUBLIC_KEY和RSA_PRIVATE_KEY环境变量');
      }
      
      logger.info('从环境变量加载密钥成功');
    } catch (error) {
      logger.error('从环境变量加载密钥失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成并保存RSA密钥对
   */
  async generateAndSaveRsaKeys() {
    const { publicKey, privateKey } = generateRsaKeyPair();
    this.keys.rsa = { publicKey, privateKey };
    
    if (this.vaultEnabled) {
      await vaultService.writeSecret(`${vaultService.secretPath}/rsa`, {
        public_key: publicKey,
        private_key: privateKey
      });
      logger.info('RSA密钥对已生成并保存到Vault');
    } else {
      saveRsaKeyPair(publicKey, privateKey);
      logger.info('RSA密钥对已生成并保存到本地');
    }
  }

  /**
   * 启动自动轮换定时器
   */
  startRotationTimers() {
    // JWT访问令牌密钥轮换定时器
    setInterval(async () => {
      if (this.shouldRotateKeys('accessTokens')) {
        await this.rotateKeys('accessTokens');
      }
    }, 24 * 60 * 60 * 1000); // 每天检查一次
    
    // JWT刷新令牌密钥轮换定时器
    setInterval(async () => {
      if (this.shouldRotateKeys('refreshTokens')) {
        await this.rotateKeys('refreshTokens');
      }
    }, 24 * 60 * 60 * 1000); // 每天检查一次
    
    // RSA密钥对轮换定时器
    setInterval(async () => {
      if (this.shouldRotateKeys('rsa')) {
        await this.rotateKeys('rsa');
      }
    }, 24 * 60 * 60 * 1000); // 每天检查一次
    
    logger.info('自动密钥轮换定时器已启动');
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
   * 获取RSA公钥
   * @returns {string|null} RSA公钥
   */
  getRsaPublicKey() {
    return this.keys.rsa.publicKey;
  }

  /**
   * 获取RSA私钥
   * @returns {string|null} RSA私钥
   */
  getRsaPrivateKey() {
    return this.keys.rsa.privateKey;
  }

  /**
   * 检查是否需要轮换密钥
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens' | 'rsa')
   * @returns {boolean} 是否需要轮换
   */
  shouldRotateKeys(keyType) {
    const now = Date.now();
    const lastRotationTime = this.lastRotation[keyType];
    
    let rotationInterval;
    switch (keyType) {
      case 'accessTokens':
        rotationInterval = KEY_ROTATION_CONFIG.accessTokenRotationMs;
        break;
      case 'refreshTokens':
        rotationInterval = KEY_ROTATION_CONFIG.refreshTokenRotationMs;
        break;
      case 'rsa':
        rotationInterval = KEY_ROTATION_CONFIG.rsaKeyRotationMs;
        break;
      default:
        return false;
    }

    return (now - lastRotationTime) > rotationInterval;
  }

  /**
   * 轮换密钥
   * @param {string} keyType - 密钥类型 ('accessTokens' | 'refreshTokens' | 'rsa')
   */
  async rotateKeys(keyType) {
    logger.info(`开始轮换${keyType}密钥`);
    
    try {
      switch (keyType) {
        case 'accessTokens':
          await this.rotateAccessKeys();
          break;
        case 'refreshTokens':
          await this.rotateRefreshKeys();
          break;
        case 'rsa':
          await this.rotateRsaKeys();
          break;
        default:
          throw new Error(`未知的密钥类型: ${keyType}`);
      }
      
      this.lastRotation[keyType] = Date.now();
      logger.info(`${keyType}密钥轮换完成`);
    } catch (error) {
      logger.error(`${keyType}密钥轮换失败:`, error.message);
      throw error;
    }
  }

  /**
   * 轮换JWT访问密钥
   */
  async rotateAccessKeys() {
    const newKey = generateSecureKey(32);
    
    // 将新密钥添加到密钥列表的开头
    this.keys.accessTokens.unshift(newKey);
    
    // 保留最多3个旧密钥用于验证
    if (this.keys.accessTokens.length > 3) {
      this.keys.accessTokens = this.keys.accessTokens.slice(0, 3);
    }
    
    if (this.vaultEnabled) {
      await vaultService.writeSecret(`${vaultService.secretPath}/jwt`, {
        access_keys: this.keys.accessTokens,
        refresh_keys: this.keys.refreshTokens
      });
    }
    
    logger.info('JWT访问密钥轮换完成，当前密钥数量:', this.keys.accessTokens.length);
  }

  /**
   * 轮换JWT刷新密钥
   */
  async rotateRefreshKeys() {
    const newKey = generateSecureKey(32);
    
    // 将新密钥添加到密钥列表的开头
    this.keys.refreshTokens.unshift(newKey);
    
    // 保留最多3个旧密钥用于验证
    if (this.keys.refreshTokens.length > 3) {
      this.keys.refreshTokens = this.keys.refreshTokens.slice(0, 3);
    }
    
    if (this.vaultEnabled) {
      await vaultService.writeSecret(`${vaultService.secretPath}/jwt`, {
        access_keys: this.keys.accessTokens,
        refresh_keys: this.keys.refreshTokens
      });
    }
    
    logger.info('JWT刷新密钥轮换完成，当前密钥数量:', this.keys.refreshTokens.length);
  }

  /**
   * 轮换RSA密钥对
   */
  async rotateRsaKeys() {
    const { publicKey, privateKey } = generateRsaKeyPair();
    this.keys.rsa = { publicKey, privateKey };
    
    if (this.vaultEnabled) {
      await vaultService.writeSecret(`${vaultService.secretPath}/rsa`, {
        public_key: publicKey,
        private_key: privateKey
      });
    } else {
      saveRsaKeyPair(publicKey, privateKey);
    }
    
    logger.info('RSA密钥对轮换完成');
  }
}

// 创建增强密钥轮换管理器实例
const enhancedKeyRotationManager = new EnhancedKeyRotationManager();

/**
 * 获取当前密钥配置
 * @returns {Object} 密钥配置对象
 */
async function getSecrets() {
  // 确保管理器已初始化
  if (enhancedKeyRotationManager.vaultEnabled === undefined) {
    await enhancedKeyRotationManager.initialize();
  }
  
  const accessKeys = enhancedKeyRotationManager.getCurrentKeys('accessTokens');
  const refreshKeys = enhancedKeyRotationManager.getCurrentKeys('refreshTokens');
  const rsaPublicKey = enhancedKeyRotationManager.getRsaPublicKey();
  const rsaPrivateKey = enhancedKeyRotationManager.getRsaPrivateKey();
  
  // 确保密钥格式正确
  return {
    jwt: {
      accessSecrets: Array.isArray(accessKeys) && accessKeys.length > 0 ? accessKeys : [generateSecureKey(32)],
      refreshSecrets: Array.isArray(refreshKeys) && refreshKeys.length > 0 ? refreshKeys : [generateSecureKey(32)],
      algorithm: rsaPublicKey && rsaPrivateKey ? 'RS256' : 'HS512',
      rsaPublicKey: rsaPublicKey || null,
      rsaPrivateKey: rsaPrivateKey || null
    }
  };
}

module.exports = {
  loadKey,
  generateSecureKey,
  generateRsaKeyPair,
  enhancedKeyRotationManager,
  KEY_ROTATION_CONFIG,
  getSecrets
};