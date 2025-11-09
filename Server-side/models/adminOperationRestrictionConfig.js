const { DataTypes } = require('sequelize');

/**
 * 管理员操作限制配置模型
 * 用于记录管理员操作限制的系统配置
 */
const AdminOperationRestrictionConfig = (sequelize) => {
  const AdminOperationRestrictionConfigModel = sequelize.define('AdminOperationRestrictionConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // 配置键
    configKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '配置键'
    },
    // 配置值
    configValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '配置值'
    },
    // 配置类型 (字符串/数字/布尔值/JSON)
    configType: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      defaultValue: 'string',
      comment: '配置类型'
    },
    // 配置描述
    configDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '配置描述'
    },
    // 配置分组
    configGroup: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '配置分组'
    },
    // 是否系统配置
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否系统配置'
    },
    // 是否只读
    isReadonly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否只读'
    },
    // 是否加密
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否加密'
    },
    // 排序顺序
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序'
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
    tableName: 'admin_operation_restriction_configs',
    timestamps: true,
    comment: '管理员操作限制配置表',
    indexes: [
      {
        unique: true,
        fields: ['configKey']
      }
    ]
  });

  // 定义关联关系
  AdminOperationRestrictionConfigModel.associate = function(models) {
    // 与创建者关联
    AdminOperationRestrictionConfigModel.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    // 与更新者关联
    AdminOperationRestrictionConfigModel.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return AdminOperationRestrictionConfigModel;
};

module.exports = AdminOperationRestrictionConfig;