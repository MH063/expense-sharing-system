const { DataTypes } = require('sequelize');

/**
 * 管理员操作限制统计模型
 * 用于记录管理员操作限制的统计数据
 */
const AdminOperationRestrictionStats = (sequelize) => {
  const AdminOperationRestrictionStatsModel = sequelize.define('AdminOperationRestrictionStats', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // 关联的限制ID
    restrictionId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '关联的限制ID'
    },
    // 管理员ID
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '管理员ID'
    },
    // 统计日期
    statsDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '统计日期'
    },
    // 统计类型 (日/周/月)
    statsType: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false,
      comment: '统计类型'
    },
    // 总操作次数
    totalOperations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总操作次数'
    },
    // 允许操作次数
    allowedOperations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '允许操作次数'
    },
    // 拒绝操作次数
    deniedOperations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '拒绝操作次数'
    },
    // 限制操作次数
    restrictedOperations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '限制操作次数'
    },
    // 平均处理时间(毫秒)
    avgProcessingTime: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '平均处理时间(毫秒)'
    },
    // 最大处理时间(毫秒)
    maxProcessingTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '最大处理时间(毫秒)'
    },
    // 最小处理时间(毫秒)
    minProcessingTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '最小处理时间(毫秒)'
    },
    // 数据量统计
    dataVolume: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      comment: '数据量统计'
    },
    // 错误次数
    errorCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '错误次数'
    }
  }, {
    tableName: 'admin_operation_restriction_stats',
    timestamps: true,
    comment: '管理员操作限制统计表',
    indexes: [
      {
        unique: true,
        fields: ['restrictionId', 'adminId', 'statsDate', 'statsType']
      }
    ]
  });

  // 定义关联关系
  AdminOperationRestrictionStatsModel.associate = function(models) {
    // 与操作限制关联
    AdminOperationRestrictionStatsModel.belongsTo(models.AdminOperationRestriction, {
      foreignKey: 'restrictionId',
      as: 'restriction'
    });
    
    // 与用户关联
    AdminOperationRestrictionStatsModel.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
  };

  return AdminOperationRestrictionStatsModel;
};

module.exports = AdminOperationRestrictionStats;