const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // 管理员权限变更历史模型
  const AdminPermissionHistory = sequelize.define('AdminPermissionHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '管理员ID'
    },
    permissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '权限ID'
    },
    permissionType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '权限类型'
    },
    action: {
      type: DataTypes.ENUM('grant', 'revoke', 'modify'),
      allowNull: false,
      comment: '操作类型'
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '旧值'
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '新值'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '变更原因'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'reverted'),
      defaultValue: 'pending',
      comment: '状态'
    },
    reviewComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '审核评论'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '审核时间'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '审核人ID'
    },
    originalHistoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '原始历史记录ID（用于撤销操作）'
    },
    revertReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '撤销原因'
    },
    revertedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '撤销时间'
    },
    revertedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '撤销人ID'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: '操作IP地址'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理'
    },
    sessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '会话ID'
    }
  }, {
    tableName: 'admin_permission_histories',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['adminId']
      },
      {
        fields: ['permissionId']
      },
      {
        fields: ['permissionType']
      },
      {
        fields: ['action']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['userId', 'permissionType']
      },
      {
        fields: ['adminId', 'createdAt']
      }
    ]
  });

  // 权限变更模板模型
  const PermissionChangeTemplate = sequelize.define('PermissionChangeTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '模板名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '模板描述'
    },
    permissionType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '权限类型'
    },
    action: {
      type: DataTypes.ENUM('grant', 'revoke', 'modify'),
      allowNull: false,
      comment: '操作类型'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '变更原因'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建人ID'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新人ID'
    }
  }, {
    tableName: 'permission_change_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['permissionType']
      },
      {
        fields: ['action']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  // 权限变更自动化规则模型
  const PermissionAutomationRule = sequelize.define('PermissionAutomationRule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '触发条件'
    },
    actions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '执行动作'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否激活'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建人ID'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新人ID'
    }
  }, {
    tableName: 'permission_automation_rules',
    timestamps: true,
    indexes: [
      {
        fields: ['isActive']
      }
    ]
  });

  // 权限变更通知设置模型
  const PermissionNotificationSettings = sequelize.define('PermissionNotificationSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用邮件通知'
    },
    smsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否启用短信通知'
    },
    inAppEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用应用内通知'
    },
    webhookEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否启用Webhook通知'
    },
    webhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Webhook URL'
    },
    notificationEvents: {
      type: DataTypes.JSON,
      defaultValue: ['created', 'approved', 'rejected', 'reverted'],
      comment: '通知事件'
    }
  }, {
    tableName: 'permission_notification_settings',
    timestamps: true
  });

  // 权限变更备份模型
  const PermissionChangeBackup = sequelize.define('PermissionChangeBackup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '备份名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备份描述'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '备份文件名'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '备份文件路径'
    },
    includeInactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否包含非活跃记录'
    },
    recordCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '记录数量'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建人ID'
    }
  }, {
    tableName: 'permission_change_backups',
    timestamps: true,
    indexes: [
      {
        fields: ['createdBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // 定义模型关联关系
  const associate = (models) => {
    // AdminPermissionHistory 关联
    AdminPermissionHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    AdminPermissionHistory.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
    AdminPermissionHistory.belongsTo(models.User, { foreignKey: 'reviewedBy', as: 'reviewer' });
    AdminPermissionHistory.belongsTo(models.User, { foreignKey: 'revertedBy', as: 'reverter' });
    AdminPermissionHistory.belongsTo(models.Permission, { foreignKey: 'permissionId', as: 'permission' });
    AdminPermissionHistory.belongsTo(AdminPermissionHistory, { foreignKey: 'originalHistoryId', as: 'originalHistory' });
    AdminPermissionHistory.hasMany(AdminPermissionHistory, { foreignKey: 'originalHistoryId', as: 'revertHistory' });

    // PermissionChangeTemplate 关联
    PermissionChangeTemplate.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PermissionChangeTemplate.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });

    // PermissionAutomationRule 关联
    PermissionAutomationRule.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    PermissionAutomationRule.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });

    // PermissionChangeBackup 关联
    PermissionChangeBackup.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  };

  return {
    AdminPermissionHistory,
    PermissionChangeTemplate,
    PermissionAutomationRule,
    PermissionNotificationSettings,
    PermissionChangeBackup,
    associate
  };
};