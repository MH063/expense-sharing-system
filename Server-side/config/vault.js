/**
 * HashiCorp Vault密钥管理服务
 * 提供集中化、安全化的密钥存储与访问控制
 */

const axios = require('axios');
const { logger } = require('./logger');

class VaultService {
  constructor() {
    this.vaultUrl = process.env.VAULT_URL || 'http://localhost:8000';
    this.vaultToken = process.env.VAULT_TOKEN;
    this.secretPath = process.env.VAULT_SECRET_PATH || 'secret/jwt-keys';
    this.enabled = process.env.VAULT_ENABLED === 'true';
    
    // 缓存密钥，减少Vault访问
    this.keyCache = {
      accessKeys: [],
      refreshKeys: [],
      privateKey: null,
      publicKey: null,
      lastUpdated: 0
    };
    
    // 缓存有效期（毫秒）
    this.cacheValidityMs = 5 * 60 * 1000; // 5分钟
  }

  /**
   * 初始化Vault服务
   */
  async initialize() {
    if (!this.enabled) {
      logger.info('Vault服务未启用，使用本地密钥管理');
      return;
    }

    try {
      // 验证Vault连接
      await this.verifyVaultConnection();
      
      // 初始化密钥缓存
      await this.refreshKeyCache();
      
      logger.info('Vault服务初始化成功');
    } catch (error) {
      logger.error('Vault服务初始化失败:', error.message);
      // 如果Vault不可用，回退到本地密钥管理
      this.enabled = false;
    }
  }

  /**
   * 验证Vault连接
   */
  async verifyVaultConnection() {
    try {
      const response = await axios.get(`${this.vaultUrl}/v1/sys/health`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Vault健康检查失败，状态码: ${response.status}`);
      }
      
      logger.info('Vault连接验证成功');
    } catch (error) {
      throw new Error(`Vault连接验证失败: ${error.message}`);
    }
  }

  /**
   * 刷新密钥缓存
   */
  async refreshKeyCache() {
    if (!this.enabled) return;

    try {
      // 获取JWT密钥
      const jwtKeysResponse = await this.readSecret(`${this.secretPath}/jwt`);
      
      // 获取RSA密钥对
      const rsaKeysResponse = await this.readSecret(`${this.secretPath}/rsa`);
      
      // 更新缓存
      this.keyCache = {
        accessKeys: jwtKeysResponse?.access_keys || [],
        refreshKeys: jwtKeysResponse?.refresh_keys || [],
        privateKey: rsaKeysResponse?.private_key,
        publicKey: rsaKeysResponse?.public_key,
        lastUpdated: Date.now()
      };
      
      logger.info('密钥缓存刷新成功');
    } catch (error) {
      logger.error('刷新密钥缓存失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid() {
    return (Date.now() - this.keyCache.lastUpdated) < this.cacheValidityMs;
  }

  /**
   * 获取访问令牌密钥列表
   */
  async getAccessKeys() {
    if (!this.enabled) return [];
    
    if (!this.isCacheValid()) {
      await this.refreshKeyCache();
    }
    
    return this.keyCache.accessKeys;
  }

  /**
   * 获取刷新令牌密钥列表
   */
  async getRefreshKeys() {
    if (!this.enabled) return [];
    
    if (!this.isCacheValid()) {
      await this.refreshKeyCache();
    }
    
    return this.keyCache.refreshKeys;
  }

  /**
   * 获取RSA私钥
   */
  async getPrivateKey() {
    if (!this.enabled) return null;
    
    if (!this.isCacheValid()) {
      await this.refreshKeyCache();
    }
    
    return this.keyCache.privateKey;
  }

  /**
   * 获取RSA公钥
   */
  async getPublicKey() {
    if (!this.enabled) return null;
    
    if (!this.isCacheValid()) {
      await this.refreshKeyCache();
    }
    
    return this.keyCache.publicKey;
  }

  /**
   * 读取Vault中的密钥
   */
  async readSecret(path) {
    try {
      const response = await axios.get(`${this.vaultUrl}/v1/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`读取密钥失败，状态码: ${response.status}`);
      }
      
      return response.data.data;
    } catch (error) {
      throw new Error(`读取密钥失败: ${error.message}`);
    }
  }

  /**
   * 写入密钥到Vault
   */
  async writeSecret(path, data) {
    try {
      const response = await axios.post(`${this.vaultUrl}/v1/${path}`, data, {
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`写入密钥失败，状态码: ${response.status}`);
      }
      
      logger.info(`密钥写入成功: ${path}`);
      return response.data;
    } catch (error) {
      throw new Error(`写入密钥失败: ${error.message}`);
    }
  }

  /**
   * 删除Vault中的密钥
   */
  async deleteSecret(path) {
    try {
      const response = await axios.delete(`${this.vaultUrl}/v1/${path}`, {
        headers: {
          'X-Vault-Token': this.vaultToken
        },
        timeout: 5000
      });
      
      if (response.status !== 200 && response.status !== 204) {
        throw new Error(`删除密钥失败，状态码: ${response.status}`);
      }
      
      logger.info(`密钥删除成功: ${path}`);
      return response.data;
    } catch (error) {
      throw new Error(`删除密钥失败: ${error.message}`);
    }
  }

  /**
   * 生成新的JWT密钥
   */
  async generateJwtKey() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * 生成新的RSA密钥对
   */
  async generateRsaKeyPair() {
    const crypto = require('crypto');
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
   * 轮换JWT访问密钥
   */
  async rotateAccessKey() {
    if (!this.enabled) return;
    
    try {
      const newKey = await this.generateJwtKey();
      const currentKeys = await this.getAccessKeys();
      
      // 将新密钥添加到列表开头
      const updatedKeys = [newKey, ...currentKeys];
      
      // 保留最多3个旧密钥
      if (updatedKeys.length > 3) {
        updatedKeys.length = 3;
      }
      
      // 更新Vault中的密钥
      await this.writeSecret(`${this.secretPath}/jwt`, {
        access_keys: updatedKeys,
        refresh_keys: await this.getRefreshKeys()
      });
      
      // 刷新缓存
      await this.refreshKeyCache();
      
      logger.info('JWT访问密钥轮换成功');
    } catch (error) {
      logger.error('JWT访问密钥轮换失败:', error.message);
      throw error;
    }
  }

  /**
   * 轮换JWT刷新密钥
   */
  async rotateRefreshKey() {
    if (!this.enabled) return;
    
    try {
      const newKey = await this.generateJwtKey();
      const currentKeys = await this.getRefreshKeys();
      
      // 将新密钥添加到列表开头
      const updatedKeys = [newKey, ...currentKeys];
      
      // 保留最多3个旧密钥
      if (updatedKeys.length > 3) {
        updatedKeys.length = 3;
      }
      
      // 更新Vault中的密钥
      await this.writeSecret(`${this.secretPath}/jwt`, {
        access_keys: await this.getAccessKeys(),
        refresh_keys: updatedKeys
      });
      
      // 刷新缓存
      await this.refreshKeyCache();
      
      logger.info('JWT刷新密钥轮换成功');
    } catch (error) {
      logger.error('JWT刷新密钥轮换失败:', error.message);
      throw error;
    }
  }

  /**
   * 轮换RSA密钥对
   */
  async rotateRsaKeyPair() {
    if (!this.enabled) return;
    
    try {
      const { publicKey, privateKey } = await this.generateRsaKeyPair();
      
      // 更新Vault中的密钥
      await this.writeSecret(`${this.secretPath}/rsa`, {
        public_key: publicKey,
        private_key: privateKey
      });
      
      // 刷新缓存
      await this.refreshKeyCache();
      
      logger.info('RSA密钥对轮换成功');
    } catch (error) {
      logger.error('RSA密钥对轮换失败:', error.message);
      throw error;
    }
  }
}

// 创建Vault服务实例
const vaultService = new VaultService();

module.exports = {
  vaultService
};