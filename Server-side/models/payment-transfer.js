/**
 * 支付转移记录模型
 * 定义支付转移记录的数据结构和关联关系
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentTransfer = sequelize.define('PaymentTransfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bills',
      key: 'id'
    },
    comment: '关联的账单ID'
  },
  transferType: {
    type: DataTypes.ENUM('self_pay', 'multiple_payers', 'payer_transfer'),
    allowNull: false,
    comment: '转移类型：self_pay-本人支付，multiple_payers-多人支付，payer_transfer-缴费人之间转移'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '转移金额'
  },
  fromUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '付款人ID'
  },
  toUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '收款人ID'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'pending',
    comment: '转移状态：pending-待确认，completed-已完成，cancelled-已取消'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '确认时间'
  },
  confirmedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '确认人ID'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '取消人ID'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '创建人ID'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '更新人ID'
  }
}, {
  tableName: 'payment_transfers',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['billId']
    },
    {
      fields: ['fromUserId']
    },
    {
      fields: ['toUserId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['transferType']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = PaymentTransfer;