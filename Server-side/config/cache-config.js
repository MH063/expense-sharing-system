/**
 * 缓存配置
 * 集中管理所有缓存相关的配置参数
 */

/**
 * 默认TTL配置（秒）
 */
const DEFAULT_TTL = {
  USER_INFO: 1800,        // 用户信息缓存30分钟
  USER_ROOMS: 1800,       // 用户房间列表缓存30分钟
  ROOM_USERS: 1800,       // 房间用户列表缓存30分钟
  ROOM_BILLS: 1800,       // 房间账单列表缓存30分钟
  BILL_DETAIL: 1800,      // 账单详情缓存30分钟
  BILL_STATS: 3600,       // 账单统计缓存1小时
  EXPENSE_TYPES: 7200,    // 支出类型缓存2小时
  SYSTEM_CONFIG: 86400,   // 系统配置缓存24小时
  NOTIFICATIONS: 600,     // 通知缓存10分钟
  HOT_DATA: 300,          // 热点数据缓存5分钟
};

/**
 * 缓存键前缀配置
 */
const CACHE_KEYS = {
  USER: 'user',
  ROOM: 'room',
  BILL: 'bill',
  EXPENSE: 'expense',
  STATS: 'stats',
  SYSTEM: 'system',
  NOTIFICATION: 'notification',
};

/**
 * 缓存标签配置
 */
const CACHE_TAGS = {
  USER: 'user',
  ROOM: 'room',
  BILL: 'bill',
  EXPENSE: 'expense',
  STATS: 'stats',
  SYSTEM: 'system',
  NOTIFICATION: 'notification',
};

/**
 * 热点数据配置
 */
const HOT_DATA_CONFIG = {
  ENABLED: true,          // 是否启用热点数据本地缓存
  MAX_SIZE: 100,          // 最大缓存条目数
  TTL: 300,               // 热点数据TTL（秒）
  THRESHOLD: 5,           // 访问次数阈值，超过此值认为是热点数据
};

/**
 * 缓存预热配置
 */
const WARMUP_CONFIG = {
  ENABLED: true,          // 是否启用缓存预热
  BATCH_SIZE: 50,         // 批量处理大小
  DELAY: 100,             // 批次间延迟（毫秒）
  RETRY_COUNT: 3,         // 重试次数
  RETRY_DELAY: 1000,      // 重试延迟（毫秒）
  
  // 用户数据预热配置
  USERS: {
    ENABLED: true,        // 是否预热用户数据
    LIMIT: 1000           // 预热用户数量限制
  },
  
  // 房间数据预热配置
  ROOMS: {
    ENABLED: true,        // 是否预热房间数据
    LIMIT: 500            // 预热房间数量限制
  },
  
  // 账单数据预热配置
  BILLS: {
    ENABLED: true,        // 是否预热账单数据
    LIMIT: 2000           // 预热账单数量限制
  },
  
  // 统计数据预热配置
  STATS: {
    ENABLED: false,       // 是否预热统计数据（暂时禁用）
    LIMIT: 100            // 预热统计数据数量限制
  }
};

/**
 * 缓存统计配置
 */
const STATS_CONFIG = {
  ENABLED: true,          // 是否启用缓存统计
  LOG_INTERVAL: 3600000,  // 统计日志输出间隔（毫秒）
};

/**
 * 获取缓存键
 * @param {string} prefix - 缓存键前缀
 * @param {string} identifier - 标识符
 * @param {string} suffix - 后缀（可选）
 * @returns {string} 完整的缓存键
 */
function getCacheKey(prefix, identifier, suffix = '') {
  return suffix ? `${prefix}:${identifier}:${suffix}` : `${prefix}:${identifier}`;
}

/**
 * 获取带标签的缓存键
 * @param {string} prefix - 缓存键前缀
 * @param {string} identifier - 标识符
 * @param {string} tag - 缓存标签
 * @param {string} suffix - 后缀（可选）
 * @returns {object} 包含key和tag的对象
 */
function getTaggedCacheKey(prefix, identifier, tag, suffix = '') {
  const key = getCacheKey(prefix, identifier, suffix);
  return { key, tag };
}

module.exports = {
  DEFAULT_TTL,
  CACHE_KEYS,
  CACHE_TAGS,
  HOT_DATA_CONFIG,
  WARMUP_CONFIG,
  STATS_CONFIG,
  getCacheKey,
  getTaggedCacheKey,
};