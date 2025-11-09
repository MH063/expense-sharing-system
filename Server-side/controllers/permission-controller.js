const { Permission, Role, User, UserPermission, RolePermission, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 权限管理控制器
 * 处理系统权限的增删改查操作
 */
const permissionController = {
  /**
   * 获取权限列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPermissions(req, res) {
    try {
      const { page = 1, limit = 20, search, module, status } = req.query;
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const whereCondition = {};
      
      if (search) {
        whereCondition[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { module: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (module) {
        whereCondition.module = module;
      }
      
      if (status !== undefined) {
        whereCondition.status = status === 'true';
      }
      
      const { count, rows: permissions } = await Permission.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['module', 'ASC'], ['name', 'ASC']],
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ]
      });
      
      // 获取所有模块列表
      const modules = await Permission.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('module')), 'module']],
        raw: true
      });
      
      res.json({
        success: true,
        data: {
          permissions,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          },
          modules: modules.map(m => m.module)
        }
      });
    } catch (error) {
      logger.error('获取权限列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限列表失败',
        error: error.message
      });
    }
  },

  /**
   * 获取权限详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPermissionById(req, res) {
    try {
      const { id } = req.params;
      
      const permission = await Permission.findByPk(id, {
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id', 'name', 'description']
          }
        ]
      });
      
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }
      
      res.json({
        success: true,
        data: { permission }
      });
    } catch (error) {
      logger.error('获取权限详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限详情失败',
        error: error.message
      });
    }
  },

  /**
   * 创建权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createPermission(req, res) {
    try {
      const { name, description, module, status = true } = req.body;
      
      // 检查权限是否已存在
      const existingPermission = await Permission.findOne({
        where: { name, module }
      });
      
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: '该模块下的权限名称已存在'
        });
      }
      
      // 创建新权限
      const permission = await Permission.create({
        name,
        description,
        module,
        status,
        createdBy: req.user.id
      });
      
      logger.info(`用户 ${req.user.id} 创建了权限: ${permission.id}`);
      
      res.status(201).json({
        success: true,
        message: '权限创建成功',
        data: { permission }
      });
    } catch (error) {
      logger.error('创建权限失败:', error);
      res.status(500).json({
        success: false,
        message: '创建权限失败',
        error: error.message
      });
    }
  },

  /**
   * 更新权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updatePermission(req, res) {
    try {
      const { id } = req.params;
      const { name, description, module, status } = req.body;
      
      const permission = await Permission.findByPk(id);
      
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }
      
      // 检查权限名称是否重复（排除当前权限）
      if (name && module && (name !== permission.name || module !== permission.module)) {
        const existingPermission = await Permission.findOne({
          where: { 
            name, 
            module,
            id: { [Op.ne]: id }
          }
        });
        
        if (existingPermission) {
          return res.status(400).json({
            success: false,
            message: '该模块下的权限名称已存在'
          });
        }
      }
      
      // 更新权限
      await permission.update({
        name: name || permission.name,
        description: description !== undefined ? description : permission.description,
        module: module || permission.module,
        status: status !== undefined ? status : permission.status,
        updatedBy: req.user.id
      });
      
      logger.info(`用户 ${req.user.id} 更新了权限: ${permission.id}`);
      
      res.json({
        success: true,
        message: '权限更新成功',
        data: { permission }
      });
    } catch (error) {
      logger.error('更新权限失败:', error);
      res.status(500).json({
        success: false,
        message: '更新权限失败',
        error: error.message
      });
    }
  },

  /**
   * 删除权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deletePermission(req, res) {
    try {
      const { id } = req.params;
      
      const permission = await Permission.findByPk(id);
      
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }
      
      // 检查权限是否被角色使用
      const rolePermissionCount = await RolePermission.count({
        where: { permissionId: id }
      });
      
      if (rolePermissionCount > 0) {
        return res.status(400).json({
          success: false,
          message: '该权限正在被角色使用，无法删除'
        });
      }
      
      // 检查权限是否被用户直接分配
      const userPermissionCount = await UserPermission.count({
        where: { permissionId: id }
      });
      
      if (userPermissionCount > 0) {
        return res.status(400).json({
          success: false,
          message: '该权限已直接分配给用户，无法删除'
        });
      }
      
      // 删除权限
      await permission.destroy();
      
      logger.info(`用户 ${req.user.id} 删除了权限: ${permission.id}`);
      
      res.json({
        success: true,
        message: '权限删除成功'
      });
    } catch (error) {
      logger.error('删除权限失败:', error);
      res.status(500).json({
        success: false,
        message: '删除权限失败',
        error: error.message
      });
    }
  },

  /**
   * 批量更新权限状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchUpdatePermissionStatus(req, res) {
    try {
      const { permissionIds, status } = req.body;
      
      if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的权限ID列表'
        });
      }
      
      if (status === undefined) {
        return res.status(400).json({
          success: false,
          message: '请提供状态值'
        });
      }
      
      // 批量更新权限状态
      await Permission.update(
        { 
          status,
          updatedBy: req.user.id
        },
        {
          where: {
            id: { [Op.in]: permissionIds }
          }
        }
      );
      
      logger.info(`用户 ${req.user.id} 批量更新了权限状态: ${permissionIds.join(', ')}`);
      
      res.json({
        success: true,
        message: `成功更新 ${permissionIds.length} 个权限的状态`
      });
    } catch (error) {
      logger.error('批量更新权限状态失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新权限状态失败',
        error: error.message
      });
    }
  },

  /**
   * 获取角色权限映射
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getRolePermissionMapping(req, res) {
    try {
      const { roleId } = req.query;
      
      // 获取所有角色
      const roles = await Role.findAll({
        attributes: ['id', 'name', 'description'],
        order: [['name', 'ASC']]
      });
      
      // 获取所有权限，按模块分组
      const permissions = await Permission.findAll({
        attributes: ['id', 'name', 'description', 'module', 'status'],
        where: { status: true },
        order: [['module', 'ASC'], ['name', 'ASC']]
      });
      
      // 按模块分组权限
      const permissionsByModule = {};
      permissions.forEach(permission => {
        if (!permissionsByModule[permission.module]) {
          permissionsByModule[permission.module] = [];
        }
        permissionsByModule[permission.module].push({
          id: permission.id,
          name: permission.name,
          description: permission.description
        });
      });
      
      // 获取指定角色的权限映射（如果提供了roleId）
      let rolePermissions = [];
      if (roleId) {
        rolePermissions = await RolePermission.findAll({
          where: { roleId },
          attributes: ['permissionId']
        });
        rolePermissions = rolePermissions.map(rp => rp.permissionId);
      }
      
      res.json({
        success: true,
        data: {
          roles,
          permissionsByModule,
          rolePermissions
        }
      });
    } catch (error) {
      logger.error('获取角色权限映射失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色权限映射失败',
        error: error.message
      });
    }
  },

  /**
   * 更新角色权限映射
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateRolePermissionMapping(req, res) {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      
      // 验证角色是否存在
      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }
      
      // 验证权限是否存在
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.findAll({
          where: {
            id: { [Op.in]: permissionIds },
            status: true
          }
        });
        
        if (permissions.length !== permissionIds.length) {
          return res.status(400).json({
            success: false,
            message: '部分权限不存在或已禁用'
          });
        }
      }
      
      // 使用事务更新角色权限映射
      await sequelize.transaction(async (t) => {
        // 删除现有的角色权限映射
        await RolePermission.destroy({
          where: { roleId },
          transaction: t
        });
        
        // 添加新的角色权限映射
        if (permissionIds && permissionIds.length > 0) {
          const rolePermissionData = permissionIds.map(permissionId => ({
            roleId,
            permissionId,
            createdBy: req.user.id
          }));
          
          await RolePermission.bulkCreate(rolePermissionData, { transaction: t });
        }
      });
      
      logger.info(`用户 ${req.user.id} 更新了角色 ${roleId} 的权限映射`);
      
      res.json({
        success: true,
        message: '角色权限映射更新成功'
      });
    } catch (error) {
      logger.error('更新角色权限映射失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色权限映射失败',
        error: error.message
      });
    }
  },

  /**
   * 获取用户权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      
      // 检查是否有权限查看（管理员或查看自己）
      if (req.user.id !== parseInt(userId) && !req.user.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权限查看该用户权限'
        });
      }
      
      // 获取用户信息
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'email', 'roleId'],
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description']
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 获取用户角色权限
      let rolePermissions = [];
      if (user.roleId) {
        rolePermissions = await RolePermission.findAll({
          where: { roleId: user.roleId },
          include: [
            {
              model: Permission,
              as: 'permission',
              attributes: ['id', 'name', 'description', 'module']
            }
          ]
        });
        rolePermissions = rolePermissions.map(rp => rp.permission);
      }
      
      // 获取用户直接分配的权限
      const userPermissions = await UserPermission.findAll({
        where: { userId },
        include: [
          {
            model: Permission,
            as: 'permission',
            attributes: ['id', 'name', 'description', 'module']
          }
        ]
      });
      
      const directPermissions = userPermissions.map(up => up.permission);
      
      // 合并权限（去重）
      const allPermissions = [...rolePermissions];
      directPermissions.forEach(dp => {
        if (!allPermissions.find(ap => ap.id === dp.id)) {
          allPermissions.push(dp);
        }
      });
      
      // 按模块分组权限
      const permissionsByModule = {};
      allPermissions.forEach(permission => {
        if (!permissionsByModule[permission.module]) {
          permissionsByModule[permission.module] = [];
        }
        permissionsByModule[permission.module].push(permission);
      });
      
      res.json({
        success: true,
        data: {
          user,
          permissionsByModule,
          rolePermissions,
          directPermissions
        }
      });
    } catch (error) {
      logger.error('获取用户权限失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户权限失败',
        error: error.message
      });
    }
  },

  /**
   * 分配权限给用户
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async assignPermissionsToUser(req, res) {
    try {
      const { userId } = req.params;
      const { permissionIds } = req.body;
      
      // 验证用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 验证权限是否存在
      if (permissionIds && permissionIds.length > 0) {
        const permissions = await Permission.findAll({
          where: {
            id: { [Op.in]: permissionIds },
            status: true
          }
        });
        
        if (permissions.length !== permissionIds.length) {
          return res.status(400).json({
            success: false,
            message: '部分权限不存在或已禁用'
          });
        }
      }
      
      // 使用事务分配权限
      await sequelize.transaction(async (t) => {
        // 删除现有的用户权限
        await UserPermission.destroy({
          where: { userId },
          transaction: t
        });
        
        // 添加新的用户权限
        if (permissionIds && permissionIds.length > 0) {
          const userPermissionData = permissionIds.map(permissionId => ({
            userId,
            permissionId,
            createdBy: req.user.id
          }));
          
          await UserPermission.bulkCreate(userPermissionData, { transaction: t });
        }
      });
      
      logger.info(`用户 ${req.user.id} 给用户 ${userId} 分配了权限`);
      
      res.json({
        success: true,
        message: '权限分配成功'
      });
    } catch (error) {
      logger.error('分配权限给用户失败:', error);
      res.status(500).json({
        success: false,
        message: '分配权限给用户失败',
        error: error.message
      });
    }
  },

  /**
   * 移除用户权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async revokePermissionsFromUser(req, res) {
    try {
      const { userId } = req.params;
      const { permissionIds } = req.body;
      
      // 验证用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 删除指定的用户权限
      if (permissionIds && permissionIds.length > 0) {
        await UserPermission.destroy({
          where: {
            userId,
            permissionId: { [Op.in]: permissionIds }
          }
        });
      } else {
        // 如果没有指定权限ID，则删除所有用户权限
        await UserPermission.destroy({
          where: { userId }
        });
      }
      
      logger.info(`用户 ${req.user.id} 移除了用户 ${userId} 的权限`);
      
      res.json({
        success: true,
        message: '权限移除成功'
      });
    } catch (error) {
      logger.error('移除用户权限失败:', error);
      res.status(500).json({
        success: false,
        message: '移除用户权限失败',
        error: error.message
      });
    }
  },

  /**
   * 获取权限使用统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPermissionUsageStats(req, res) {
    try {
      // 获取权限总数
      const totalPermissions = await Permission.count();
      
      // 获取已启用权限数
      const activePermissions = await Permission.count({
        where: { status: true }
      });
      
      // 获取按模块分组的权限数
      const permissionsByModule = await Permission.findAll({
        attributes: [
          'module',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = true THEN 1 END')), 'activeCount']
        ],
        group: ['module'],
        order: [['module', 'ASC']]
      });
      
      // 获取最常用的权限（被分配给角色最多的权限）
      const mostUsedPermissions = await Permission.findAll({
        attributes: [
          'id',
          'name',
          'module',
          [sequelize.fn('COUNT', sequelize.col('roles.id')), 'roleCount']
        ],
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            attributes: []
          }
        ],
        group: ['Permission.id'],
        order: [[sequelize.literal('roleCount'), 'DESC']],
        limit: 10
      });
      
      // 获取直接分配给用户的权限数
      const directUserPermissions = await UserPermission.count();
      
      // 获取有直接权限的用户数
      const usersWithDirectPermissions = await UserPermission.count({
        distinct: true,
        col: 'userId'
      });
      
      res.json({
        success: true,
        data: {
          totalPermissions,
          activePermissions,
          inactivePermissions: totalPermissions - activePermissions,
          permissionsByModule,
          mostUsedPermissions,
          directUserPermissions,
          usersWithDirectPermissions
        }
      });
    } catch (error) {
      logger.error('获取权限使用统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限使用统计失败',
        error: error.message
      });
    }
  }
};

module.exports = permissionController;