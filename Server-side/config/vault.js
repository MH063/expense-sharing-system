/**
 * HashiCorp Vault密钥管理服务
 * 提供集中化、安全化的密钥存储与访问控制
 */

const vault = require('node-vault');
const { logger } = require('./logger');

class VaultManager {
  constructor() {
    this.vaultClient = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // 从环境变量获取Vault配置
      const vaultUrl = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
      const vaultToken = process.env.VAULT_TOKEN;

      if (!vaultToken) {
        logger.warn('Vault token未配置，使用环境变量中的JWT密钥');
        return false;
      }

      this.vaultClient = vault({
        apiVersion: 'v1',
        endpoint: vaultUrl,
        token: vaultToken
      });

      // 测试连接
      await this.vaultClient.health();
      this.isInitialized = true;
      logger.info('Vault客户端初始化成功');
      return true;
    } catch (error) {
      logger.error('Vault客户端初始化失败:', error);
      return false;
    }
  }

  async getJWTSecrets() {
    if (!this.isInitialized) {
      throw new Error('Vault未初始化');
    }

    try {
      // 从Vault获取JWT密钥
      const result = await this.vaultClient.read('secret/jwt');
      return {
        accessSecrets: result.data.access_secrets.split(','),
        refreshSecrets: result.data.refresh_secrets.split(',')
      };
    } catch (error) {
      logger.error('从Vault获取JWT密钥失败:', error);
      throw error;
    }
  }

  async rotateJWTSecrets() {
    if (!this.isInitialized) {
      throw new Error('Vault未初始化');
    }

    try {
      // 生成新的JWT密钥
      const newAccessSecret = require('crypto').randomBytes(32).toString('hex');
      const newRefreshSecret = require('crypto').randomBytes(32).toString('hex');

      // 存储到Vault
      await this.vaultClient.write('secret/jwt', {
        access_secrets: newAccessSecret,
        refresh_secrets: newRefreshSecret
      });

      logger.info('JWT密钥轮换成功');
      return {
        accessSecrets: [newAccessSecret],
        refreshSecrets: [newRefreshSecret]
      };
    } catch (error) {
      logger.error('JWT密钥轮换失败:', error);
      throw error;
    }
  }
}

module.exports = new VaultManager();