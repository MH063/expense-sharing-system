const { DataTypes } = require('sequelize');

/**
 * 用户权限关联模型
 * 定义用户与权限的多对多关系（直接分配权限）
 */
module.exports = (sequelize) => {
  const UserPermission = sequelize.define('UserPermission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '用户ID'
    },
    permissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '权限ID'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建者ID'
    }
  }, {
    tableName: 'user_permissions',
    timestamps: true,
    paranoid: false, // 不使用软删除
    indexes: [
      {
        unique: true,
        fields: ['userId', 'permissionId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['permissionId']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  /**
   * 定义模型关联关系
   * @param {Object} models - 所有模型对象
   */
  UserPermission.associate = (models) => {
    // 关联用户
    UserPermission.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 关联权限
    UserPermission.belongsTo(models.Permission, {
      foreignKey: 'permissionId',
      as: 'permission'
    });
  };

  return UserPermission;
};