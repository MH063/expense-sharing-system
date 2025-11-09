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

// 导入数据导出模型
const { ExportTemplate, ExportHistory, ExportConfig, defineDataExportAssociations } = require('./data-export-models');

// 导入缓存管理模型
const { CacheStat, CacheKeyInfo, CacheConfig, CacheSlowLog, CacheBackup, defineCacheManagementAssociations } = require('./cache-management-models');

// 导入密码重置相关模型
const {
  PasswordResetToken,
  PasswordResetLog,
  PasswordResetConfig,
  PasswordResetTemplate,
  PasswordResetAuditLog,
  PasswordResetTask,
  PasswordResetConfigTemplate,
  definePasswordResetAssociations
} = require('./password-reset-models');

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
    allowNull: false,
    comment: '实际支付金额（应用特殊规则后）'
  },
  originalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '原始应付金额（应用特殊规则前）'
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
  },
  specialPaymentRuleId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '应用的特殊支付规则ID'
  },
  roomPaymentRuleId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '应用的房间支付规则ID'
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

// 导入特殊支付规则模型
const SpecialPaymentRule = require('./special-payment-rule')(sequelize);

// 导入房间支付规则模型
const RoomPaymentRule = require('./room-payment-rule')(sequelize);

// 导入活动模型
const Activity = require('./activity')(sequelize);

// 导入活动参与者模型
const ActivityParticipant = require('./activity-participant')(sequelize);

// 导入权限模型
const Permission = require('./permission')(sequelize);

// 导入角色权限关联模型
const RolePermission = require('./role-permission')(sequelize);

// 导入用户权限关联模型
const UserPermission = require('./user-permission')(sequelize);

// 导入系统信息模型
const SystemInfo = require('./system-info')(sequelize);

// 导入公告模型
const Announcement = require('./announcement')(sequelize);

// 导入帮助文档模型
const HelpDocument = require('./help-document')(sequelize);

// 导入反馈模型
const Feedback = require('./feedback')(sequelize);

// 导入常用链接模型
const CommonLink = require('./common-link')(sequelize);

// 导入上传文件模型
const UploadFile = require('./upload-file')(sequelize);

// 导入导入历史模型
const ImportHistory = require('./import-history')(sequelize);

// 文档管理相关模型
const {
  Docs,
  DocsCategory,
  DocsTag,
  DocsComment,
  DocsVersion,
  DocsLike,
  DocsFavorite,
  DocsRead,
  DocsAttachment
} = require('./docs');

// 管理员会话管理相关模型
const {
  AdminSession,
  SessionActivityLog,
  SessionAnomaly,
  SessionRiskAssessment
} = require('./adminSession');

// 管理员权限变更历史相关模型
const {
  AdminPermissionHistory,
  PermissionChangeTemplate,
  PermissionAutomationRule,
  PermissionNotificationSettings,
  PermissionChangeBackup
} = require('./adminPermissionHistory');

// 管理员操作限制相关模型
const {
  AdminOperationRestriction,
  AdminOperationRestrictionLog,
  AdminOperationRestrictionStats,
  AdminOperationRestrictionException,
  AdminOperationRestrictionConfig
} = require('./adminOperationRestrictionModels');

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

// 特殊支付规则关联
Payment.belongsTo(SpecialPaymentRule, { foreignKey: 'specialPaymentRuleId', as: 'specialPaymentRule' });

// 房间支付规则关联
Payment.belongsTo(RoomPaymentRule, { foreignKey: 'roomPaymentRuleId', as: 'roomPaymentRule' });

// 房间支付规则模型关联
RoomPaymentRule.associate({ Room, User, Payment });

// 活动模型关联
Activity.associate({ Room, User, ActivityParticipant });

// 活动参与者模型关联
ActivityParticipant.associate({ Activity, User });

// 权限模型关联
Permission.associate({ Role, User, RolePermission, UserPermission });

// 角色权限关联模型关联
RolePermission.associate({ Role, Permission });

// 用户权限关联模型关联
UserPermission.associate({ User, Permission });

// 系统信息模型关联
SystemInfo.associate({ User });

// 公告模型关联
Announcement.associate({ User });

// 帮助文档模型关联
HelpDocument.associate({ User });

// 反馈模型关联
Feedback.associate({ User });

// 常用链接模型关联
CommonLink.associate({ User });

// 上传文件模型关联
UploadFile.associate({ User });

// 导入历史模型关联
ImportHistory.associate({ User });

// 文档管理模型关联
Docs.associate({ User, DocsCategory, DocsTag, DocsComment, DocsVersion, DocsLike, DocsFavorite, DocsRead, DocsAttachment });
DocsCategory.associate({ Docs });
DocsTag.associate({ Docs });
DocsComment.associate({ Docs, User });
DocsVersion.associate({ Docs, User });
DocsLike.associate({ Docs, User });
DocsFavorite.associate({ Docs, User });
DocsRead.associate({ Docs, User });
DocsAttachment.associate({ Docs, User });

// 管理员会话管理模型关联
AdminSession.associate({ User, SessionActivityLog, SessionAnomaly, SessionRiskAssessment });
SessionActivityLog.associate({ AdminSession });
SessionAnomaly.associate({ AdminSession });
SessionRiskAssessment.associate({ AdminSession });

// 管理员权限变更历史模型关联
AdminPermissionHistory.associate({ User, Permission });
PermissionChangeTemplate.associate({ User });
PermissionAutomationRule.associate({ User });
PermissionChangeBackup.associate({ User });

// 管理员操作限制模型关联
AdminOperationRestriction.associate({ User, AdminOperationRestrictionLog, AdminOperationRestrictionStats, AdminOperationRestrictionException });
AdminOperationRestrictionLog.associate({ AdminOperationRestriction, User, AdminSession });
AdminOperationRestrictionStats.associate({ AdminOperationRestriction, User });
AdminOperationRestrictionException.associate({ AdminOperationRestriction, User });
AdminOperationRestrictionConfig.associate({ User });

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

// 特殊支付规则模型关联已在模型文件中定义

Payment.hasMany(PaymentTransfer, { foreignKey: 'fromPaymentId', as: 'outgoingTransfers' });
PaymentTransfer.belongsTo(Payment, { foreignKey: 'fromPaymentId', as: 'fromPayment' });

Payment.hasMany(PaymentTransfer, { foreignKey: 'toPaymentId', as: 'incomingTransfers' });
PaymentTransfer.belongsTo(Payment, { foreignKey: 'toPaymentId', as: 'toPayment' });

User.hasMany(PaymentTransfer, { foreignKey: 'createdBy', as: 'createdPaymentTransfers' });
PaymentTransfer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 导入系统维护模型
const {
  SystemMaintenanceTask,
  SystemMaintenanceReport,
  SystemBackup,
  SystemWarning,
  SystemMaintenanceLog
} = require('./system-maintenance');

// 导入第三方账号管理模型
const {
  ThirdPartyPlatform,
  ThirdPartyAccount,
  ThirdPartyAccountLog,
  defineThirdPartyAccountAssociations
} = require('./third-party-account-models');

// 导入用户资料和设置模型
const { UserProfile, UserSetting, UserActivityLog, LoginHistory, defineUserProfileAssociations } = require('./user-profile-models');

// 调用数据导出模型关联定义函数
defineDataExportAssociations(sequelize.models);

// 调用缓存管理模型关联定义函数
defineCacheManagementAssociations(sequelize.models);

// 调用密码重置模型关联定义函数
definePasswordResetAssociations(sequelize.models);

// 调用第三方账号管理模型关联定义函数
defineThirdPartyAccountAssociations(sequelize.models);

// 调用用户资料和设置模型关联定义函数
defineUserProfileAssociations(sequelize.models);

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
  RoomPaymentRule,
  PaymentTransfer,
  Activity,
  ActivityParticipant,
  Permission,
  RolePermission,
  UserPermission,
  SystemInfo,
  Announcement,
  HelpDocument,
  Feedback,
  CommonLink,
  UploadFile,
  ImportHistory,
  // 文档管理相关模型
  Docs,
  DocsCategory,
  DocsTag,
  DocsComment,
  DocsVersion,
  DocsLike,
  DocsFavorite,
  DocsRead,
  DocsAttachment,
  // 管理员会话管理相关模型
  AdminSession,
  SessionActivityLog,
  SessionAnomaly,
  SessionRiskAssessment,
  // 管理员权限变更历史相关模型
  AdminPermissionHistory,
  PermissionChangeTemplate,
  PermissionAutomationRule,
  PermissionNotificationSettings,
  PermissionChangeBackup,
  // 管理员操作限制相关模型
  AdminOperationRestriction,
  AdminOperationRestrictionLog,
  AdminOperationRestrictionStats,
  AdminOperationRestrictionException,
  AdminOperationRestrictionConfig,
  Notification,
  // 导入系统维护相关模型
  SystemMaintenanceTask,
  SystemMaintenanceReport,
  SystemBackup,
  SystemWarning,
  SystemMaintenanceLog,
  // 密码重置相关模型
  PasswordResetToken,
  PasswordResetLog,
  PasswordResetConfig,
  PasswordResetTemplate,
  PasswordResetAuditLog,
  PasswordResetTask,
  PasswordResetConfigTemplate,
  // 第三方账号管理相关模型
  ThirdPartyPlatform,
  ThirdPartyAccount,
  ThirdPartyAccountLog,
  // 导出用户资料和设置相关模型
  UserProfile,
  UserSetting,
  UserActivityLog,
  LoginHistory,
  // 导出缓存管理相关模型
  CacheStat, CacheKeyInfo, CacheConfig, CacheSlowLog, CacheBackup,
  // 导出数据导出相关模型
  ExportTemplate, ExportHistory, ExportConfig,
};