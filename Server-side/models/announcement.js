module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '公告标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '公告内容'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否置顶'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否激活'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '创建者ID'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '查看次数'
    }
  }, {
    tableName: 'announcements',
    timestamps: true,
    indexes: [
      {
        fields: ['title']
      },
      {
        fields: ['isPinned']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Announcement.associate = (models) => {
    // 公告与用户关联（创建者）
    Announcement.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Announcement;
};