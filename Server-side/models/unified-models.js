const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 定义User模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  user_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user', // 'user', 'admin'
    field: 'user_type'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    field: 'avatar_url'
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  full_name: {
    type: DataTypes.STRING(100),
    field: 'full_name'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  last_login_at: {
    type: DataTypes.DATE,
    field: 'last_login_at'
  },
  login_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_count'
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_login_attempts'
  },
  locked_until: {
    type: DataTypes.DATE,
    field: 'locked_until'
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  room_id: {
    type: DataTypes.INTEGER,
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
  tableName: 'room_members',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Bill模型
const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    type: DataTypes.INTEGER,
    allowNull: false
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paid_by: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  expense_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  created_by: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  from_payment_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  to_payment_id: {
    type: DataTypes.INTEGER,
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

// 定义UserToken模型
const UserToken = sequelize.define('UserToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  access_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  device_name: {
    type: DataTypes.STRING(100)
  },
  device_type: {
    type: DataTypes.STRING(20)
  },
  ip_address: {
    type: DataTypes.INET
  },
  user_agent: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'user_tokens',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义UserSession模型
const UserSession = sequelize.define('UserSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  session_token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  device_name: {
    type: DataTypes.STRING(100)
  },
  device_type: {
    type: DataTypes.STRING(20)
  },
  ip_address: {
    type: DataTypes.INET
  },
  user_agent: {
    type: DataTypes.TEXT
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_activity_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'user_sessions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义Role模型
const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  role_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'roles',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义Permission模型
const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  permission_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  resource: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'permissions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义RolePermission模型
const RolePermission = sequelize.define('RolePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  permission_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'role_permissions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义UserRole模型
const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'user_roles',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义AuditLog模型
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  resource_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  old_values: {
    type: DataTypes.JSONB
  },
  new_values: {
    type: DataTypes.JSONB
  },
  ip_address: {
    type: DataTypes.INET
  },
  user_agent: {
    type: DataTypes.TEXT
  },
  session_id: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义Notification模型
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'success'),
    defaultValue: 'info'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  data: {
    type: DataTypes.JSONB
  },
  expires_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义NotificationChannel模型
const NotificationChannel = sequelize.define('NotificationChannel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  channel_type: {
    type: DataTypes.ENUM('email', 'sms', 'push', 'webhook'),
    allowNull: false
  },
  channel_address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'notification_channels',
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
User.hasMany(UserToken, { foreignKey: 'user_id', as: 'userTokens' });
User.hasMany(UserSession, { foreignKey: 'user_id', as: 'userSessions' });
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'userRoles' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasMany(NotificationChannel, { foreignKey: 'user_id', as: 'notificationChannels' });

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

// Role关联
Role.hasMany(RolePermission, { foreignKey: 'role_id', as: 'rolePermissions' });
Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'userRoles' });

// Permission关联
Permission.hasMany(RolePermission, { foreignKey: 'permission_id', as: 'rolePermissions' });

// RolePermission关联
RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });

// UserRole关联
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// UserToken关联
UserToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserSession关联
UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AuditLog关联
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Notification关联
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// NotificationChannel关联
NotificationChannel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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
  PaymentTransfer,
  UserToken,
  UserSession,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  Notification,
  NotificationChannel
};

module.exports = db;