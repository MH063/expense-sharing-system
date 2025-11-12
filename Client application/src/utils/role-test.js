/**
 * 角色识别功能测试工具
 * 用于验证用户角色识别和显示是否正确工作
 */

/**
 * 测试当前用户的角色识别状态
 * @param {Object} authStore - 认证状态store
 * @returns {Object} 测试结果
 */
export function testUserRoleRecognition(authStore) {
  const results = {
    isAuthenticated: authStore.isAuthenticated,
    currentUser: authStore.currentUser,
    roles: authStore.roles,
    permissions: authStore.permissions,
    hasRoleMethod: typeof authStore.hasRole,
    hasPermissionMethod: typeof authStore.hasPermission,
    issues: [],
    recommendations: []
  }

  // 检查认证状态
  if (!results.isAuthenticated) {
    results.issues.push('用户未认证')
  }

  // 检查用户信息
  if (!results.currentUser) {
    results.issues.push('缺少用户信息')
  } else {
    // 检查角色信息
    if (!Array.isArray(results.roles) || results.roles.length === 0) {
      results.issues.push('用户角色信息为空或格式不正确')
    } else {
      console.log('✅ 用户角色信息正常:', results.roles)
    }

    // 检查权限信息
    if (!Array.isArray(results.permissions)) {
      results.issues.push('用户权限信息格式不正确')
    } else {
      console.log('✅ 用户权限信息正常:', results.permissions)
    }
  }

  // 检查方法是否存在
  if (typeof authStore.hasRole !== 'function') {
    results.issues.push('缺少hasRole方法')
  }

  if (typeof authStore.hasPermission !== 'function') {
    results.issues.push('缺少hasPermission方法')
  }

  // 生成建议
  if (results.issues.length === 0) {
    results.recommendations.push('角色识别功能工作正常')
  } else {
    results.recommendations.push('需要修复上述问题以确保角色识别正常工作')
  }

  return results
}

/**
 * 测试角色显示映射
 * @param {string} role - 角色名称
 * @returns {Object} 测试结果
 */
export function testRoleDisplayMapping(role) {
  const roleMap = {
    'admin': '管理员',
    'user': '用户',
    'sysadmin': '系统管理员',
    'system_admin': '系统管理员',
    'room_leader': '寝室长',
    'room_owner': '寝室长',
    'payer': '缴费人',
    'member': '成员',
    'guest': '访客'
  }

  const displayName = roleMap[role] || '未知角色'
  
  return {
    originalRole: role,
    displayName,
    isMapped: displayName !== '未知角色',
    suggestions: displayName === '未知角色' ? [`建议在角色映射表中添加 '${role}' 角色的映射`] : []
  }
}

/**
 * 完整的角色识别和显示测试
 * @param {Object} authStore - 认证状态store
 */
export function runFullRoleTest(authStore) {
  console.log('=== 开始角色识别和显示测试 ===')
  
  const recognitionResults = testUserRoleRecognition(authStore)
  console.log('角色识别测试结果:', recognitionResults)
  
  if (recognitionResults.roles && Array.isArray(recognitionResults.roles)) {
    console.log('\n=== 角色显示映射测试 ===')
    recognitionResults.roles.forEach(role => {
      const mappingResult = testRoleDisplayMapping(role)
      console.log(`角色 ${role} 显示为: ${mappingResult.displayName}`)
      if (!mappingResult.isMapped) {
        mappingResult.suggestions.forEach(suggestion => console.warn(suggestion))
      }
    })
  }
  
  console.log('\n=== 测试完成 ===')
  return recognitionResults
}