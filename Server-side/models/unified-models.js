const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 定义User模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
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
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Room模型
const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  code: {
    type: DataTypes.STRING,
    unique: true
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'rooms',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义RoomMember模型
const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  relation_type: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    allowNull: false,
    defaultValue: 'member'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  join_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'user_room_relations',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Bill模型
const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PARTIAL', 'PAID', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'bills',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Payment模型
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  bill_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'alipay', 'wechat', 'other'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  is_offline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sync_status: {
    type: DataTypes.ENUM('synced', 'pending', 'failed'),
    defaultValue: 'synced'
  },
  device_id: {
    type: DataTypes.STRING
  },
  transaction_id: {
    type: DataTypes.STRING
  },
  receipt: {
    type: DataTypes.TEXT
  },
  synced_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'payments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义OfflinePayment模型
const OfflinePayment = sequelize.define('OfflinePayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  bill_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'transfer', 'alipay', 'wechat', 'other'),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  payment_time: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    defaultValue: 'pending'
  },
  last_sync_attempt: {
    type: DataTypes.DATE
  },
  sync_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  synced_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'offline_payments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义PaymentReminder模型
const PaymentReminder = sequelize.define('PaymentReminder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  bill_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reminder_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  reminder_type: {
    type: DataTypes.ENUM('email', 'sms', 'push'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending'
  },
  sent_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'payment_reminders',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义ExpenseType模型
const ExpenseType = sequelize.define('ExpenseType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  icon: {
    type: DataTypes.STRING
  },
  color: {
    type: DataTypes.STRING
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'expense_types',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Expense模型
const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
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
  category_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paid_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  receipt_image: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'expenses',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义ExpenseSplit模型
const ExpenseSplit = sequelize.define('ExpenseSplit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  expense_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'expense_splits',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义InviteCode模型
const InviteCode = sequelize.define('InviteCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE
  },
  max_uses: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'invite_codes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义QRCode模型
const QRCode = sequelize.define('QRCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('payment', 'invite', 'join'),
    allowNull: false
  },
  data: {
    type: DataTypes.JSON
  },
  expires_at: {
    type: DataTypes.DATE
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'qr_codes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义SpecialPaymentRule模型
const SpecialPaymentRule = sequelize.define('SpecialPaymentRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rule_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'special_payment_rules',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义PaymentTransfer模型
const PaymentTransfer = sequelize.define('PaymentTransfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  from_payment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  to_payment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'payment_transfers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义模型关联关系
// User关联
User.hasMany(Room, { foreignKey: 'creator_id', as: 'createdRooms' });
User.hasMany(RoomMember, { foreignKey: 'user_id', as: 'roomMemberships' });
User.hasMany(Bill, { foreignKey: 'creator_id', as: 'createdBills' });
User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
User.hasMany(OfflinePayment, { foreignKey: 'user_id', as: 'offlinePayments' });
User.hasMany(PaymentReminder, { foreignKey: 'user_id', as: 'paymentReminders' });
User.hasMany(Expense, { foreignKey: 'paid_by', as: 'paidExpenses' });
User.hasMany(ExpenseSplit, { foreignKey: 'user_id', as: 'expenseSplits' });
User.hasMany(InviteCode, { foreignKey: 'created_by', as: 'createdInviteCodes' });
User.hasMany(SpecialPaymentRule, { foreignKey: 'user_id', as: 'specialPaymentRules' });

// Room关联
Room.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Room.hasMany(RoomMember, { foreignKey: 'room_id', as: 'members' });
Room.hasMany(Bill, { foreignKey: 'room_id', as: 'bills' });
Room.hasMany(Expense, { foreignKey: 'room_id', as: 'expenses' });
Room.hasMany(InviteCode, { foreignKey: 'room_id', as: 'inviteCodes' });
Room.hasMany(QRCode, { foreignKey: 'room_id', as: 'qrCodes' });
Room.hasMany(SpecialPaymentRule, { foreignKey: 'room_id', as: 'specialPaymentRules' });

// RoomMember关联
RoomMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
RoomMember.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// Bill关联
Bill.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
Bill.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Bill.hasMany(Payment, { foreignKey: 'bill_id', as: 'payments' });
Bill.hasMany(OfflinePayment, { foreignKey: 'bill_id', as: 'offlinePayments' });
Bill.hasMany(PaymentReminder, { foreignKey: 'bill_id', as: 'reminders' });

// Payment关联
Payment.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Payment.hasMany(PaymentTransfer, { foreignKey: 'from_payment_id', as: 'outgoingTransfers' });
Payment.hasMany(PaymentTransfer, { foreignKey: 'to_payment_id', as: 'incomingTransfers' });

// OfflinePayment关联
OfflinePayment.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });
OfflinePayment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PaymentReminder关联
PaymentReminder.belongsTo(Bill, { foreignKey: 'bill_id', as: 'bill' });
PaymentReminder.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ExpenseType关联
ExpenseType.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });

// Expense关联
Expense.belongsTo(ExpenseType, { foreignKey: 'category_id', as: 'category' });
Expense.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
Expense.belongsTo(User, { foreignKey: 'paid_by', as: 'payer' });
Expense.hasMany(ExpenseSplit, { foreignKey: 'expense_id', as: 'splits' });

// ExpenseSplit关联
ExpenseSplit.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
ExpenseSplit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// InviteCode关联
InviteCode.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
InviteCode.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// QRCode关联
QRCode.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// SpecialPaymentRule关联
SpecialPaymentRule.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
SpecialPaymentRule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PaymentTransfer关联
PaymentTransfer.belongsTo(Payment, { foreignKey: 'from_payment_id', as: 'fromPayment' });
PaymentTransfer.belongsTo(Payment, { foreignKey: 'to_payment_id', as: 'toPayment' });

// 导出所有模型
const db = {
  sequelize,
  Sequelize,
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

module.exports = db;