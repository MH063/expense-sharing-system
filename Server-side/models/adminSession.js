const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  /**
   * 管理员会话模型
   * 用于跟踪管理员登录会话信息
   */
  const AdminSession = sequelize.define('AdminSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: '登录IP地址'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '用户代理字符串'
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'revoked'),
      defaultValue: 'active',
      comment: '会话状态'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    lastAccessAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后访问时间'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '过期时间'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '撤销时间'
    },
    revokedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '撤销操作的管理员ID'
    },
    revokeReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '撤销原因'
    },
    extendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '延长时间'
    },
    extendedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '延长操作的管理员ID'
    },
    extensionReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '延长原因'
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low',
      comment: '风险级别'
    },
    riskScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '风险评分'
    },
    riskReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '风险原因'
    },
    markedSuspiciousAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '标记为可疑的时间'
    },
    markedSuspiciousBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '标记为可疑的管理员ID'
    },
    isNewLocation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否为新地点登录'
    },
    isNewDevice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否为新设备登录'
    },
    isUnusualTime: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否为异常时间登录'
    },
    hasMultipleFailedLogins: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否有多次失败登录记录'
    },
    accessRestrictions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '访问限制配置'
    },
    restrictionsUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '限制更新时间'
    },
    restrictionsUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '限制更新的管理员ID'
    }
  }, {
    tableName: 'AdminSessions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['token']
      },
      {
        fields: ['status']
      },
      {
        fields: ['ipAddress']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['riskLevel']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  /**
   * 会话活动日志模型
   * 记录会话期间的活动
   */
  const SessionActivityLog = sequelize.define('SessionActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'AdminSessions',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '活动类型'
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '活动详情'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: '活动IP地址'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '活动用户代理'
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '访问的端点'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP方法'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '响应状态码'
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '响应时间(毫秒)'
    },
    requestData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '请求数据'
    },
    responseData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '响应数据'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'SessionActivityLogs',
    timestamps: true,
    indexes: [
      {
        fields: ['sessionId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['ipAddress']
      }
    ]
  });

  /**
   * 会话异常行为模型
   * 记录会话期间的异常行为
   */
  const SessionAnomaly = sequelize.define('SessionAnomaly', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'AdminSessions',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '异常类型'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '异常描述'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: '严重程度'
    },
    detectedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '检测时间'
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否已解决'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '解决时间'
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: '解决人ID'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '异常元数据'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'SessionAnomalies',
    timestamps: true,
    indexes: [
      {
        fields: ['sessionId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['resolved']
      },
      {
        fields: ['detectedAt']
      }
    ]
  });

  /**
   * 会话风险评估模型
   * 记录会话的风险评估结果
   */
  const SessionRiskAssessment = sequelize.define('SessionRiskAssessment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'AdminSessions',
        key: 'id'
      }
    },
    riskScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '风险评分(0-100)'
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      comment: '风险级别'
    },
    factors: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '风险因素'
    },
    recommendations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '建议措施'
    },
    assessedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '评估时间'
    },
    assessedBy: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '评估方式(自动/手动)'
    },
    nextAssessmentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '下次评估时间'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'SessionRiskAssessments',
    timestamps: true,
    indexes: [
      {
        fields: ['sessionId']
      },
      {
        fields: ['riskLevel']
      },
      {
        fields: ['assessedAt']
      }
    ]
  });

  /**
   * 定义模型关联关系
   */
  AdminSession.associate = (models) => {
    // 会话属于用户
    AdminSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 会话被管理员撤销
    AdminSession.belongsTo(models.User, {
      foreignKey: 'revokedBy',
      as: 'revokedByUser'
    });

    // 会话被管理员延长
    AdminSession.belongsTo(models.User, {
      foreignKey: 'extendedBy',
      as: 'extendedByUser'
    });

    // 会话被管理员标记为可疑
    AdminSession.belongsTo(models.User, {
      foreignKey: 'markedSuspiciousBy',
      as: 'markedSuspiciousByUser'
    });

    // 会话的限制被管理员更新
    AdminSession.belongsTo(models.User, {
      foreignKey: 'restrictionsUpdatedBy',
      as: 'restrictionsUpdatedByUser'
    });

    // 会话有多个活动日志
    AdminSession.hasMany(SessionActivityLog, {
      foreignKey: 'sessionId',
      as: 'activityLogs'
    });

    // 会话有多个异常行为
    AdminSession.hasMany(SessionAnomaly, {
      foreignKey: 'sessionId',
      as: 'anomalies'
    });

    // 会话有多个风险评估
    AdminSession.hasMany(SessionRiskAssessment, {
      foreignKey: 'sessionId',
      as: 'riskAssessments'
    });
  };

  SessionActivityLog.associate = (models) => {
    // 活动日志属于会话
    SessionActivityLog.belongsTo(AdminSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });
  };

  SessionAnomaly.associate = (models) => {
    // 异常行为属于会话
    SessionAnomaly.belongsTo(AdminSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });

    // 异常行为被用户解决
    SessionAnomaly.belongsTo(models.User, {
      foreignKey: 'resolvedBy',
      as: 'resolvedByUser'
    });
  };

  SessionRiskAssessment.associate = (models) => {
    // 风险评估属于会话
    SessionRiskAssessment.belongsTo(AdminSession, {
      foreignKey: 'sessionId',
      as: 'session'
    });
  };

  return {
    AdminSession,
    SessionActivityLog,
    SessionAnomaly,
    SessionRiskAssessment
  };
};