const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * 系统维护任务模型
 */
const SystemMaintenanceTask = sequelize.define('SystemMaintenanceTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  task_type: {
    type: DataTypes.ENUM('cache_clear', 'temp_cleanup', 'db_optimize', 'backup', 'update', 'custom'),
    allowNull: false
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  result: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'system_maintenance_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * 系统维护报告模型
 */
const SystemMaintenanceReport = sequelize.define('SystemMaintenanceReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  report_type: {
    type: DataTypes.ENUM('system_health', 'performance', 'error_logs', 'maintenance_tasks', 'custom'),
    allowNull: false
  },
  content: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'system_maintenance_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

/**
 * 系统备份模型
 */
const SystemBackup = sequelize.define('SystemBackup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  path: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  backup_type: {
    type: DataTypes.ENUM('full', 'incremental', 'differential'),
    allowNull: false,
    defaultValue: 'full'
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'in_progress'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'system_backups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

/**
 * 系统警告模型
 */
const SystemWarning = sequelize.define('SystemWarning', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
    allowNull: false,
    defaultValue: 'warning'
  },
  status: {
    type: DataTypes.ENUM('active', 'resolved', 'ignored'),
    allowNull: false,
    defaultValue: 'active'
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  resolution_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'system_warnings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

/**
 * 系统维护日志模型
 */
const SystemMaintenanceLog = sequelize.define('SystemMaintenanceLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  result: {
    type: DataTypes.ENUM('success', 'failed', 'partial'),
    allowNull: false
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'system_maintenance_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义关联关系
SystemMaintenanceTask.belongsTo(sequelize.models.User, { foreignKey: 'created_by', as: 'creator' });
SystemMaintenanceTask.belongsTo(sequelize.models.User, { foreignKey: 'updated_by', as: 'updater' });

SystemMaintenanceReport.belongsTo(sequelize.models.User, { foreignKey: 'created_by', as: 'creator' });

SystemBackup.belongsTo(sequelize.models.User, { foreignKey: 'created_by', as: 'creator' });

SystemWarning.belongsTo(sequelize.models.User, { foreignKey: 'resolved_by', as: 'resolver' });

SystemMaintenanceLog.belongsTo(sequelize.models.User, { foreignKey: 'created_by', as: 'creator' });

module.exports = {
  SystemMaintenanceTask,
  SystemMaintenanceReport,
  SystemBackup,
  SystemWarning,
  SystemMaintenanceLog
};