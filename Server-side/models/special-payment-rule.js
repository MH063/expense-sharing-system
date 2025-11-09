const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SpecialPaymentRule = sequelize.define('SpecialPaymentRule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '规则名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '规则描述'
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '适用房间ID'
    },
    type: {
      type: DataTypes.ENUM('discount', 'surcharge', 'exemption'),
      allowNull: false,
      comment: '规则类型：折扣、附加费、豁免'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '金额或百分比'
    },
    amountType: {
      type: DataTypes.ENUM('fixed', 'percentage'),
      allowNull: false,
      comment: '金额类型：固定金额、百分比'
    },
    applicableBillTypes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: '适用的账单类型'
    },
    applicableUsers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '适用的用户ID列表，null表示适用所有用户'
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '规则条件，如最低金额限制等'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '规则生效开始日期'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '规则失效日期'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建者ID'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新者ID'
    }
  }, {
    tableName: 'special_payment_rules',
    timestamps: true,
    paranoid: true, // 软删除
    indexes: [
      {
        fields: ['roomId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['startDate', 'endDate']
      }
    ]
  });

  SpecialPaymentRule.associate = function(models) {
    // 关联房间
    SpecialPaymentRule.belongsTo(models.Room, {
      foreignKey: 'roomId',
      as: 'room'
    });

    // 关联创建者
    SpecialPaymentRule.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // 关联更新者
    SpecialPaymentRule.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // 关联支付记录
    SpecialPaymentRule.hasMany(models.Payment, {
      foreignKey: 'specialPaymentRuleId',
      as: 'payments'
    });
  };

  return SpecialPaymentRule;
};