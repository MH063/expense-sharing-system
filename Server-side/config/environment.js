/**
 * 环境配置加载模块
 * 根据NODE_ENV加载相应的环境配置文件
 */

const fs = require('fs');
const path = require('path');

// 加载环境特定的配置文件
function loadEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  // 按优先级加载环境变量文件
  // 注意：加载顺序很重要，后加载的文件不会覆盖已存在的环境变量
  const envFiles = [
    path.resolve(__dirname, '..', '.env.development'), // 开发环境默认配置（最先加载）
    path.resolve(__dirname, '..', `.env.${env}`),       // 环境特定配置
    path.resolve(__dirname, '..', '.env')               // 本地环境变量（最后加载，具有最高优先级）
  ];

  // 按优先级加载环境变量文件
  envFiles.forEach(envPath => {
    try {
      if (fs.existsSync(envPath)) {
        console.log(`加载环境变量文件: ${envPath}`);
        // 本地.env文件使用override=true，其他文件使用override=false
        const isLocalEnv = envPath.endsWith('.env') && !envPath.endsWith('.env.development') && !envPath.includes('.env.');
        require('dotenv').config({ path: envPath, override: isLocalEnv });
      }
    } catch (error) {
      console.warn(`警告: 加载环境变量文件失败: ${envPath}`, error.message);
    }
  });
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
      secret: process.env.JWT_SECRET || '', // 将由secrets.js管理
      refreshSecret: process.env.JWT_REFRESH_SECRET || '', // 将由secrets.js管理
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    },
    api: {
    rateLimit: parseInt(process.env.API_RATE_LIMIT) || 10
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 限制每个IP在窗口期内最多100次请求
    message: process.env.RATE_LIMIT_MESSAGE || '请求过于频繁，请稍后再试',
    statusCode: parseInt(process.env.RATE_LIMIT_STATUS_CODE) || 429
  },

  // 暴力破解防护配置
  bruteForceProtection: {
    windowMs: parseInt(process.env.BRUTE_FORCE_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    ipMaxAttempts: parseInt(process.env.BRUTE_FORCE_IP_MAX_ATTEMPTS) || 50, // IP最大尝试次数
    userMaxAttempts: parseInt(process.env.BRUTE_FORCE_USER_MAX_ATTEMPTS) || 10, // 用户最大尝试次数
    blockDurationMs: parseInt(process.env.BRUTE_FORCE_BLOCK_DURATION_MS) || 15 * 60 * 1000, // 封禁时长
    // 开发环境配置
    dev: {
      ipMaxAttempts: parseInt(process.env.BRUTE_FORCE_DEV_IP_MAX_ATTEMPTS) || 20,
      userMaxAttempts: parseInt(process.env.BRUTE_FORCE_DEV_USER_MAX_ATTEMPTS) || 5,
      blockDurationMs: parseInt(process.env.BRUTE_FORCE_DEV_BLOCK_DURATION_MS) || 60 * 1000
    }
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
  console.log('加载基础环境配置: .env');
  loadEnvironmentConfig();
  const config = getEnvironmentConfig();
  console.log(`当前环境: ${config.nodeEnv}`);
  console.log(`应用端口: ${config.port}`);
  console.log(`数据库: ${config.db.host}:${config.db.port}/${config.db.name}`);

  // 基础配置校验（生产环境严格）
  const isProd = (config.nodeEnv === 'production');
  const missing = [];
  if (!config.db.password && isProd) missing.push('DB_PASSWORD');
  if ((!config.jwtKeys.accessSecrets || config.jwtKeys.accessSecrets.length === 0) && isProd) missing.push('JWT_SECRETS');
  if ((!config.jwtKeys.refreshSecrets || config.jwtKeys.refreshSecrets.length === 0) && isProd) missing.push('JWT_REFRESH_SECRETS');
  if (missing.length) {
    const msg = `关键环境变量缺失: ${missing.join(', ')}`;
    console.error(msg);
    throw new Error(msg);
  }

  return config;
}

module.exports = {
  loadEnvironmentConfig,
  getEnvironmentConfig,
  initializeEnvironment
};