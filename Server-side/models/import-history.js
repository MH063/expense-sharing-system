module.exports = (sequelize, DataTypes) => {
  const ImportHistory = sequelize.define('ImportHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '导入类型'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '文件名'
    },
    totalRecords: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '总记录数'
    },
    successCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '成功记录数'
    },
    failureCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '失败记录数'
    },
    errors: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误详情（JSON格式）'
    },
    importedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '导入者ID'
    }
  }, {
    tableName: 'import_histories',
    timestamps: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['importedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ImportHistory.associate = (models) => {
    // 导入历史与用户关联（导入者）
    ImportHistory.belongsTo(models.User, {
      foreignKey: 'importedBy',
      as: 'importer'
    });
  };

  return ImportHistory;
};