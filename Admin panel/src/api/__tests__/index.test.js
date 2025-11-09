/**
 * API接口单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { adminAuthApi, roleApi, userApi, systemApi } from '@/api/index'
import { mockApiRequest, mockApiResponses, mockNetworkError, clearAllMocks } from '@/test/apiMock'

// 模拟request模块
vi.mock('@/request', () => ({
  default: mockApiRequest
}))

describe('API接口测试', () => {
  beforeEach(() => {
    // 清除之前的模拟
    clearAllMocks()
  })

  afterEach(() => {
    // 清除所有模拟
    clearAllMocks()
  })

  describe('管理员认证API', () => {
    it('应该成功登录', async () => {
      const loginData = {
        username: 'admin',
        password: 'password'
      }

      const response = await adminAuthApi.login(loginData)

      expect(response.success).toBe(true)
      expect(response.data.token).toBe('mock-jwt-token')
      expect(response.data.user.username).toBe('admin')
      expect(response.message).toBe('登录成功')
    })

    it('应该登录失败', async () => {
      const loginData = {
        username: 'admin',
        password: 'wrongpassword'
      }

      try {
        await adminAuthApi.login(loginData)
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error.success).toBe(false)
        expect(error.message).toBe('用户名或密码错误')
        expect(error.code).toBe(401)
      }
    })
  })

  describe('角色管理API', () => {
    it('应该获取角色列表', async () => {
      const response = await roleApi.getRoleList()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
      expect(response.data[0].name).toBe('管理员')
      expect(response.message).toBe('获取角色列表成功')
    })

    it('应该创建角色', async () => {
      const roleData = {
        name: '新角色',
        description: '新创建的角色',
        permissions: ['user:read']
      }

      const response = await roleApi.createRole(roleData)

      expect(response.success).toBe(true)
      expect(response.data.name).toBe('新角色')
      expect(response.message).toBe('创建角色成功')
    })

    it('应该获取角色详情', async () => {
      const roleId = 1
      const response = await roleApi.getRoleDetail(roleId)

      expect(response.success).toBe(true)
      expect(response.data.id).toBe(roleId)
    })

    it('应该更新角色', async () => {
      const roleId = 1
      const roleData = {
        name: '更新后的角色',
        description: '更新后的描述'
      }

      const response = await roleApi.updateRole(roleId, roleData)

      expect(response.success).toBe(true)
      expect(response.data.id).toBe(roleId)
    })

    it('应该删除角色', async () => {
      const roleId = 1
      const response = await roleApi.deleteRole(roleId)

      expect(response.success).toBe(true)
    })

    it('应该获取权限列表', async () => {
      const response = await roleApi.getPermissionList()

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('应该获取角色权限', async () => {
      const roleId = 1
      const response = await roleApi.getRolePermissions(roleId)

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
    })
  })

  describe('用户管理API', () => {
    it('应该获取用户列表', async () => {
      const params = {
        page: 1,
        pageSize: 10
      }

      const response = await userApi.getUserList(params)

      expect(response.success).toBe(true)
      expect(response.data.list).toHaveLength(2)
      expect(response.data.total).toBe(2)
      expect(response.data.page).toBe(1)
      expect(response.data.pageSize).toBe(10)
      expect(response.message).toBe('获取用户列表成功')
    })

    it('应该创建用户', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password',
        role: 'user'
      }

      // 模拟创建用户API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: {
            id: 3,
            username: 'newuser',
            email: 'newuser@example.com',
            role: 'user',
            status: 'active'
          },
          message: '创建用户成功'
        })
      )

      const response = await userApi.createUser(userData)

      expect(response.success).toBe(true)
      expect(response.data.username).toBe('newuser')
      expect(response.message).toBe('创建用户成功')
    })

    it('应该更新用户', async () => {
      const userId = 1
      const userData = {
        email: 'updated@example.com'
      }

      // 模拟更新用户API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: {
            id: userId,
            username: 'admin',
            email: 'updated@example.com',
            role: 'admin'
          },
          message: '更新用户成功'
        })
      )

      const response = await userApi.updateUser(userId, userData)

      expect(response.success).toBe(true)
      expect(response.data.email).toBe('updated@example.com')
      expect(response.message).toBe('更新用户成功')
    })

    it('应该删除用户', async () => {
      const userId = 1

      // 模拟删除用户API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: null,
          message: '删除用户成功'
        })
      )

      const response = await userApi.deleteUser(userId)

      expect(response.success).toBe(true)
      expect(response.message).toBe('删除用户成功')
    })
  })

  describe('系统配置API', () => {
    it('应该获取系统配置', async () => {
      const response = await systemApi.getSystemConfig()

      expect(response.success).toBe(true)
      expect(response.data.siteName).toBe('记账系统')
      expect(response.data.siteDescription).toBe('寝室费用分摊记账系统')
      expect(response.data.version).toBe('1.0.0')
      expect(response.data.features.registration).toBe(true)
      expect(response.message).toBe('获取系统配置成功')
    })

    it('应该更新系统配置', async () => {
      const configData = {
        siteName: '更新后的记账系统',
        siteDescription: '更新后的描述'
      }

      // 模拟更新系统配置API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: {
            siteName: '更新后的记账系统',
            siteDescription: '更新后的描述',
            version: '1.0.0'
          },
          message: '更新系统配置成功'
        })
      )

      const response = await systemApi.updateSystemConfig(configData)

      expect(response.success).toBe(true)
      expect(response.data.siteName).toBe('更新后的记账系统')
      expect(response.message).toBe('更新系统配置成功')
    })

    it('应该获取功能开关', async () => {
      // 模拟获取功能开关API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: [
            {
              id: 1,
              name: 'registration',
              description: '用户注册',
              enabled: true
            },
            {
              id: 2,
              name: 'emailNotification',
              description: '邮件通知',
              enabled: true
            }
          ],
          message: '获取功能开关成功'
        })
      )

      const response = await systemApi.getFeatureFlags()

      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
      expect(response.data[0].name).toBe('registration')
      expect(response.data[0].enabled).toBe(true)
    })

    it('应该更新功能开关', async () => {
      const featureId = 1
      const featureData = {
        enabled: false
      }

      // 模拟更新功能开关API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.resolve({
          success: true,
          data: {
            id: featureId,
            name: 'registration',
            description: '用户注册',
            enabled: false
          },
          message: '更新功能开关成功'
        })
      )

      const response = await systemApi.updateFeatureFlag(featureId, featureData)

      expect(response.success).toBe(true)
      expect(response.data.enabled).toBe(false)
      expect(response.message).toBe('更新功能开关成功')
    })
  })

  describe('API错误处理', () => {
    it('应该处理网络错误', async () => {
      // 模拟网络错误
      mockApiRequest.mockImplementationOnce(() => mockNetworkError())

      try {
        await roleApi.getRoleList()
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error.message).toBe('网络错误')
      }
    })

    it('应该处理服务器错误', async () => {
      // 模拟服务器错误
      mockApiRequest.mockImplementationOnce(() => 
        Promise.reject({
          success: false,
          data: null,
          message: '服务器内部错误',
          code: 500
        })
      )

      try {
        await roleApi.getRoleList()
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error.success).toBe(false)
        expect(error.message).toBe('服务器内部错误')
        expect(error.code).toBe(500)
      }
    })

    it('应该处理未找到的API', async () => {
      // 模拟未找到的API
      mockApiRequest.mockImplementationOnce(() => 
        Promise.reject({
          success: false,
          data: null,
          message: '未找到对应的API接口',
          code: 404
        })
      )

      try {
        await roleApi.getRoleDetail(999)
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error.success).toBe(false)
        expect(error.message).toBe('未找到对应的API接口')
        expect(error.code).toBe(404)
      }
    })
  })
})