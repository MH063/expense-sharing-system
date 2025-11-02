/**
 * 权限管理 Vuex 模块
 * 用于管理用户权限和角色
 */

import { 
  ROLES, 
  PERMISSIONS, 
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserRoleInRoom,
  canAccessRoom,
  getAccessibleRooms
} from '@/utils/permissions'

// 状态
const state = {
  // 当前用户
  user: null,
  
  // 用户角色
  userRole: ROLES.GUEST,
  
  // 用户权限列表
  userPermissions: [],
  
  // 当前寝室ID（用户当前操作的寝室）
  currentRoomId: null,
  
  // 当前寝室角色
  currentRoomRole: ROLES.GUEST,
  
  // 当前寝室权限
  currentRoomPermissions: [],
  
  // 权限加载状态
  permissionsLoading: false,
  
  // 权限错误信息
  permissionsError: null
}

// 计算属性
const getters = {
  // 获取当前用户
  currentUser: state => state.user,
  
  // 获取用户角色
  userRole: state => state.userRole,
  
  // 获取用户权限列表
  userPermissions: state => state.userPermissions,
  
  // 检查是否是管理员
  isAdmin: state => state.userRole === ROLES.ADMIN,
  
  // 检查是否是寝室所有者
  isRoomOwner: state => state.currentRoomRole === ROLES.ROOM_OWNER,
  
  // 检查是否是寝室成员
  isRoomMember: state => state.currentRoomRole === ROLES.ROOM_MEMBER,
  
  // 获取当前寝室ID
  currentRoomId: state => state.currentRoomId,
  
  // 获取当前寝室角色
  currentRoomRole: state => state.currentRoomRole,
  
  // 获取当前寝室权限
  currentRoomPermissions: state => state.currentRoomPermissions,
  
  // 检查权限加载状态
  permissionsLoading: state => state.permissionsLoading,
  
  // 检查权限错误信息
  permissionsError: state => state.permissionsError,
  
  // 检查用户是否具有指定权限
  hasPermission: (state) => (permission, resource = null) => {
    return hasPermission(state.user, permission, resource);
  },
  
  // 检查用户是否具有任一权限
  hasAnyPermission: (state) => (permissions, resource = null) => {
    return hasAnyPermission(state.user, permissions, resource);
  },
  
  // 检查用户是否具有所有权限
  hasAllPermissions: (state) => (permissions, resource = null) => {
    return hasAllPermissions(state.user, permissions, resource);
  },
  
  // 检查用户是否可以访问指定寝室
  canAccessRoom: (state) => (roomId, permission = PERMISSIONS.ROOM_VIEW) => {
    return canAccessRoom(state.user, roomId, permission);
  },
  
  // 获取用户可访问的寝室列表
  getAccessibleRooms: (state) => (rooms) => {
    return getAccessibleRooms(state.user, rooms);
  }
}

// 操作
const mutations = {
  // 设置用户
  SET_USER(state, user) {
    state.user = user;
    
    // 更新用户角色
    state.userRole = user ? user.role || ROLES.GUEST : ROLES.GUEST;
    
    // 更新用户权限列表
    state.userPermissions = user 
      ? ROLE_PERMISSIONS[state.userRole] || [] 
      : [];
  },
  
  // 设置当前寝室
  SET_CURRENT_ROOM(state, roomId) {
    state.currentRoomId = roomId;
    
    // 更新当前寝室角色
    state.currentRoomRole = roomId 
      ? getUserRoleInRoom(state.user, roomId)
      : ROLES.GUEST;
    
    // 更新当前寝室权限
    state.currentRoomPermissions = roomId 
      ? ROLE_PERMISSIONS[state.currentRoomRole] || []
      : [];
  },
  
  // 设置权限加载状态
  SET_PERMISSIONS_LOADING(state, loading) {
    state.permissionsLoading = loading;
  },
  
  // 设置权限错误信息
  SET_PERMISSIONS_ERROR(state, error) {
    state.permissionsError = error;
  },
  
  // 清除权限状态
  CLEAR_PERMISSIONS(state) {
    state.user = null;
    state.userRole = ROLES.GUEST;
    state.userPermissions = [];
    state.currentRoomId = null;
    state.currentRoomRole = ROLES.GUEST;
    state.currentRoomPermissions = [];
    state.permissionsError = null;
  }
}

// 异步操作
const actions = {
  /**
   * 初始化权限
   * @param {Object} context - Vuex上下文
   * @param {Object} user - 用户对象
   */
  async initializePermissions({ commit }, user) {
    try {
      commit('SET_PERMISSIONS_LOADING', true);
      commit('SET_PERMISSIONS_ERROR', null);
      
      // 设置用户
      commit('SET_USER', user);
      
      console.log('权限初始化完成', {
        userRole: user ? user.role : ROLES.GUEST,
        permissions: user ? ROLE_PERMISSIONS[user.role] || [] : []
      });
      
      return true;
    } catch (error) {
      console.error('权限初始化失败:', error);
      commit('SET_PERMISSIONS_ERROR', error.message);
      return false;
    } finally {
      commit('SET_PERMISSIONS_LOADING', false);
    }
  },
  
  /**
   * 切换当前寝室
   * @param {Object} context - Vuex上下文
   * @param {string} roomId - 寝室ID
   */
  async switchCurrentRoom({ commit }, roomId) {
    try {
      commit('SET_PERMISSIONS_LOADING', true);
      commit('SET_PERMISSIONS_ERROR', null);
      
      // 设置当前寝室
      commit('SET_CURRENT_ROOM', roomId);
      
      console.log('切换当前寝室成功', {
        roomId,
        roomRole: roomId ? getUserRoleInRoom(state.user, roomId) : ROLES.GUEST,
        permissions: roomId ? ROLE_PERMISSIONS[getUserRoleInRoom(state.user, roomId)] || [] : []
      });
      
      return true;
    } catch (error) {
      console.error('切换当前寝室失败:', error);
      commit('SET_PERMISSIONS_ERROR', error.message);
      return false;
    } finally {
      commit('SET_PERMISSIONS_LOADING', false);
    }
  },
  
  /**
   * 检查权限
   * @param {Object} context - Vuex上下文
   * @param {Object} payload - 参数对象
   * @param {string} payload.permission - 权限标识
   * @param {Object} payload.resource - 资源对象（可选）
   * @param {string} payload.roomId - 寝室ID（可选）
   * @returns {boolean} 是否具有权限
   */
  async checkPermission({ state, getters }, { permission, resource = null, roomId = null }) {
    try {
      // 如果指定了寝室ID，检查寝室权限
      if (roomId && roomId !== state.currentRoomId) {
        return canAccessRoom(state.user, roomId, permission);
      }
      
      // 否则检查当前权限
      return getters.hasPermission(permission, resource);
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  },
  
  /**
   * 检查多个权限
   * @param {Object} context - Vuex上下文
   * @param {Object} payload - 参数对象
   * @param {Array} payload.permissions - 权限标识数组
   * @param {string} payload.type - 检查类型：'any' 或 'all'
   * @param {Object} payload.resource - 资源对象（可选）
   * @param {string} payload.roomId - 寝室ID（可选）
   * @returns {boolean} 是否具有权限
   */
  async checkPermissions({ state, getters }, { permissions, type = 'any', resource = null, roomId = null }) {
    try {
      // 如果指定了寝室ID，检查寝室权限
      if (roomId && roomId !== state.currentRoomId) {
        const userRoleInRoom = getUserRoleInRoom(state.user, roomId);
        const roomPermissions = ROLE_PERMISSIONS[userRoleInRoom] || [];
        
        if (type === 'any') {
          return permissions.some(permission => roomPermissions.includes(permission));
        } else {
          return permissions.every(permission => roomPermissions.includes(permission));
        }
      }
      
      // 否则检查当前权限
      if (type === 'any') {
        return getters.hasAnyPermission(permissions, resource);
      } else {
        return getters.hasAllPermissions(permissions, resource);
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  },
  
  /**
   * 清除权限状态
   * @param {Object} context - Vuex上下文
   */
  async clearPermissions({ commit }) {
    try {
      commit('CLEAR_PERMISSIONS');
      console.log('权限状态已清除');
      return true;
    } catch (error) {
      console.error('清除权限状态失败:', error);
      return false;
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}