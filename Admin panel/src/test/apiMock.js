/**
 * API测试工具
 * 用于测试API接口的响应和处理
 */

import { vi } from 'vitest'

// 模拟API响应数据
export const mockApiResponses = {
  // 管理员认证相关
  auth: {
    login: {
      success: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin'
          }
        },
        message: '登录成功'
      },
      error: {
        success: false,
        data: null,
        message: '用户名或密码错误',
        code: 401
      }
    }
  },
  
  // 角色管理相关
  roles: {
    list: {
      success: {
        success: true,
        data: [
          {
            id: 1,
            name: '管理员',
            description: '系统管理员',
            permissions: ['user:read', 'user:write', 'role:read', 'role:write']
          },
          {
            id: 2,
            name: '普通用户',
            description: '普通用户角色',
            permissions: ['user:read']
          }
        ],
        message: '获取角色列表成功'
      },
      error: {
        success: false,
        data: null,
        message: '获取角色列表失败',
        code: 500
      }
    },
    
    create: {
      success: {
        success: true,
        data: {
          id: 3,
          name: '新角色',
          description: '新创建的角色',
          permissions: ['user:read']
        },
        message: '创建角色成功'
      },
      error: {
        success: false,
        data: null,
        message: '创建角色失败',
        code: 500
      }
    }
  },
  
  // 用户管理相关
  users: {
    list: {
      success: {
        success: true,
        data: {
          list: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              role: 'admin',
              status: 'active',
              createdAt: '2023-01-01T00:00:00Z'
            },
            {
              id: 2,
              username: 'user1',
              email: 'user1@example.com',
              role: 'user',
              status: 'active',
              createdAt: '2023-01-02T00:00:00Z'
            }
          ],
          total: 2,
          page: 1,
          pageSize: 10
        },
        message: '获取用户列表成功'
      },
      error: {
        success: false,
        data: null,
        message: '获取用户列表失败',
        code: 500
      }
    }
  },
  
  // 系统配置相关
  system: {
    config: {
      success: {
        success: true,
        data: {
          siteName: '记账系统',
          siteDescription: '寝室费用分摊记账系统',
          logoUrl: 'https://example.com/logo.png',
          version: '1.0.0',
          features: {
            registration: true,
            emailNotification: true,
            smsNotification: false
          }
        },
        message: '获取系统配置成功'
      },
      error: {
        success: false,
        data: null,
        message: '获取系统配置失败',
        code: 500
      }
    }
  }
}

// 模拟API请求函数
export const mockApiRequest = vi.fn((config) => {
  return new Promise((resolve, reject) => {
    // 解析URL和方法
    const { url, method } = config
    
    // 根据URL和方法返回模拟数据
    if (url === '/admin/auth/login' && method === 'post') {
      // 根据请求参数决定返回成功或失败
      // 使用环境变量配置测试密码，未设置时使用默认测试密码
      const testPassword = process.env.TEST_PASSWORD || 'test123456';
      if (config.data.username === 'admin' && config.data.password === testPassword) {
        setTimeout(() => resolve(mockApiResponses.auth.login.success), 100)
      } else {
        setTimeout(() => reject(mockApiResponses.auth.login.error), 100)
      }
    } else if (url === '/roles' && method === 'get') {
      setTimeout(() => resolve(mockApiResponses.roles.list.success), 100)
    } else if (url === '/roles' && method === 'post') {
      setTimeout(() => resolve(mockApiResponses.roles.create.success), 100)
    } else if (url === '/admin/users' && method === 'get') {
      setTimeout(() => resolve(mockApiResponses.users.list.success), 100)
    } else if (url === '/admin/system/config' && method === 'get') {
      setTimeout(() => resolve(mockApiResponses.system.config.success), 100)
    } else {
      // 默认错误响应
      setTimeout(() => reject({
        success: false,
        data: null,
        message: '未找到对应的API接口',
        code: 404
      }), 100)
    }
  })
})

// 模拟网络错误
export const mockNetworkError = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('网络错误')), 100)
  })
}

// 模拟超时错误
export const mockTimeoutError = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('请求超时')), 15000)
  })
}

// 模拟服务器错误
export const mockServerError = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject({
      success: false,
      data: null,
      message: '服务器内部错误',
      code: 500
    }), 100)
  })
}

// 清除所有模拟
export const clearAllMocks = () => {
  mockApiRequest.mockClear()
}