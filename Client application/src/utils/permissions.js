/**
 * 权限管理工具函数
 * 用于处理用户角色和权限验证
 */

// 角色定义（根据需求文档标准）
export const ROLES = {
  SYSTEM_ADMIN: 'sysadmin',  // 系统管理员
  ADMIN: 'admin',            // 管理员
  ROOM_OWNER: 'room_leader',       // 寝室长
  PAYER: 'payer',           // 缴费人
  USER: 'user',          // 用户
  GUEST: 'guest'             // 访客/未登录用户
}

// 权限定义
export const PERMISSIONS = {
  // 系统级权限
  ADMIN_ACCESS: 'admin.access',                    // 访问管理端
  ADMIN_ROLES_ASSIGN: 'admin.roles.assign',        // 分配角色
  ADMIN_USERS_READ: 'admin.users.read',            // 查看管理员
  SYSTEM_ADMIN: 'system.admin',                    // 系统管理员权限
  
  // 寝室级权限（与数据库权限代码保持一致，使用.分隔符）
  ROOM_CREATE: 'room.create',                      // 创建寝室
  ROOM_VIEW: 'room.view',                          // 查看寝室信息
  ROOM_EDIT: 'room.edit',                          // 编辑寝室信息
  ROOM_DELETE: 'room.delete',                      // 删除寝室
  ROOM_INVITE: 'room.invite',                      // 邀请成员
  ROOM_MANAGE: 'room.manage',                      // 管理寝室
  ROOM_JOIN: 'room.join',                          // 加入寝室
  
  // 成员管理权限
  MEMBER_MANAGE: 'room.members.manage',            // 管理成员
  MEMBER_INVITE: 'room.invite',                    // 邀请成员
  MEMBER_REMOVE: 'room.members.remove',            // 移除成员
  MEMBER_ROLE_CHANGE: 'room.members.role.change',  // 更改成员角色
  
  // 费用相关权限
  EXPENSE_CREATE: 'expense.add',                   // 创建费用记录
  EXPENSE_VIEW: 'expense.view',                    // 查看费用记录
  EXPENSE_EDIT: 'expense.edit',                    // 编辑费用记录
  EXPENSE_DELETE: 'expense.delete',                // 删除费用记录
  
  // 账单相关权限
  BILL_CREATE: 'bill.create',                      // 创建账单
  BILL_VIEW: 'bill.view',                          // 查看账单
  BILL_EDIT: 'bill.edit',                          // 编辑账单
  BILL_DELETE: 'bill.delete',                      // 删除账单
  BILL_PAY: 'payment.confirm',                     // 支付账单
  
  // 个人信息权限
  PROFILE_VIEW: 'user.profile.view',               // 查看个人资料
  PROFILE_EDIT: 'user.profile.edit',               // 编辑个人资料
  
  // 请假记录权限
  LEAVE_RECORD_CREATE: 'leave_record.create',      // 创建请假记录
  LEAVE_RECORD_VIEW: 'leave_record.view',          // 查看请假记录
  LEAVE_RECORD_EDIT: 'leave_record.edit',          // 编辑请假记录
  LEAVE_RECORD_DELETE: 'leave_record.delete',      // 删除请假记录
  LEAVE_RECORD_APPROVE: 'leave_record.approve'     // 审批请假记录
}

// 角色权限映射
export const ROLE_PERMISSIONS = {
  [ROLES.SYSTEM_ADMIN]: [
    // 超级管理员拥有所有权限
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.SYSTEM_ADMIN]: [
    // 系统管理员权限
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.ADMIN_ROLES_ASSIGN,
    PERMISSIONS.ADMIN_USERS_READ,
    
    // 寝室权限
    PERMISSIONS.ROOM_CREATE,
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_EDIT,
    PERMISSIONS.ROOM_DELETE,
    PERMISSIONS.ROOM_INVITE,
    
    // 费用权限
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_EDIT,
    PERMISSIONS.EXPENSE_DELETE,
    
    // 账单权限
    PERMISSIONS.BILL_CREATE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_EDIT,
    PERMISSIONS.BILL_DELETE,
    PERMISSIONS.BILL_PAY,
    
    // 个人信息权限
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT,
    
    // 请假记录权限
    PERMISSIONS.LEAVE_RECORD_CREATE,
    PERMISSIONS.LEAVE_RECORD_VIEW,
    PERMISSIONS.LEAVE_RECORD_EDIT,
    PERMISSIONS.LEAVE_RECORD_DELETE,
    PERMISSIONS.LEAVE_RECORD_APPROVE,
    
    // 请假记录权限
    PERMISSIONS.LEAVE_RECORD_CREATE,
    PERMISSIONS.LEAVE_RECORD_VIEW,
    PERMISSIONS.LEAVE_RECORD_EDIT,
    PERMISSIONS.LEAVE_RECORD_DELETE,
    PERMISSIONS.LEAVE_RECORD_APPROVE
  ],
  
  [ROLES.ADMIN]: [
    // 管理员权限（映射数据库中的管理员权限）
    PERMISSIONS.ADMIN_ACCESS,
    
    // 寝室权限
    PERMISSIONS.ROOM_CREATE,
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_EDIT,
    PERMISSIONS.ROOM_INVITE,
    PERMISSIONS.MEMBER_MANAGE,
    
    // 费用权限
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_EDIT,
    PERMISSIONS.EXPENSE_DELETE,
    
    // 账单权限
    PERMISSIONS.BILL_CREATE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_EDIT,
    PERMISSIONS.BILL_DELETE,
    PERMISSIONS.BILL_PAY,
    
    // 个人信息权限
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT
  ],
  
  [ROLES.ROOM_OWNER]: [
    // 寝室长权限（映射数据库中的寝室长权限）
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.ROOM_EDIT,
    PERMISSIONS.ROOM_INVITE,
    PERMISSIONS.MEMBER_MANAGE,
    
    // 费用权限
    PERMISSIONS.EXPENSE_CREATE,
    PERMISSIONS.EXPENSE_VIEW,
    PERMISSIONS.EXPENSE_EDIT,
    PERMISSIONS.EXPENSE_DELETE,
    
    // 账单权限
    PERMISSIONS.BILL_CREATE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_EDIT,
    PERMISSIONS.BILL_DELETE,
    PERMISSIONS.BILL_PAY,
    
    // 个人信息权限
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT
  ],
  
  [ROLES.PAYER]: [
    // 缴费人权限（映射数据库中的缴费人权限）
    PERMISSIONS.ROOM_VIEW,
    
    // 费用权限
    PERMISSIONS.EXPENSE_VIEW,
    
    // 账单权限
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_PAY,
    
    // 个人信息权限
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT
  ],
  
  [ROLES.USER]: [
    // 普通用户权限（映射数据库中的普通用户权限）
    PERMISSIONS.ROOM_VIEW,
    
    // 费用权限
    PERMISSIONS.EXPENSE_VIEW,
    
    // 账单权限
    PERMISSIONS.BILL_VIEW,
    
    // 个人信息权限
    PERMISSIONS.PROFILE_VIEW,
    PERMISSIONS.PROFILE_EDIT
  ],
  
  [ROLES.GUEST]: [
    // 访客权限
    PERMISSIONS.PROFILE_VIEW
  ]
}

/**
 * 检查用户是否具有指定权限
 * @param {Object} user - 用户对象
 * @param {string} permission - 权限标识
 * @param {Object} resource - 资源对象（可选，用于检查资源所有者）
 * @returns {boolean} 是否具有权限
 */
export function hasPermission(user, permission, resource = null) {
  // 如果用户不存在，则没有权限
  if (!user) {
    return false;
  }
  
  // 如果用户拥有'all'权限，则具有所有权限
  if (user.permissions && user.permissions.includes('all')) {
    return true;
  }
  
  // 获取用户角色
  const userRole = user.role || ROLES.GUEST;
  
  // 获取角色对应的权限列表
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  
  // 检查是否具有该权限
  if (!rolePermissions.includes(permission)) {
    return false;
  }
  
  // 如果提供了资源对象，检查资源所有者权限
  if (resource) {
    // 系统管理员可以操作所有资源
    if (userRole === ROLES.ADMIN) {
      return true;
    }
    
    // 检查是否是资源所有者
    const isOwner = resource.creatorId === user.id || resource.userId === user.id;
    
    // 某些操作只有资源所有者可以执行
    const ownerOnlyPermissions = [
      PERMISSIONS.EXPENSE_EDIT,
      PERMISSIONS.EXPENSE_DELETE,
      PERMISSIONS.BILL_EDIT,
      PERMISSIONS.BILL_DELETE
    ];
    
    if (ownerOnlyPermissions.includes(permission) && !isOwner) {
      return false;
    }
  }
  
  return true;
}

/**
 * 检查用户是否具有任一权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限标识数组
 * @param {Object} resource - 资源对象（可选）
 * @returns {boolean} 是否具有任一权限
 */
export function hasAnyPermission(user, permissions, resource = null) {
  if (!user || !permissions || !Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.some(permission => hasPermission(user, permission, resource));
}

/**
 * 检查用户是否具有所有权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限标识数组
 * @param {Object} resource - 资源对象（可选）
 * @returns {boolean} 是否具有所有权限
 */
export function hasAllPermissions(user, permissions, resource = null) {
  if (!user || !permissions || !Array.isArray(permissions)) {
    return false;
  }
  
  return permissions.every(permission => hasPermission(user, permission, resource));
}

/**
 * 获取用户在指定寝室的角色
 * @param {Object} user - 用户对象
 * @param {string} roomId - 寝室ID
 * @returns {string} 用户在该寝室的角色
 */
export function getUserRoleInRoom(user, roomId) {
  if (!user || !roomId) {
    return ROLES.GUEST;
  }
  
  // 如果用户是系统管理员，在任何寝室都是管理员
  if (user.role === ROLES.ADMIN) {
    return ROLES.ADMIN;
  }
  
  // 检查用户是否是该寝室的成员
  const roomMembership = user.rooms && user.rooms.find(room => room.id === roomId);
  
  if (!roomMembership) {
    return ROLES.GUEST;
  }
  
  // 返回用户在该寝室的角色
  return roomMembership.role || ROLES.ROOM_MEMBER;
}

/**
 * 检查用户是否可以访问指定寝室
 * @param {Object} user - 用户对象
 * @param {string} roomId - 寝室ID
 * @param {string} permission - 所需权限
 * @returns {boolean} 是否可以访问
 */
export function canAccessRoom(user, roomId, permission = PERMISSIONS.ROOM_VIEW) {
  const userRoleInRoom = getUserRoleInRoom(user, roomId);
  
  // 创建临时用户对象，包含在该寝室的角色
  const tempUser = {
    ...user,
    role: userRoleInRoom
  };
  
  return hasPermission(tempUser, permission);
}

/**
 * 获取用户可访问的寝室列表
 * @param {Object} user - 用户对象
 * @param {Array} rooms - 寝室列表
 * @returns {Array} 用户可访问的寝室列表
 */
export function getAccessibleRooms(user, rooms) {
  if (!user || !rooms || !Array.isArray(rooms)) {
    return [];
  }
  
  // 系统管理员可以访问所有寝室
  if (user.role === ROLES.ADMIN) {
    return rooms;
  }
  
  // 普通用户只能访问自己加入的寝室
  const userRoomIds = user.rooms ? user.rooms.map(room => room.id) : [];
  
  return rooms.filter(room => userRoomIds.includes(room.id));
}

/**
 * 权限装饰器工厂函数
 * @param {string|Array} permissions - 所需权限
 * @param {Object} options - 选项
 * @returns {Function} 装饰器函数
 */
export function requirePermissions(permissions, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
      // 获取当前用户
      const user = this.$store ? this.$store.state.user.user : null;
      
      // 检查权限
      let hasRequiredPermission = false;
      
      if (Array.isArray(permissions)) {
        hasRequiredPermission = hasAnyPermission(user, permissions);
      } else {
        hasRequiredPermission = hasPermission(user, permissions);
      }
      
      // 如果没有权限，执行拒绝操作
      if (!hasRequiredPermission) {
        if (options.redirect) {
          this.$router.push(options.redirect);
        } else if (options.throwError) {
          throw new Error('权限不足');
        } else {
          console.warn('权限不足，无法执行操作');
          return false;
        }
      }
      
      // 如果有权限，执行原方法
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Vue指令：v-permission
 * 根据权限控制元素显示/隐藏
 */
export const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding;
    
    // 获取当前用户
    const user = document.__vue__ && document.__vue__.$store 
      ? document.__vue__.$store.state.user.user 
      : null;
    
    // 检查权限
    let hasRequiredPermission = false;
    
    if (Array.isArray(value)) {
      hasRequiredPermission = hasAnyPermission(user, value);
    } else {
      hasRequiredPermission = hasPermission(user, value);
    }
    
    // 如果没有权限，隐藏元素
    if (!hasRequiredPermission) {
      el.style.display = 'none';
    }
  },
  
  updated(el, binding) {
    // 权限可能发生变化，重新检查
    const { value } = binding;
    
    const user = document.__vue__ && document.__vue__.$store 
      ? document.__vue__.$store.state.user.user 
      : null;
    
    let hasRequiredPermission = false;
    
    if (Array.isArray(value)) {
      hasRequiredPermission = hasAnyPermission(user, value);
    } else {
      hasRequiredPermission = hasPermission(user, value);
    }
    
    if (!hasRequiredPermission) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  }
}