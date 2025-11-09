const { DataTypes } = require('sequelize');

/**
 * 管理员操作限制异常模型
 * 用于记录管理员操作限制的异常情况
 */
const AdminOperationRestrictionException = (sequelize) => {
  const AdminOperationRestrictionExceptionModel = sequelize.define('AdminOperationRestrictionException', {
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
    // 异常类型
    exceptionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '异常类型'
    },
    // 异常描述
    exceptionDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '异常描述'
    },
    // 异常状态 (待处理/已处理/已忽略)
    exceptionStatus: {
      type: DataTypes.ENUM('pending', 'resolved', 'ignored'),
      defaultValue: 'pending',
      comment: '异常状态'
    },
    // 异常级别 (低/中/高/严重)
    exceptionLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: '异常级别'
    },
    // 异常数据 (JSON格式)
    exceptionData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '异常数据'
    },
    // 处理结果
    resolutionResult: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '处理结果'
    },
    // 处理者ID
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '处理者ID'
    },
    // 处理时间
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '处理时间'
    },
    // 备注
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  }, {
    tableName: 'admin_operation_restriction_exceptions',
    timestamps: true,
    comment: '管理员操作限制异常表'
  });

  // 定义关联关系
  AdminOperationRestrictionExceptionModel.associate = function(models) {
    // 与操作限制关联
    AdminOperationRestrictionExceptionModel.belongsTo(models.AdminOperationRestriction, {
      foreignKey: 'restrictionId',
      as: 'restriction'
    });
    
    // 与用户关联
    AdminOperationRestrictionExceptionModel.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
    
    // 与处理者关联
    AdminOperationRestrictionExceptionModel.belongsTo(models.User, {
      foreignKey: 'resolvedBy',
      as: 'resolver'
    });
  };

  return AdminOperationRestrictionExceptionModel;
};

module.exports = AdminOperationRestrictionException;