const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityParticipant = sequelize.define('ActivityParticipant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '活动ID'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      allowNull: false,
      defaultValue: 'confirmed',
      comment: '参与状态'
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '加入时间'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  }, {
    tableName: 'activity_participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['activityId', 'userId']
      },
      {
        fields: ['activityId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      }
    ]
  });

  // 定义关联关系
  ActivityParticipant.associate = (models) => {
    // 参与记录属于一个活动
    ActivityParticipant.belongsTo(models.Activity, {
      foreignKey: 'activityId',
      as: 'activity'
    });

    // 参与记录属于一个用户
    ActivityParticipant.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ActivityParticipant;
};