/**
 * 密码重置相关模型定义
 * 包含密码重置令牌、日志、配置、模板等相关数据模型
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 密码重置令牌模型
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    field: 'user_id'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tokenType: {
    type: DataTypes.STRING(50),
    defaultValue: 'reset_token',
    field: 'token_type'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_used'
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  underscored: true
});

// 密码重置日志模型
const PasswordResetLog = sequelize.define('PasswordResetLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    field: 'user_id'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'password_reset_logs',
  timestamps: true,
  underscored: true
});

// 密码重置配置模型
const PasswordResetConfig = sequelize.define('PasswordResetConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenExpiryHours: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'token_expiry_hours'
  },
  maxAttemptsPerHour: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'max_attempts_per_hour'
  },
  maxAttemptsPerDay: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'max_attempts_per_day'
  },
  requireEmailVerification: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'require_email_verification'
  },
  enableTwoFactorAuth: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'enable_two_factor_auth'
  },
  passwordMinLength: {
    type: DataTypes.INTEGER,
    defaultValue: 8,
    field: 'password_min_length'
  },
  passwordRequireUppercase: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'password_require_uppercase'
  },
  passwordRequireLowercase: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'password_require_lowercase'
  },
  passwordRequireNumbers: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'password_require_numbers'
  },
  passwordRequireSpecialChars: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'password_require_special_chars'
  },
  preventReuse: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'prevent_reuse'
  },
  preventReuseCount: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'prevent_reuse_count'
  },
  sessionInvalidateOnReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'session_invalidate_on_reset'
  },
  emailNotificationOnReset: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_notification_on_reset'
  },
  ipWhitelistEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'ip_whitelist_enabled'
  },
  ipWhitelist: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'ip_whitelist'
  },
  blacklistEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'blacklist_enabled'
  },
  blacklist: {
    type: DataTypes.JSON,
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'password_reset_configs',
  timestamps: true,
  underscored: true
});

// 密码重置模板模型
const PasswordResetTemplate = sequelize.define('PasswordResetTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  htmlContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'html_content'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'password_reset_templates',
  timestamps: true,
  underscored: true
});

// 密码重置审计日志模型
const PasswordResetAuditLog = sequelize.define('PasswordResetAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    field: 'user_id'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'password_reset_audit_logs',
  timestamps: true,
  underscored: true
});

// 密码重置任务模型
const PasswordResetTask = sequelize.define('PasswordResetTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true
  },
  result: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'password_reset_tasks',
  timestamps: true,
  underscored: true
});

// 密码重置配置模板模型
const PasswordResetConfigTemplate = sequelize.define('PasswordResetConfigTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  config: {
    type: DataTypes.JSON,
    allowNull: false
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'password_reset_config_templates',
  timestamps: true,
  underscored: true
});

// 定义模型关联关系
const definePasswordResetAssociations = (models) => {
  // PasswordResetToken 与 User 的关联
  PasswordResetToken.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // PasswordResetLog 与 User 的关联
  PasswordResetLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // PasswordResetAuditLog 与 User 的关联
  PasswordResetAuditLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // PasswordResetTask 与 User 的关联
  PasswordResetTask.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  // PasswordResetConfigTemplate 与 User 的关联
  PasswordResetConfigTemplate.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

module.exports = {
  PasswordResetToken,
  PasswordResetLog,
  PasswordResetConfig,
  PasswordResetTemplate,
  PasswordResetAuditLog,
  PasswordResetTask,
  PasswordResetConfigTemplate,
  definePasswordResetAssociations
};