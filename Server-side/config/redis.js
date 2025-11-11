/**
 * Redis配置模块
 * 负责Redis连接的配置和初始化
 */

const redis = require('redis');
const { logger } = require('./logger');

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // 只有当环境变量存在且不为空字符串时才设置密码
  password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '' ? process.env.REDIS_PASSWORD : null,
  db: process.env.REDIS_DB || 0,
  // 连接超时时间（毫秒）
  connectTimeout: 10000,
  // 重连策略
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  // 心跳检测
  lazyConnect: true,
  keepAlive: 30000,
  // 连接池配置
  family: 4,
  // 命令超时时间（毫秒）
  commandTimeout: 5000,
};

// 创建Redis客户端
let redisClient = null;

/**
 * 初始化Redis连接
 * @returns {Promise<Object>} Redis客户端实例
 */
const initRedis = async () => {
  try {
    if (redisClient) {
      logger.info('Redis客户端已存在，返回现有实例');
      return redisClient;
    }

    // 创建Redis客户端
    redisClient = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        lazyConnect: redisConfig.lazyConnect,
        family: redisConfig.family,
        keepAlive: redisConfig.keepAlive,
      },
      // 只有当密码不为null时才设置密码
      ...(redisConfig.password && { password: redisConfig.password }),
      database: redisConfig.db,
    });

    // 错误处理
    redisClient.on('error', (err) => {
      logger.error('Redis连接错误:', err);
    });

    // 连接成功
    redisClient.on('connect', () => {
      logger.info('Redis连接成功');
    });

    // 就绪状态
    redisClient.on('ready', () => {
      logger.info('Redis客户端就绪');
    });

    // 断开连接
    redisClient.on('end', () => {
      logger.info('Redis连接已断开');
    });

    // 重连中
    redisClient.on('reconnecting', () => {
      logger.info('Redis正在重连...');
    });

    // 连接到Redis
    await redisClient.connect();
    
    // 测试连接
    await redisClient.ping();
    logger.info('Redis连接测试成功');
    
    return redisClient;
  } catch (error) {
    logger.error('初始化Redis连接失败:', error);
    throw error;
  }
};

/**
 * 获取Redis客户端
 * @returns {Object} Redis客户端实例
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化，请先调用initRedis()');
  }
  return redisClient;
};

/**
 * 关闭Redis连接
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis连接已关闭');
    }
  } catch (error) {
    logger.error('关闭Redis连接失败:', error);
    throw error;
  }
};

/**
 * 检查Redis连接状态
 * @returns {boolean} 连接状态
 */
const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  isRedisConnected,
  redisConfig,
};