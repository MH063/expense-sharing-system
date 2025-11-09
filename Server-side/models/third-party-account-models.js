/**
 * 第三方账号管理模型
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('.');

// 第三方平台模型
const ThirdPartyPlatform = sequelize.define('ThirdPartyPlatform', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '平台标识符'
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '平台显示名称'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '平台描述'
  },
  icon: {
    type: DataTypes.STRING(255),
    comment: '平台图标URL'
  },
  authType: {
    type: DataTypes.ENUM('oauth1', 'oauth2', 'openid'),
    allowNull: false,
    defaultValue: 'oauth2',
    comment: '认证类型'
  },
  authUrl: {
    type: DataTypes.STRING(255),
    comment: '认证URL'
  },
  tokenUrl: {
    type: DataTypes.STRING(255),
    comment: '令牌URL'
  },
  userInfoUrl: {
    type: DataTypes.STRING(255),
    comment: '用户信息URL'
  },
  clientId: {
    type: DataTypes.STRING(255),
    comment: '客户端ID'
  },
  clientSecret: {
    type: DataTypes.STRING(255),
    comment: '客户端密钥'
  },
  redirectUri: {
    type: DataTypes.STRING(255),
    comment: '回调URL'
  },
  scope: {
    type: DataTypes.STRING(255),
    comment: '权限范围'
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  config: {
    type: DataTypes.JSON,
    comment: '平台特定配置'
  }
}, {
  tableName: 'third_party_platforms',
  timestamps: true,
  underscored: true,
  comment: '第三方平台信息'
});

// 第三方账号模型
const ThirdPartyAccount = sequelize.define('ThirdPartyAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  platformId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '平台ID'
  },
  accountId: {
    type: DataTypes.STRING(255),
    comment: '第三方平台账号ID'
  },
  accountName: {
    type: DataTypes.STRING(255),
    comment: '第三方平台账号名称'
  },
  accessToken: {
    type: DataTypes.TEXT,
    comment: '访问令牌'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    comment: '刷新令牌'
  },
  expiresAt: {
    type: DataTypes.DATE,
    comment: '令牌过期时间'
  },
  isConnected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已连接'
  },
  settings: {
    type: DataTypes.JSON,
    comment: '账号特定设置'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    comment: '最后同步时间'
  }
}, {
  tableName: 'third_party_accounts',
  timestamps: true,
  underscored: true,
  comment: '用户第三方账号信息'
});

// 第三方账号日志模型
const ThirdPartyAccountLog = sequelize.define('ThirdPartyAccountLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '第三方账号ID'
  },
  action: {
    type: DataTypes.ENUM('connect', 'disconnect', 'update', 'sync', 'admin_disconnect'),
    allowNull: false,
    comment: '操作类型'
  },
  details: {
    type: DataTypes.TEXT,
    comment: '操作详情'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    comment: '操作人ID（管理员操作时记录）'
  }
}, {
  tableName: 'third_party_account_logs',
  timestamps: true,
  underscored: true,
  comment: '第三方账号操作日志'
});

// 模型关联定义
function defineThirdPartyAccountAssociations() {
  // 第三方账号关联用户
  ThirdPartyAccount.belongsTo(require('./index').User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // 第三方账号关联平台
  ThirdPartyAccount.belongsTo(ThirdPartyPlatform, {
    foreignKey: 'platformId',
    as: 'platform'
  });
  
  // 第三方平台与账号的一对多关系
  ThirdPartyPlatform.hasMany(ThirdPartyAccount, {
    foreignKey: 'platformId',
    as: 'accounts'
  });
  
  // 第三方账号与日志的一对多关系
  ThirdPartyAccount.hasMany(ThirdPartyAccountLog, {
    foreignKey: 'accountId',
    as: 'logs'
  });
  
  // 第三方账号日志关联第三方账号
  ThirdPartyAccountLog.belongsTo(ThirdPartyAccount, {
    foreignKey: 'accountId',
    as: 'account'
  });
  
  // 日志记录人关联用户
  ThirdPartyAccountLog.belongsTo(require('./index').User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
}

module.exports = {
  ThirdPartyPlatform,
  ThirdPartyAccount,
  ThirdPartyAccountLog,
  defineThirdPartyAccountAssociations
};