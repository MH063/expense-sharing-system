const { DataTypes } = require('sequelize');

/**
 * 角色权限关联模型
 * 定义角色与权限的多对多关系
 */
module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: '角色ID'
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
    tableName: 'role_permissions',
    timestamps: true,
    paranoid: false, // 不使用软删除
    indexes: [
      {
        unique: true,
        fields: ['roleId', 'permissionId']
      },
      {
        fields: ['roleId']
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
  RolePermission.associate = (models) => {
    // 关联角色
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });

    // 关联权限
    RolePermission.belongsTo(models.Permission, {
      foreignKey: 'permissionId',
      as: 'permission'
    });
  };

  return RolePermission;
};