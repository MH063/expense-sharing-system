/**
 * 环境配置加载模块
 * 根据NODE_ENV加载相应的环境配置文件
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 加载环境特定的配置文件
function loadEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const envFile = path.resolve(__dirname, '..', `.env.${env}`).trim();
  
  console.log(`检查环境配置文件: ${envFile}`);
  
  try {
    // 尝试直接读取文件
    const stats = fs.statSync(envFile);
    console.log(`文件存在，大小: ${stats.size} 字节`);
    console.log(`加载${env}环境配置文件: .env.${env}`);
    require('dotenv').config({ path: envFile, override: true });
  } catch (error) {
    console.warn(`警告: 未找到${env}环境配置文件: .env.${env}`);
    console.warn(`错误信息: ${error.message}`);
  }
}

// 获取环境配置
function getEnvironmentConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 4000,
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'expense_system',
      dialect: process.env.DB_DIALECT || 'postgres',
      storage: process.env.DB_STORAGE || null
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'default_secret',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    },
    api: {
      rateLimit: parseInt(process.env.API_RATE_LIMIT) || 10
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5
    },
    security: {
      enableCorsAll: process.env.ENABLE_CORS_ALL === 'true',
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      enableRequestSignature: process.env.ENABLE_REQUEST_SIGNATURE === 'true',
      apiSigningSecret: process.env.API_SIGNING_SECRET || '',
      signatureSkewSeconds: parseInt(process.env.SIGNATURE_SKEW_SECONDS) || 300,
      enableIpWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
      ipWhitelist: (process.env.IP_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
    },
    dbSsl: {
      enabled: process.env.DB_SSL === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
    },
    jwtKeys: {
      accessSecrets: (process.env.JWT_SECRETS || process.env.JWT_SECRET || '').split(',').map(s => s.trim()).filter(Boolean),
      refreshSecrets: (process.env.JWT_REFRESH_SECRETS || process.env.JWT_REFRESH_SECRET || '').split(',').map(s => s.trim()).filter(Boolean),
      algorithm: process.env.JWT_ALGORITHM || 'HS512'
    }
  };
}

// 初始化环境配置
function initializeEnvironment() {
  // 加载基础配置
  console.log('加载基础环境配置: .env');
  
  // 加载环境特定配置
  loadEnvironmentConfig();
  
  // 获取并返回配置
  const config = getEnvironmentConfig();
  console.log(`当前环境: ${config.nodeEnv}`);
  console.log(`应用端口: ${config.port}`);
  console.log(`数据库: ${config.db.host}:${config.db.port}/${config.db.name}`);
  
  return config;
}

module.exports = {
  loadEnvironmentConfig,
  getEnvironmentConfig,
  initializeEnvironment
};