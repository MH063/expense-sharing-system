module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define('Feedback', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '反馈标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '反馈内容'
    },
    type: {
      type: DataTypes.ENUM('bug', 'suggestion', 'question', 'other'),
      allowNull: false,
      defaultValue: 'suggestion',
      comment: '反馈类型'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'resolved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '处理状态'
    },
    submittedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '提交者ID'
    },
    reply: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '回复内容'
    },
    repliedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '回复者ID'
    },
    repliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '回复时间'
    }
  }, {
    tableName: 'feedbacks',
    timestamps: true,
    indexes: [
      {
        fields: ['title']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['submittedBy']
      },
      {
        fields: ['repliedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  Feedback.associate = (models) => {
    // 反馈与用户关联（提交者）
    Feedback.belongsTo(models.User, {
      foreignKey: 'submittedBy',
      as: 'submitter'
    });
    
    // 反馈与用户关联（回复者）
    Feedback.belongsTo(models.User, {
      foreignKey: 'repliedBy',
      as: 'replier'
    });
  };

  return Feedback;
};