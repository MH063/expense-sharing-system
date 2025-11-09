const { DataTypes } = require('sequelize');

/**
 * 管理员操作限制日志模型
 * 用于记录管理员操作限制的触发和执行日志
 */
const AdminOperationRestrictionLog = (sequelize) => {
  const AdminOperationRestrictionLogModel = sequelize.define('AdminOperationRestrictionLog', {
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
    // 操作类型
    operationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '操作类型'
    },
    // 操作描述
    operationDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '操作描述'
    },
    // 操作结果 (允许/拒绝/限制)
    operationResult: {
      type: DataTypes.ENUM('allowed', 'denied', 'restricted'),
      allowNull: false,
      comment: '操作结果'
    },
    // 拒绝原因
    denialReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '拒绝原因'
    },
    // IP地址
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP地址'
    },
    // 用户代理
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理'
    },
    // 请求数据 (JSON格式)
    requestData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '请求数据'
    },
    // 响应数据 (JSON格式)
    responseData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '响应数据'
    },
    // 处理时间(毫秒)
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '处理时间(毫秒)'
    },
    // 会话ID
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '会话ID'
    }
  }, {
    tableName: 'admin_operation_restriction_logs',
    timestamps: true,
    comment: '管理员操作限制日志表'
  });

  // 定义关联关系
  AdminOperationRestrictionLogModel.associate = function(models) {
    // 与操作限制关联
    AdminOperationRestrictionLogModel.belongsTo(models.AdminOperationRestriction, {
      foreignKey: 'restrictionId',
      as: 'restriction'
    });
    
    // 与用户关联
    AdminOperationRestrictionLogModel.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
    
    // 与会话关联
    AdminOperationRestrictionLogModel.belongsTo(models.AdminSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });
  };

  return AdminOperationRestrictionLogModel;
};

module.exports = AdminOperationRestrictionLog;