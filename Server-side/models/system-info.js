module.exports = (sequelize, DataTypes) => {
  const SystemInfo = sequelize.define('SystemInfo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    systemName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '记账系统',
      comment: '系统名称'
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0.0',
      comment: '系统版本'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '系统描述'
    },
    contactEmail: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '联系邮箱'
    },
    copyright: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '版权信息'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否激活'
    }
  }, {
    tableName: 'system_infos',
    timestamps: true,
    indexes: [
      {
        fields: ['systemName']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return SystemInfo;
};