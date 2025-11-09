module.exports = (sequelize, DataTypes) => {
  const HelpDocument = sequelize.define('HelpDocument', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '文档标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '文档内容'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'general',
      comment: '文档分类'
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '标签，逗号分隔'
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
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '作者ID'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '查看次数'
    }
  }, {
    tableName: 'help_documents',
    timestamps: true,
    indexes: [
      {
        fields: ['title']
      },
      {
        fields: ['category']
      },
      {
        fields: ['tags']
      },
      {
        fields: ['order']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['authorId']
      }
    ]
  });

  HelpDocument.associate = (models) => {
    // 帮助文档与用户关联（作者）
    HelpDocument.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
  };

  return HelpDocument;
};