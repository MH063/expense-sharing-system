module.exports = (sequelize, DataTypes) => {
  const CommonLink = sequelize.define('CommonLink', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '链接标题'
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '链接地址'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '链接描述'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'general',
      comment: '链接分类'
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序'
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
    clickCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '点击次数'
    }
  }, {
    tableName: 'common_links',
    timestamps: true,
    indexes: [
      {
        fields: ['title']
      },
      {
        fields: ['category']
      },
      {
        fields: ['order']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  CommonLink.associate = (models) => {
    // 常用链接与用户关联（创建者）
    CommonLink.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return CommonLink;
};