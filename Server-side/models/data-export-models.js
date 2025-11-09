/**
 * 数据导出模型定义
 * 定义与数据导出功能相关的数据库模型
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 导出模板模型
 * 存储用户自定义的数据导出模板
 */
const ExportTemplate = sequelize.define('ExportTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '模板名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '模板描述'
  },
  query: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '查询条件'
  },
  columns: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '列配置'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '创建用户ID'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_public',
    comment: '是否公开'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: '创建时间'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
    comment: '更新时间'
  }
}, {
  tableName: 'export_templates',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['created_at']
    }
  ]
});

/**
 * 导出历史记录模型
 * 记录用户的数据导出历史
 */
const ExportHistory = sequelize.define('ExportHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_name',
    comment: '文件名'
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_type',
    comment: '文件类型'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: '文件大小（字节）'
  },
  recordCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'record_count',
    comment: '记录数量'
  },
  exportType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'export_type',
    comment: '导出类型'
  },
  filters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '导出时使用的筛选条件'
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'download_count',
    comment: '下载次数'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at',
    comment: '过期时间'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: '创建时间'
  }
}, {
  tableName: 'export_history',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['export_type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['expires_at']
    }
  ]
});

/**
 * 导出配置模型
 * 存储数据导出的全局配置
 */
const ExportConfig = sequelize.define('ExportConfig', {
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
  dataType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'string',
    field: 'data_type',
    comment: '数据类型'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
    comment: '更新时间'
  }
}, {
  tableName: 'export_config',
  timestamps: false,
  indexes: [
    {
      fields: ['config_key']
    }
  ]
});

/**
 * 定义数据导出模型之间的关联关系
 * @param {Object} models - 所有模型的引用
 */
function defineDataExportAssociations(models) {
  // 导出模板与用户关联
  ExportTemplate.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });
  
  // 导出历史记录与用户关联
  ExportHistory.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });
}

module.exports = {
  ExportTemplate,
  ExportHistory,
  ExportConfig,
  defineDataExportAssociations
};