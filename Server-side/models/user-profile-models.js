/**
 * 用户资料和设置模型定义
 * 包含用户详细资料、用户设置、用户活动日志、登录历史等模型
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 用户详细资料模型
 * 存储用户的个人详细信息
 */
const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: '用户资料ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联的用户ID'
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '名字'
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '姓氏'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '个人简介'
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '个人网站'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '位置'
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '出生日期'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    allowNull: true,
    comment: '性别'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像URL'
  },
  coverPhoto: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '封面照片URL'
  },
  socialLinks: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '社交媒体链接'
  }
}, {
  tableName: 'user_profiles',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  comment: '用户详细资料表'
});

/**
 * 用户设置模型
 * 存储用户的个性化设置和偏好
 */
const UserSetting = sequelize.define('UserSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: '用户设置ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联的用户ID'
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'zh-CN',
    comment: '语言设置'
  },
  theme: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'light',
    comment: '主题设置'
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Asia/Shanghai',
    comment: '时区设置'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'CNY',
    comment: '货币设置'
  },
  notifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '通知设置'
  },
  privacy: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '隐私设置'
  },
  security: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '安全设置'
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '偏好设置'
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '自定义字段'
  }
}, {
  tableName: 'user_settings',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  comment: '用户设置表'
});

/**
 * 用户活动日志模型
 * 记录用户的操作和活动历史
 */
const UserActivityLog = sequelize.define('UserActivityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: '活动日志ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的用户ID'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '操作类型'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '操作详情'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '地理位置'
  }
}, {
  tableName: 'user_activity_logs',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  comment: '用户活动日志表'
});

/**
 * 登录历史模型
 * 记录用户的登录历史
 */
const LoginHistory = sequelize.define('LoginHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    comment: '登录历史ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的用户ID'
  },
  loginAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '登录时间'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '地理位置'
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '登录是否成功'
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '登录失败原因'
  }
}, {
  tableName: 'login_histories',
  timestamps: false,
  comment: '登录历史表'
});

/**
 * 定义用户资料和设置模型之间的关联关系
 */
function defineUserProfileAssociations(models) {
  // UserProfile 与 User 的一对一关系
  UserProfile.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // User 与 UserProfile 的一对一关系
  models.User.hasOne(UserProfile, {
    foreignKey: 'userId',
    as: 'profile'
  });
  
  // UserSetting 与 User 的一对一关系
  UserSetting.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // User 与 UserSetting 的一对一关系
  models.User.hasOne(UserSetting, {
    foreignKey: 'userId',
    as: 'settings'
  });
  
  // UserActivityLog 与 User 的多对一关系
  UserActivityLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // User 与 UserActivityLog 的一对多关系
  models.User.hasMany(UserActivityLog, {
    foreignKey: 'userId',
    as: 'activityLogs'
  });
  
  // LoginHistory 与 User 的多对一关系
  LoginHistory.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  // User 与 LoginHistory 的一对多关系
  models.User.hasMany(LoginHistory, {
    foreignKey: 'userId',
    as: 'loginHistories'
  });
}

module.exports = {
  UserProfile,
  UserSetting,
  UserActivityLog,
  LoginHistory,
  defineUserProfileAssociations
};