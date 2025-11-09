/**
 * 缓存管理模型定义
 * 定义与缓存统计和管理相关的数据库模型
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 缓存统计模型
 * 记录缓存的使用统计信息
 */
const CacheStat = sequelize.define('CacheStat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  statType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'stat_type',
    comment: '统计类型'
  },
  statValue: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stat_value',
    comment: '统计值'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '时间戳'
  }
}, {
  tableName: 'cache_stats',
  timestamps: false,
  indexes: [
    {
      fields: ['stat_type']
    },
    {
      fields: ['timestamp']
    }
  ]
});

/**
 * 缓存键信息模型
 * 记录缓存键的元数据信息
 */
const CacheKeyInfo = sequelize.define('CacheKeyInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cacheKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'cache_key',
    comment: '缓存键'
  },
  keyType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'key_type',
    comment: '键类型'
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '键大小（字节）'
  },
  ttl: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '过期时间（秒）'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: '创建时间'
  },
  lastAccessed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_accessed',
    comment: '最后访问时间'
  }
}, {
  tableName: 'cache_key_info',
  timestamps: false,
  indexes: [
    {
      fields: ['cache_key']
    },
    {
      fields: ['key_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['last_accessed']
    }
  ]
});

/**
 * 缓存配置模型
 * 存储缓存系统的配置信息
 */
const CacheConfig = sequelize.define('CacheConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  configKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'config_key',
    comment: '配置键'
  },
  configValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'config_value',
    comment: '配置值'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '描述'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
    comment: '更新时间'
  }
}, {
  tableName: 'cache_config',
  timestamps: false,
  indexes: [
    {
      fields: ['config_key']
    }
  ]
});

/**
 * 缓存慢查询日志模型
 * 记录缓存的慢查询信息
 */
const CacheSlowLog = sequelize.define('CacheSlowLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  command: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '执行的命令'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '执行时长（毫秒）'
  },
  key: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '涉及的键'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '执行时间'
  },
  client: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '客户端信息'
  }
}, {
  tableName: 'cache_slow_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['timestamp']
    },
    {
      fields: ['duration']
    },
    {
      fields: ['key']
    }
  ]
});

/**
 * 缓存备份记录模型
 * 记录缓存备份的历史信息
 */
const CacheBackup = sequelize.define('CacheBackup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  backupPath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'backup_path',
    comment: '备份文件路径'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: '文件大小（字节）'
  },
  keyCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'key_count',
    comment: '键数量'
  },
  backupTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'backup_time',
    comment: '备份时间'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'success',
    comment: '备份状态'
  }
}, {
  tableName: 'cache_backups',
  timestamps: false,
  indexes: [
    {
      fields: ['backup_time']
    },
    {
      fields: ['status']
    }
  ]
});

/**
 * 定义缓存管理模型之间的关联关系
 * @param {Object} models - 所有模型的引用
 */
function defineCacheManagementAssociations(models) {
  // 缓存键信息与缓存统计之间没有直接关联，它们都是独立的统计信息
  
  // 如果需要，可以在这里添加模型之间的关联关系
  // 例如，如果有用户相关的缓存信息，可以与用户模型建立关联
}

module.exports = {
  CacheStat,
  CacheKeyInfo,
  CacheConfig,
  CacheSlowLog,
  CacheBackup,
  defineCacheManagementAssociations
};