const { DataTypes } = require('sequelize');

/**
 * 权限模型
 * 定义系统权限的数据结构
 */
module.exports = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '权限名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '权限描述'
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '所属模块'
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '状态：true-启用，false-禁用'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '创建者ID'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '更新者ID'
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    paranoid: false, // 不使用软删除
    indexes: [
      {
        unique: true,
        fields: ['name', 'module']
      },
      {
        fields: ['module']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['updatedBy']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  /**
   * 定义模型关联关系
   * @param {Object} models - 所有模型对象
   */
  Permission.associate = (models) => {
    // 权限与角色的多对多关系
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permissionId',
      otherKey: 'roleId',
      as: 'roles'
    });

    // 权限与用户的多对多关系（直接分配）
    Permission.belongsToMany(models.User, {
      through: models.UserPermission,
      foreignKey: 'permissionId',
      otherKey: 'userId',
      as: 'users'
    });
  };

  return Permission;
};