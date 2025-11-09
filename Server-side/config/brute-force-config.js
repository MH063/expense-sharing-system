/**
 * 暴力破解防护配置模块
 * 提供详细的配置选项和环境特定的默认值
 */

const { getEnvironmentConfig } = require('./environment');

// 获取基础环境配置
const baseConfig = getEnvironmentConfig();

/**
 * 暴力破解防护详细配置
 * @returns {Object} 配置对象
 */
function getBruteForceConfig() {
  const env = baseConfig.nodeEnv;
  const isDevelopment = env === 'development';
  const isTest = env === 'test';
  
  // 基础配置
  const config = {
    // 时间窗口（毫秒）
    windowMs: baseConfig.bruteForceProtection.windowMs,
    
    // IP级别限制
    ip: {
      // 最大尝试次数
      maxAttempts: isDevelopment ? 
        baseConfig.bruteForceProtection.dev.ipMaxAttempts : 
        baseConfig.bruteForceProtection.ipMaxAttempts,
      
      // 对于不同类型的IP的特殊处理
      trustedIps: [], // 可信任的IP列表
      
      // 是否启用IP信誉系统
      enableReputation: !isDevelopment,
      
      // IP信誉分数阈值
      reputationThreshold: 50
    },
    
    // 用户级别限制
    user: {
      // 最大尝试次数
      maxAttempts: isDevelopment ? 
        baseConfig.bruteForceProtection.dev.userMaxAttempts : 
        baseConfig.bruteForceProtection.userMaxAttempts,
      
      // 是否启用用户信誉系统
      enableReputation: !isDevelopment,
      
      // 用户信誉分数阈值
      reputationThreshold: 70
    },
    
    // 封禁配置
    block: {
      // 基础封禁时长（毫秒）
      durationMs: isDevelopment ? 
        baseConfig.bruteForceProtection.dev.blockDurationMs : 
        baseConfig.bruteForceProtection.blockDurationMs,
      
      // 递增封禁时长（每次失败后增加）
      enableEscalation: !isDevelopment,
      
      // 最大封禁时长（毫秒）
      maxDurationMs: 24 * 60 * 60 * 1000, // 24小时
      
      // 递增系数
      escalationFactor: 2.0
    },
    
    // 通知配置
    notification: {
      // 是否启用通知
      enabled: !isDevelopment && !isTest,
      
      // 触发通知的阈值
      threshold: {
        ip: 10,   // IP尝试次数达到10次时通知
        user: 5   // 用户尝试次数达到5次时通知
      }
    },
    
    // 监控配置
    monitoring: {
      // 是否启用详细监控
      enabled: true,
      
      // 监控采样率（0-1之间的值）
      samplingRate: isDevelopment ? 1.0 : 0.1,
      
      // 是否记录所有尝试（即使是成功的）
      logAllAttempts: isDevelopment
    },
    
    // 白名单配置
    whitelist: {
      // IP白名单
      ips: [
        '127.0.0.1',
        '::1'
        // 可以从环境变量加载更多
      ],
      
      // 用户白名单
      users: [
        // 管理员用户可以在这里添加
      ]
    }
  };
  
  // 在测试环境中使用更宽松的配置
  if (isTest) {
    config.ip.maxAttempts = 100;
    config.user.maxAttempts = 50;
    config.block.durationMs = 1000; // 1秒封禁
  }
  
  return config;
}

module.exports = {
  getBruteForceConfig
};