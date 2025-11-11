/**
 * 配置验证模块
 * 负责验证应用程序配置的安全性和完整性
 */

const { logger } = require('./logger');

/**
 * 密码强度验证
 * @param {string} password - 要验证的密码
 * @param {string} fieldName - 字段名称（用于错误消息）
 * @returns {Object} 验证结果 { isValid: boolean, message: string }
 */
function validatePasswordStrength(password, fieldName) {
  if (!password || password.length < 16) {
    return {
      isValid: false,
      message: `${fieldName}长度必须至少为16个字符`
    };
  }

  // 检查是否包含常见的弱密码模式
  const weakPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /test/i,
    /dev/i,
    /placeholder/i,
    /secret/i
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return {
        isValid: false,
        message: `${fieldName}不能包含常见弱密码模式`
      };
    }
  }

  // 检查密码复杂度
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      isValid: false,
      message: `${fieldName}必须包含大写字母、小写字母、数字和特殊字符`
    };
  }

  return { isValid: true };
}

/**
 * JWT密钥强度验证
 * @param {string} secret - JWT密钥
 * @param {string} fieldName - 字段名称
 * @returns {Object} 验证结果
 */
function validateJwtSecret(secret, fieldName) {
  if (!secret || secret.length < 32) {
    return {
      isValid: false,
      message: `${fieldName}长度必须至少为32个字符`
    };
  }

  // 检查是否为Base64编码
  try {
    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length < 24) {
      return {
        isValid: false,
        message: `${fieldName}解码后长度必须至少为24字节`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `${fieldName}必须是有效的Base64编码字符串`
    };
  }

  // 检查是否包含常见的弱密钥模式
  const weakPatterns = [
    /secret/i,
    /jwt/i,
    /token/i,
    /key/i,
    /dev/i,
    /test/i,
    /placeholder/i
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      return {
        isValid: false,
        message: `${fieldName}不能包含常见弱密钥模式`
      };
    }
  }

  return { isValid: true };
}

/**
 * 端口有效性验证
 * @param {number} port - 端口号
 * @param {string} fieldName - 字段名称
 * @returns {Object} 验证结果
 */
function validatePort(port, fieldName) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return {
      isValid: false,
      message: `${fieldName}必须是1到65535之间的整数`
    };
  }

  // 检查是否为保留端口
  if (port < 1024) {
    return {
      isValid: false,
      message: `${fieldName}不应使用保留端口(1-1023)`
    };
  }

  return { isValid: true };
}

/**
 * 主机名/IP地址验证
 * @param {string} host - 主机名或IP地址
 * @param {string} fieldName - 字段名称
 * @returns {Object} 验证结果
 */
function validateHost(host, fieldName) {
  if (!host || typeof host !== 'string') {
    return {
      isValid: false,
      message: `${fieldName}必须是非空字符串`
    };
  }

  // 检查是否为localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    // 生产环境不应使用localhost
    if (process.env.NODE_ENV === 'production') {
      return {
        isValid: false,
        message: `生产环境中${fieldName}不应使用localhost`
      };
    }
  }

  // 检查是否为有效的IP地址或主机名
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!ipRegex.test(host) && !hostnameRegex.test(host)) {
    return {
      isValid: false,
      message: `${fieldName}必须是有效的IP地址或主机名`
    };
  }

  return { isValid: true };
}

/**
 * 数据库名称验证
 * @param {string} dbName - 数据库名称
 * @param {string} fieldName - 字段名称
 * @returns {Object} 验证结果
 */
function validateDatabaseName(dbName, fieldName) {
  if (!dbName || typeof dbName !== 'string') {
    return {
      isValid: false,
      message: `${fieldName}必须是非空字符串`
    };
  }

  // 检查长度
  if (dbName.length < 3 || dbName.length > 63) {
    return {
      isValid: false,
      message: `${fieldName}长度必须在3到63个字符之间`
    };
  }

  // 检查是否包含有效字符
  const validNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  if (!validNameRegex.test(dbName)) {
    return {
      isValid: false,
      message: `${fieldName}必须以字母开头，只能包含字母、数字和下划线`
    };
  }

  // 检查是否为保留名称
  const reservedNames = ['postgres', 'template0', 'template1', 'admin', 'root', 'test'];
  if (reservedNames.includes(dbName.toLowerCase())) {
    return {
      isValid: false,
      message: `${fieldName}不能使用保留数据库名称`
    };
  }

  return { isValid: true };
}

/**
 * 验证应用程序配置
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果 { isValid: boolean, errors: Array }
 */
function validateApplicationConfig(config) {
  const errors = [];
  const isProd = config.nodeEnv === 'production';

  // 验证数据库配置
  if (config.db) {
    const hostValidation = validateHost(config.db.host, 'DB_HOST');
    if (!hostValidation.isValid) {
      errors.push(hostValidation.message);
    }

    const portValidation = validatePort(config.db.port, 'DB_PORT');
    if (!portValidation.isValid) {
      errors.push(portValidation.message);
    }

    if (isProd) {
      const passwordValidation = validatePasswordStrength(config.db.password, 'DB_PASSWORD');
      if (!passwordValidation.isValid) {
        errors.push(passwordValidation.message);
      }
    }

    const dbNameValidation = validateDatabaseName(config.db.name, 'DB_NAME');
    if (!dbNameValidation.isValid) {
      errors.push(dbNameValidation.message);
    }
  }

  // 验证Redis配置
  if (config.redis) {
    const hostValidation = validateHost(config.redis.host, 'REDIS_HOST');
    if (!hostValidation.isValid) {
      errors.push(hostValidation.message);
    }

    const portValidation = validatePort(config.redis.port, 'REDIS_PORT');
    if (!portValidation.isValid) {
      errors.push(portValidation.message);
    }
  }

  // 验证JWT配置
  if (config.jwt && config.jwt.accessSecrets && config.jwt.accessSecrets.length > 0) {
    const primarySecret = config.jwt.accessSecrets[0];
    const secretValidation = validateJwtSecret(primarySecret, 'JWT_SECRET');
    if (!secretValidation.isValid) {
      errors.push(secretValidation.message);
    }
  }

  // 验证应用端口
  const appPortValidation = validatePort(config.port, 'PORT');
  if (!appPortValidation.isValid) {
    errors.push(appPortValidation.message);
  }

  // 验证安全配置
  if (config.security) {
    if (isProd && config.security.enableCorsAll) {
      errors.push('生产环境不应启用允许所有CORS请求的配置');
    }

    if (isProd && !config.security.enableRateLimiting) {
      errors.push('生产环境必须启用速率限制');
    }
  }

  // 验证日志级别
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (config.logging && !validLogLevels.includes(config.logging.level)) {
    errors.push(`LOG_LEVEL必须是以下值之一: ${validLogLevels.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证并报告配置问题
 * @param {Object} config - 配置对象
 * @returns {boolean} 配置是否有效
 */
function validateAndReportConfig(config) {
  const validation = validateApplicationConfig(config);

  if (!validation.isValid) {
    logger.error('配置验证失败:');
    validation.errors.forEach(error => {
      logger.error(`  - ${error}`);
    });

    if (config.nodeEnv === 'production') {
      logger.error('生产环境配置验证失败，应用程序将退出');
      process.exit(1);
    } else {
      logger.warn('非生产环境配置验证失败，应用程序将继续运行');
    }
  } else {
    logger.info('配置验证通过');
  }

  return validation.isValid;
}

module.exports = {
  validatePasswordStrength,
  validateJwtSecret,
  validatePort,
  validateHost,
  validateDatabaseName,
  validateApplicationConfig,
  validateAndReportConfig
};