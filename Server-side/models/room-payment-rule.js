const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomPaymentRule = sequelize.define('RoomPaymentRule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '关联的房间ID'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '规则名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '规则描述'
    },
    ruleType: {
      type: DataTypes.ENUM('discount', 'surcharge', 'exemption'),
      allowNull: false,
      defaultValue: 'discount',
      comment: '规则类型：discount-折扣，surcharge-附加费，exemption-豁免'
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'alipay', 'wechat', 'bank_transfer', 'all'),
      allowNull: false,
      defaultValue: 'all',
      comment: '适用的支付方式'
    },
    amountType: {
      type: DataTypes.ENUM('fixed', 'percentage'),
      allowNull: false,
      comment: '金额类型：fixed-固定金额，percentage-百分比'
    },
    fixedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '固定金额（当amountType为fixed时使用）'
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '百分比（当amountType为percentage时使用，0-100）'
    },
    maxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '最大金额限制'
    },
    minAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '最小金额限制'
    },
    applicableBillTypes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['all'],
      comment: '适用的账单类型，数组格式，如["rent", "utilities"]，["all"]表示所有类型'
    },
    applicableUsers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '适用的用户ID列表，数组格式，null表示所有用户'
    },
    applicableTimeRange: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '适用的时间范围，JSON格式：{startTime: "08:00", endTime: "18:00"}'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '优先级，数字越小优先级越高'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deleted'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态：active-激活，inactive-未激活，deleted-已删除'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '创建者ID'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新者ID'
    }
  }, {
    tableName: 'room_payment_rules',
    timestamps: true,
    paranoid: true, // 启用软删除
    indexes: [
      {
        fields: ['roomId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['ruleType']
      },
      {
        fields: ['priority']
      }
    ]
  });

  // 定义关联关系
  RoomPaymentRule.associate = function(models) {
    // 房间支付规则属于一个房间
    RoomPaymentRule.belongsTo(models.Room, {
      foreignKey: 'roomId',
      as: 'room'
    });
    
    // 房间支付规则由一个用户创建
    RoomPaymentRule.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser'
    });
    
    // 房间支付规则可以被一个用户更新
    RoomPaymentRule.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updatedByUser'
    });
    
    // 房间支付规则可以被多个支付记录使用
    RoomPaymentRule.hasMany(models.Payment, {
      foreignKey: 'roomPaymentRuleId',
      as: 'payments'
    });
  };

  return RoomPaymentRule;
};