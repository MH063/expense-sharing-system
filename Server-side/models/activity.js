const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '活动标题'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '活动描述'
    },
    type: {
      type: DataTypes.ENUM('social', 'study', 'sports', 'entertainment', 'other'),
      allowNull: false,
      defaultValue: 'social',
      comment: '活动类型'
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '关联房间ID'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '活动开始时间'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '活动结束时间'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '活动地点'
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '最大参与人数'
    },
    participationCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '当前参与人数'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否公开'
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'upcoming',
      comment: '活动状态'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: '活动标签'
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '创建者ID'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '软删除时间'
    }
  }, {
    tableName: 'activities',
    timestamps: true,
    paranoid: true, // 启用软删除
    indexes: [
      {
        fields: ['roomId']
      },
      {
        fields: ['creatorId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // 定义关联关系
  Activity.associate = (models) => {
    // 活动属于一个房间
    Activity.belongsTo(models.Room, {
      foreignKey: 'roomId',
      as: 'room'
    });

    // 活动由一个用户创建
    Activity.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    // 活动可以有多个参与者（多对多关系）
    Activity.belongsToMany(models.User, {
      through: models.ActivityParticipant,
      foreignKey: 'activityId',
      otherKey: 'userId',
      as: 'participants'
    });
  };

  return Activity;
};