/**
 * 数据模型定义
 * 定义所有数据库表的模型和关联关系
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// 确保环境变量已加载
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });

const sequelize = require('../config/database');

// 定义用户模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义房间模型
const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义房间成员模型
const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('creator', 'admin', 'member'),
    defaultValue: 'member'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'room_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义账单模型
const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'paid', 'overdue'),
    defaultValue: 'pending'
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'bills',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义支付记录模型
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bill,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义离线支付记录模型
const OfflinePayment = sequelize.define('OfflinePayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bill,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    defaultValue: 'pending'
  },
  syncAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastSyncAttempt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'offline_payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义支付提醒模型
const PaymentReminder = sequelize.define('PaymentReminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Bill,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  reminderTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  reminderType: {
    type: DataTypes.ENUM('email', 'sms', 'push'),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payment_reminders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义费用类型模型
const ExpenseType = sequelize.define('ExpenseType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'expense_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义费用记录模型
const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ExpenseType,
      key: 'id'
    }
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  paidBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义费用分摊模型
const ExpenseSplit = sequelize.define('ExpenseSplit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  expenseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Expense,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'expense_splits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义邀请码模型
const InviteCode = sequelize.define('InviteCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'invite_codes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义二维码模型
const QRCode = sequelize.define('QRCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'qr_codes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义特殊支付规则模型
const SpecialPaymentRule = sequelize.define('SpecialPaymentRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  ruleType: {
    type: DataTypes.ENUM('fixed_amount', 'percentage', 'custom'),
    allowNull: false
  },
  ruleValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  appliesTo: {
    type: DataTypes.JSON,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'special_payment_rules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义支付转移模型
const PaymentTransfer = sequelize.define('PaymentTransfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fromPaymentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Payment,
      key: 'id'
    }
  },
  toPaymentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Payment,
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'payment_transfers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义模型关联关系
User.hasMany(Room, { foreignKey: 'creatorId', as: 'createdRooms' });
Room.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

User.hasMany(RoomMember, { foreignKey: 'userId', as: 'roomMemberships' });
RoomMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Room.hasMany(RoomMember, { foreignKey: 'roomId', as: 'members' });
RoomMember.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(Bill, { foreignKey: 'createdBy', as: 'createdBills' });
Bill.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Room.hasMany(Bill, { foreignKey: 'roomId', as: 'bills' });
Bill.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Bill.hasMany(Payment, { foreignKey: 'billId', as: 'payments' });
Payment.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

User.hasMany(OfflinePayment, { foreignKey: 'userId', as: 'offlinePayments' });
OfflinePayment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Bill.hasMany(OfflinePayment, { foreignKey: 'billId', as: 'offlinePayments' });
OfflinePayment.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

User.hasMany(PaymentReminder, { foreignKey: 'userId', as: 'paymentReminders' });
PaymentReminder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Bill.hasMany(PaymentReminder, { foreignKey: 'billId', as: 'paymentReminders' });
PaymentReminder.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

ExpenseType.hasMany(Expense, { foreignKey: 'categoryId', as: 'expenses' });
Expense.belongsTo(ExpenseType, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Expense, { foreignKey: 'paidBy', as: 'paidExpenses' });
Expense.belongsTo(User, { foreignKey: 'paidBy', as: 'payer' });

User.hasMany(Expense, { foreignKey: 'createdBy', as: 'createdExpenses' });
Expense.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Room.hasMany(Expense, { foreignKey: 'roomId', as: 'expenses' });
Expense.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Expense.hasMany(ExpenseSplit, { foreignKey: 'expenseId', as: 'splits' });
ExpenseSplit.belongsTo(Expense, { foreignKey: 'expenseId', as: 'expense' });

User.hasMany(ExpenseSplit, { foreignKey: 'userId', as: 'expenseSplits' });
ExpenseSplit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Room.hasMany(InviteCode, { foreignKey: 'roomId', as: 'inviteCodes' });
InviteCode.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(InviteCode, { foreignKey: 'createdBy', as: 'createdInviteCodes' });
InviteCode.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(InviteCode, { foreignKey: 'usedBy', as: 'usedInviteCodes' });
InviteCode.belongsTo(User, { foreignKey: 'usedBy', as: 'user' });

Room.hasMany(QRCode, { foreignKey: 'roomId', as: 'qrCodes' });
QRCode.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(QRCode, { foreignKey: 'createdBy', as: 'createdQRCodes' });
QRCode.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Room.hasMany(SpecialPaymentRule, { foreignKey: 'roomId', as: 'specialPaymentRules' });
SpecialPaymentRule.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

User.hasMany(SpecialPaymentRule, { foreignKey: 'createdBy', as: 'createdSpecialPaymentRules' });
SpecialPaymentRule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Payment.hasMany(PaymentTransfer, { foreignKey: 'fromPaymentId', as: 'outgoingTransfers' });
PaymentTransfer.belongsTo(Payment, { foreignKey: 'fromPaymentId', as: 'fromPayment' });

Payment.hasMany(PaymentTransfer, { foreignKey: 'toPaymentId', as: 'incomingTransfers' });
PaymentTransfer.belongsTo(Payment, { foreignKey: 'toPaymentId', as: 'toPayment' });

User.hasMany(PaymentTransfer, { foreignKey: 'createdBy', as: 'createdPaymentTransfers' });
PaymentTransfer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// 导出所有模型
module.exports = {
  sequelize,
  User,
  Room,
  RoomMember,
  Bill,
  Payment,
  OfflinePayment,
  PaymentReminder,
  ExpenseType,
  Expense,
  ExpenseSplit,
  InviteCode,
  QRCode,
  SpecialPaymentRule,
  PaymentTransfer
};