/**
 * 权限映射管理工具
 * 用于管理和查询角色与权限的映射关系
 */

import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from './permissions'

/**
 * 角色信息映射
 */
export const ROLE_INFO = {
  [ROLES.SYSTEM_ADMIN]: {
    name: '系统管理员',
    description: '拥有系统所有权限，可以管理所有数据和设置',
    level: 6,
    color: '#9C27B0',
    icon: 'admin_panel_settings'
  },
  [ROLES.ADMIN]: {
    name: '管理员',
    description: '管理寝室、费用和账单，但不能修改系统级设置',
    level: 5,
    color: '#F44336',
    icon: 'settings'
  },
  [ROLES.ROOM_OWNER]: {
    name: '寝室长',
    description: '管理特定寝室的成员、费用和账单',
    level: 4,
    color: '#FF9800',
    icon: 'group'
  },
  [ROLES.PAYER]: {
    name: '缴费人',
    description: '可以查看和创建费用、账单记录',
    level: 3,
    color: '#2196F3',
    icon: 'account_balance_wallet'
  },
  [ROLES.USER]: {
    name: '普通用户',
    description: '基本权限，可以查看和创建自己的费用、账单',
    level: 2,
    color: '#4CAF50',
    icon: 'person'
  },
  [ROLES.GUEST]: {
    name: '访客',
    description: '未登录用户，只能访问公开页面',
    level: 1,
    color: '#9E9E9E',
    icon: 'person_outline'
  }
}

/**
 * 权限信息映射
 */
export const PERMISSION_INFO = {
  // 系统级权限
  [PERMISSIONS.ADMIN_ACCESS]: {
    name: '管理员访问',
    description: '访问管理后台',
    category: '系统管理',
    level: 'high'
  },
  [PERMISSIONS.ADMIN_ROLES_ASSIGN]: {
    name: '分配角色',
    description: '分配和管理用户角色',
    category: '系统管理',
    level: 'high'
  },
  [PERMISSIONS.ADMIN_USERS_READ]: {
    name: '查看用户',
    description: '查看用户列表和详情',
    category: '系统管理',
    level: 'high'
  },
  [PERMISSIONS.SYSTEM_ADMIN]: {
    name: '系统管理',
    description: '系统级管理权限',
    category: '系统管理',
    level: 'high'
  },
  
  // 寝室级权限
  [PERMISSIONS.ROOM_CREATE]: {
    name: '创建寝室',
    description: '创建新的寝室',
    category: '寝室管理',
    level: 'medium'
  },
  [PERMISSIONS.ROOM_VIEW]: {
    name: '查看寝室',
    description: '查看寝室信息和成员列表',
    category: '寝室管理',
    level: 'low'
  },
  [PERMISSIONS.ROOM_EDIT]: {
    name: '编辑寝室',
    description: '修改寝室信息',
    category: '寝室管理',
    level: 'medium'
  },
  [PERMISSIONS.ROOM_DELETE]: {
    name: '删除寝室',
    description: '删除寝室',
    category: '寝室管理',
    level: 'high'
  },
  [PERMISSIONS.ROOM_INVITE]: {
    name: '邀请成员',
    description: '邀请新成员加入寝室',
    category: '寝室管理',
    level: 'medium'
  },
  [PERMISSIONS.ROOM_MANAGE]: {
    name: '管理寝室',
    description: '全面管理寝室',
    category: '寝室管理',
    level: 'high'
  },
  [PERMISSIONS.ROOM_JOIN]: {
    name: '加入寝室',
    description: '申请加入寝室',
    category: '寝室管理',
    level: 'low'
  },
  
  // 成员管理权限
  [PERMISSIONS.MEMBER_MANAGE]: {
    name: '管理成员',
    description: '全面管理寝室成员',
    category: '成员管理',
    level: 'high'
  },
  [PERMISSIONS.MEMBER_INVITE]: {
    name: '邀请成员',
    description: '邀请新成员',
    category: '成员管理',
    level: 'medium'
  },
  [PERMISSIONS.MEMBER_REMOVE]: {
    name: '移除成员',
    description: '从寝室移除成员',
    category: '成员管理',
    level: 'high'
  },
  [PERMISSIONS.MEMBER_ROLE_CHANGE]: {
    name: '更改角色',
    description: '修改成员在寝室中的角色',
    category: '成员管理',
    level: 'high'
  },
  
  // 费用相关权限
  [PERMISSIONS.EXPENSE_CREATE]: {
    name: '创建费用',
    description: '创建新的费用记录',
    category: '费用管理',
    level: 'medium'
  },
  [PERMISSIONS.EXPENSE_VIEW]: {
    name: '查看费用',
    description: '查看费用记录',
    category: '费用管理',
    level: 'low'
  },
  [PERMISSIONS.EXPENSE_EDIT]: {
    name: '编辑费用',
    description: '修改费用记录',
    category: '费用管理',
    level: 'medium'
  },
  [PERMISSIONS.EXPENSE_DELETE]: {
    name: '删除费用',
    description: '删除费用记录',
    category: '费用管理',
    level: 'high'
  },
  
  // 账单相关权限
  [PERMISSIONS.BILL_CREATE]: {
    name: '创建账单',
    description: '创建新的账单',
    category: '账单管理',
    level: 'medium'
  },
  [PERMISSIONS.BILL_VIEW]: {
    name: '查看账单',
    description: '查看账单详情',
    category: '账单管理',
    level: 'low'
  },
  [PERMISSIONS.BILL_EDIT]: {
    name: '编辑账单',
    description: '修改账单信息',
    category: '账单管理',
    level: 'medium'
  },
  [PERMISSIONS.BILL_DELETE]: {
    name: '删除账单',
    description: '删除账单',
    category: '账单管理',
    level: 'high'
  },
  [PERMISSIONS.BILL_PAY]: {
    name: '支付账单',
    description: '支付账单',
    category: '账单管理',
    level: 'medium'
  },
  
  // 个人信息权限
  [PERMISSIONS.PROFILE_VIEW]: {
    name: '查看资料',
    description: '查看个人资料',
    category: '个人信息',
    level: 'low'
  },
  [PERMISSIONS.PROFILE_EDIT]: {
    name: '编辑资料',
    description: '修改个人资料',
    category: '个人信息',
    level: 'low'
  },
  
  // 请假记录权限
  [PERMISSIONS.LEAVE_RECORD_CREATE]: {
    name: '创建请假',
    description: '创建请假记录',
    category: '请假管理',
    level: 'medium'
  },
  [PERMISSIONS.LEAVE_RECORD_VIEW]: {
    name: '查看请假',
    description: '查看请假记录',
    category: '请假管理',
    level: 'low'
  },
  [PERMISSIONS.LEAVE_RECORD_EDIT]: {
    name: '编辑请假',
    description: '修改请假记录',
    category: '请假管理',
    level: 'medium'
  },
  [PERMISSIONS.LEAVE_RECORD_DELETE]: {
    name: '删除请假',
    description: '删除请假记录',
    category: '请假管理',
    level: 'high'
  },
  [PERMISSIONS.LEAVE_RECORD_APPROVE]: {
    name: '审批请假',
    description: '审批请假申请',
    category: '请假管理',
    level: 'high'
  }
}

/**
 * 权限分类
 */
export const PERMISSION_CATEGORIES = {
  '系统管理': {
    icon: 'security',
    color: '#9C27B0',
    permissions: [
      PERMISSIONS.ADMIN_ACCESS,
      PERMISSIONS.ADMIN_ROLES_ASSIGN,
      PERMISSIONS.ADMIN_USERS_READ,
      PERMISSIONS.SYSTEM_ADMIN
    ]
  },
  '寝室管理': {
    icon: 'home',
    color: '#FF9800',
    permissions: [
      PERMISSIONS.ROOM_CREATE,
      PERMISSIONS.ROOM_VIEW,
      PERMISSIONS.ROOM_EDIT,
      PERMISSIONS.ROOM_DELETE,
      PERMISSIONS.ROOM_INVITE,
      PERMISSIONS.ROOM_MANAGE,
      PERMISSIONS.ROOM_JOIN
    ]
  },
  '成员管理': {
    icon: 'group',
    color: '#2196F3',
    permissions: [
      PERMISSIONS.MEMBER_MANAGE,
      PERMISSIONS.MEMBER_INVITE,
      PERMISSIONS.MEMBER_REMOVE,
      PERMISSIONS.MEMBER_ROLE_CHANGE
    ]
  },
  '费用管理': {
    icon: 'receipt',
    color: '#4CAF50',
    permissions: [
      PERMISSIONS.EXPENSE_CREATE,
      PERMISSIONS.EXPENSE_VIEW,
      PERMISSIONS.EXPENSE_EDIT,
      PERMISSIONS.EXPENSE_DELETE
    ]
  },
  '账单管理': {
    icon: 'account_balance',
    color: '#F44336',
    permissions: [
      PERMISSIONS.BILL_CREATE,
      PERMISSIONS.BILL_VIEW,
      PERMISSIONS.BILL_EDIT,
      PERMISSIONS.BILL_DELETE,
      PERMISSIONS.BILL_PAY
    ]
  },
  '个人信息': {
    icon: 'person',
    color: '#607D8B',
    permissions: [
      PERMISSIONS.PROFILE_VIEW,
      PERMISSIONS.PROFILE_EDIT
    ]
  },
  '请假管理': {
    icon: 'event_busy',
    color: '#795548',
    permissions: [
      PERMISSIONS.LEAVE_RECORD_CREATE,
      PERMISSIONS.LEAVE_RECORD_VIEW,
      PERMISSIONS.LEAVE_RECORD_EDIT,
      PERMISSIONS.LEAVE_RECORD_DELETE,
      PERMISSIONS.LEAVE_RECORD_APPROVE
    ]
  }
}

/**
 * 页面权限映射
 */
export const PAGE_PERMISSIONS = {
  // 认证相关页面
  '/auth/login': {
    name: '登录',
    requiresGuest: true,
    description: '用户登录页面'
  },
  '/auth/register': {
    name: '注册',
    requiresGuest: true,
    description: '用户注册页面'
  },
  '/auth/forgot-password': {
    name: '忘记密码',
    requiresGuest: true,
    description: '找回密码页面'
  },
  
  // 仪表盘页面
  '/dashboard': {
    name: '仪表盘',
    requiresAuth: true,
    description: '系统主仪表盘'
  },
  
  // 个人资料页面
  '/profile': {
    name: '个人资料',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.PROFILE_VIEW,
    description: '查看和编辑个人资料'
  },
  
  // 寝室相关页面
  '/rooms': {
    name: '寝室列表',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.ROOM_VIEW,
    description: '查看用户加入的寝室列表'
  },
  '/rooms/create': {
    name: '创建寝室',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.ROOM_CREATE,
    description: '创建新的寝室'
  },
  '/rooms/:roomId': {
    name: '寝室详情',
    requiresAuth: true,
    requiresRoomPermission: PERMISSIONS.ROOM_VIEW,
    description: '查看寝室详细信息'
  },
  '/rooms/:roomId/invitations': {
    name: '寝室邀请',
    requiresAuth: true,
    requiresRoomPermission: PERMISSIONS.ROOM_INVITE,
    description: '管理寝室邀请'
  },
  
  // 费用相关页面
  '/expenses': {
    name: '费用列表',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.EXPENSE_VIEW,
    description: '查看费用记录列表'
  },
  '/expenses/create': {
    name: '创建费用',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.EXPENSE_CREATE,
    description: '创建新的费用记录'
  },
  '/expenses/:expenseId': {
    name: '费用详情',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.EXPENSE_VIEW,
    description: '查看费用记录详情'
  },
  
  // 账单相关页面
  '/bills': {
    name: '账单列表',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_VIEW,
    description: '查看账单列表'
  },
  '/bills/list': {
    name: '账单列表',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_VIEW,
    description: '查看账单列表'
  },
  '/bills/create': {
    name: '创建账单',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_CREATE,
    description: '创建新的账单'
  },
  '/bills/:billId': {
    name: '账单详情',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_VIEW,
    description: '查看账单详情'
  },
  '/bills/:billId/edit': {
    name: '编辑账单',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_EDIT,
    description: '编辑账单信息'
  },
  '/bills/:billId/payment': {
    name: '支付账单',
    requiresAuth: true,
    requiresPermission: PERMISSIONS.BILL_PAY,
    description: '支付账单'
  }
}

/**
 * 获取角色信息
 * @param {string} role - 角色代码
 * @returns {Object} 角色信息
 */
export function getRoleInfo(role) {
  return ROLE_INFO[role] || ROLE_INFO[ROLES.GUEST]
}

/**
 * 获取权限信息
 * @param {string} permission - 权限代码
 * @returns {Object} 权限信息
 */
export function getPermissionInfo(permission) {
  return PERMISSION_INFO[permission] || { name: permission, description: '未知权限' }
}

/**
 * 获取角色权限列表
 * @param {string} role - 角色代码
 * @returns {Array} 权限列表
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * 获取分类权限列表
 * @param {string} category - 分类名称
 * @returns {Array} 权限列表
 */
export function getCategoryPermissions(category) {
  const categoryInfo = PERMISSION_CATEGORIES[category]
  return categoryInfo ? categoryInfo.permissions : []
}

/**
 * 获取页面权限要求
 * @param {string} path - 页面路径
 * @returns {Object} 页面权限要求
 */
export function getPagePermissions(path) {
  // 处理动态路由
  for (const [pagePath, permissions] of Object.entries(PAGE_PERMISSIONS)) {
    if (pagePath.includes(':')) {
      // 将动态路径转换为正则表达式
      const regex = new RegExp(pagePath.replace(/:[^/]+/g, '[^/]+'))
      if (regex.test(path)) {
        return permissions
      }
    } else if (pagePath === path) {
      return permissions
    }
  }
  
  return { name: '未知页面', description: '未知页面' }
}

/**
 * 检查角色是否可以访问页面
 * @param {string} role - 角色代码
 * @param {string} path - 页面路径
 * @param {Array} userPermissions - 用户权限列表
 * @param {Object} userRooms - 用户寝室信息
 * @returns {Object} 检查结果
 */
export function checkPageAccess(role, path, userPermissions = [], userRooms = {}) {
  const pagePerms = getPagePermissions(path)
  const result = {
    canAccess: false,
    reason: '',
    requiredPermissions: []
  }
  
  // 检查是否需要游客状态
  if (pagePerms.requiresGuest) {
    result.canAccess = role === ROLES.GUEST
    result.reason = result.canAccess ? '' : '此页面仅限未登录用户访问'
    return result
  }
  
  // 检查是否需要登录
  if (pagePerms.requiresAuth && role === ROLES.GUEST) {
    result.reason = '此页面需要登录后访问'
    return result
  }
  
  // 检查特定权限要求
  if (pagePerms.requiresPermission) {
    result.requiredPermissions = Array.isArray(pagePerms.requiresPermission) 
      ? pagePerms.requiresPermission 
      : [pagePerms.requiresPermission]
    
    // 检查用户是否有所需权限
    const hasPermission = result.requiredPermissions.some(perm => 
      userPermissions.includes(perm) || userPermissions.includes('all')
    )
    
    if (!hasPermission) {
      result.reason = `缺少所需权限: ${result.requiredPermissions.join(', ')}`
      return result
    }
  }
  
  // 检查寝室权限要求
  if (pagePerms.requiresRoomPermission) {
    // 从路径中提取寝室ID
    const pathMatch = path.match(/\/rooms\/([^\/]+)/)
    if (pathMatch) {
      const roomId = pathMatch[1]
      const userRoomRole = getUserRoleInRoom({ role, rooms: userRooms }, roomId)
      const roomPermissions = getRolePermissions(userRoomRole)
      
      if (!roomPermissions.includes(pagePerms.requiresRoomPermission)) {
        result.reason = `在此寝室中缺少所需权限: ${pagePerms.requiresRoomPermission}`
        return result
      }
    }
  }
  
  result.canAccess = true
  return result
}

/**
 * 获取角色可访问的页面列表
 * @param {string} role - 角色代码
 * @param {Array} userPermissions - 用户权限列表
 * @param {Object} userRooms - 用户寝室信息
 * @returns {Array} 可访问的页面列表
 */
export function getAccessiblePages(role, userPermissions = [], userRooms = {}) {
  const pages = []
  
  for (const [path, pagePerms] of Object.entries(PAGE_PERMISSIONS)) {
    const accessResult = checkPageAccess(role, path, userPermissions, userRooms)
    if (accessResult.canAccess) {
      pages.push({
        path,
        name: pagePerms.name,
        description: pagePerms.description
      })
    }
  }
  
  return pages
}

/**
 * 获取用户在指定寝室的角色
 * @param {Object} user - 用户对象
 * @param {string} roomId - 寝室ID
 * @returns {string} 用户在该寝室的角色
 */
function getUserRoleInRoom(user, roomId) {
  if (!user || !roomId) {
    return ROLES.GUEST
  }
  
  // 如果用户是系统管理员，在任何寝室都是管理员
  if (user.role === ROLES.ADMIN || user.role === ROLES.SYSTEM_ADMIN) {
    return user.role
  }
  
  // 检查用户是否是该寝室的成员
  const roomMembership = user.rooms && user.rooms.find(room => room.id === roomId)
  
  if (!roomMembership) {
    return ROLES.GUEST
  }
  
  // 返回用户在该寝室的角色
  return roomMembership.role || ROLES.USER
}

/**
 * 比较角色级别
 * @param {string} role1 - 角色1
 * @param {string} role2 - 角色2
 * @returns {number} 比较结果：1表示role1级别高，-1表示role2级别高，0表示相同
 */
export function compareRoleLevel(role1, role2) {
  const level1 = getRoleInfo(role1).level
  const level2 = getRoleInfo(role2).level
  
  if (level1 > level2) return 1
  if (level1 < level2) return -1
  return 0
}

/**
 * 检查角色是否可以管理另一个角色
 * @param {string} managerRole - 管理者角色
 * @param {string} targetRole - 目标角色
 * @returns {boolean} 是否可以管理
 */
export function canManageRole(managerRole, targetRole) {
  return compareRoleLevel(managerRole, targetRole) > 0
}

/**
 * 获取角色升级路径
 * @param {string} currentRole - 当前角色
 * @returns {Array} 可升级的角色列表
 */
export function getRoleUpgradePath(currentRole) {
  const currentLevel = getRoleInfo(currentRole).level
  const upgradePath = []
  
  for (const [role, info] of Object.entries(ROLE_INFO)) {
    if (info.level > currentLevel) {
      upgradePath.push({
        role,
        name: info.name,
        description: info.description,
        level: info.level
      })
    }
  }
  
  // 按级别排序
  return upgradePath.sort((a, b) => a.level - b.level)
}

/**
 * 获取权限使用统计
 * @param {Array} userPermissions - 用户权限列表
 * @returns {Object} 权限使用统计
 */
export function getPermissionUsageStats(userPermissions = []) {
  const stats = {
    total: Object.keys(PERMISSION_INFO).length,
    owned: userPermissions.length,
    byCategory: {},
    byLevel: {
      high: 0,
      medium: 0,
      low: 0
    }
  }
  
  // 按分类统计
  for (const [category, info] of Object.entries(PERMISSION_CATEGORIES)) {
    stats.byCategory[category] = {
      total: info.permissions.length,
      owned: info.permissions.filter(perm => userPermissions.includes(perm)).length
    }
  }
  
  // 按级别统计
  for (const permission of userPermissions) {
    const permInfo = getPermissionInfo(permission)
    if (permInfo.level) {
      stats.byLevel[permInfo.level]++
    }
  }
  
  return stats
}

export default {
  ROLE_INFO,
  PERMISSION_INFO,
  PERMISSION_CATEGORIES,
  PAGE_PERMISSIONS,
  getRoleInfo,
  getPermissionInfo,
  getRolePermissions,
  getCategoryPermissions,
  getPagePermissions,
  checkPageAccess,
  getAccessiblePages,
  compareRoleLevel,
  canManageRole,
  getRoleUpgradePath,
  getPermissionUsageStats
}