const { DataTypes } = require('sequelize');

/**
 * 管理员操作限制模型
 * 用于记录和管理系统对管理员操作的各种限制
 */
const AdminOperationRestriction = (sequelize) => {
  const AdminOperationRestrictionModel = sequelize.define('AdminOperationRestriction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // 限制类型 (数据导出、批量操作、系统设置等)
    restrictionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '限制类型'
    },
    // 限制名称
    restrictionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '限制名称'
    },
    // 限制描述
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '限制描述'
    },
    // 限制状态 (启用/禁用)
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
      comment: '限制状态'
    },
    // 限制级别 (低/中/高/严格)
    restrictionLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'strict'),
      defaultValue: 'medium',
      comment: '限制级别'
    },
    // 时间限制 (每日/每周/每月)
    timeLimit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '时间限制'
    },
    // 操作次数限制
    operationLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '操作次数限制'
    },
    // 数据量限制
    dataLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '数据量限制'
    },
    // IP白名单 (JSON格式)
    ipWhitelist: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'IP白名单'
    },
    // 时间窗口 (JSON格式)
    timeWindow: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '时间窗口'
    },
    // 例外规则 (JSON格式)
    exceptionRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '例外规则'
    },
    // 创建者ID
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建者ID'
    },
    // 更新者ID
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新者ID'
    }
  }, {
    tableName: 'admin_operation_restrictions',
    timestamps: true,
    comment: '管理员操作限制表'
  });

  // 定义关联关系
  AdminOperationRestrictionModel.associate = function(models) {
    // 与用户关联
    AdminOperationRestrictionModel.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    AdminOperationRestrictionModel.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
    
    // 与操作限制日志关联
    AdminOperationRestrictionModel.hasMany(models.AdminOperationRestrictionLog, {
      foreignKey: 'restrictionId',
      as: 'logs'
    });
    
    // 与操作限制统计关联
    AdminOperationRestrictionModel.hasMany(models.AdminOperationRestrictionStats, {
      foreignKey: 'restrictionId',
      as: 'stats'
    });
    
    // 与操作限制异常关联
    AdminOperationRestrictionModel.hasMany(models.AdminOperationRestrictionException, {
      foreignKey: 'restrictionId',
      as: 'exceptions'
    });
  };

  return AdminOperationRestrictionModel;
};

module.exports = AdminOperationRestriction;