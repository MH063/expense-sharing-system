/**
 * API请求模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import request from '@/request/index'

// 模拟axios
vi.mock('axios')

describe('API请求模块测试', () => {
  let mockAxiosInstance

  beforeEach(() => {
    // 重置所有模拟
    vi.clearAllMocks()
    
    // 创建模拟的axios实例
    mockAxiosInstance = {
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      },
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    
    // 模拟axios.create返回模拟实例
    axios.create = vi.fn(() => mockAxiosInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('请求拦截器', () => {
    it('应该添加请求拦截器', () => {
      // 重新导入request模块以触发拦截器设置
      delete require.cache[require.resolve('@/request/index')]
      const requestModule = require('@/request/index').default
      
      // 验证请求拦截器是否被添加
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
    })

    it('应该处理请求拦截器中的token', () => {
      // 模拟localStorage
      const localStorageMock = {
        getItem: vi.fn(() => 'mock-token')
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })

      // 获取请求拦截器回调
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      // 创建模拟的请求配置
      const config = {
        url: '/api/test',
        method: 'get',
        headers: {}
      }
      
      // 调用请求拦截器
      const result = requestInterceptor(config)
      
      // 验证token是否被添加到请求头
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token')
      expect(result.headers.Authorization).toBe('Bearer mock-token')
    })

    it('应该处理请求拦截器中的URL路径', () => {
      // 获取请求拦截器回调
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      // 创建包含重复路径的请求配置
      const config = {
        url: '/api/api/test',
        method: 'get',
        headers: {}
      }
      
      // 调用请求拦截器
      const result = requestInterceptor(config)
      
      // 验证重复的路径是否被处理
      expect(result.url).toBe('/api/test')
    })

    it('应该处理请求拦截器中的数据转换', () => {
      // 获取请求拦截器回调
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0]
      
      // 创建包含数据的请求配置
      const config = {
        url: '/api/test',
        method: 'post',
        data: {
          userName: 'test',
          userPassword: 'password',
          nullValue: null,
          undefinedValue: undefined
        },
        headers: {}
      }
      
      // 调用请求拦截器
      const result = requestInterceptor(config)
      
      // 验证数据是否被转换
      expect(result.data.userName).toBeUndefined()
      expect(result.data.user_name).toBe('test')
      expect(result.data.user_password).toBe('password')
      expect(result.data.nullValue).toBeUndefined()
      expect(result.data.undefinedValue).toBeUndefined()
    })
  })

  describe('响应拦截器', () => {
    it('应该添加响应拦截器', () => {
      // 重新导入request模块以触发拦截器设置
      delete require.cache[require.resolve('@/request/index')]
      const requestModule = require('@/request/index').default
      
      // 验证响应拦截器是否被添加
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })

    it('应该处理响应拦截器中的成功响应', () => {
      // 获取响应拦截器回调
      const successHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][0]
      
      // 创建模拟的响应
      const response = {
        data: {
          success: true,
          data: {
            user_name: 'test',
            user_email: 'test@example.com'
          },
          message: '操作成功'
        },
        status: 200,
        statusText: 'OK'
      }
      
      // 调用响应拦截器
      const result = successHandler(response)
      
      // 验证响应数据是否被转换
      expect(result.data.data.userName).toBe('test')
      expect(result.data.data.userEmail).toBe('test@example.com')
    })

    it('应该处理响应拦截器中的错误响应', () => {
      // 获取响应拦截器错误处理回调
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      
      // 创建模拟的错误响应
      const error = {
        response: {
          status: 401,
          data: {
            message: '未授权'
          }
        }
      }
      
      // 调用响应拦截器错误处理
      const result = errorHandler(error)
      
      // 验证错误是否被处理
      expect(result.success).toBe(false)
      expect(result.message).toBe('未授权')
      expect(result.code).toBe(401)
    })

    it('应该处理响应拦截器中的网络错误', () => {
      // 获取响应拦截器错误处理回调
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1]
      
      // 创建模拟的网络错误
      const error = {
        message: 'Network Error'
      }
      
      // 调用响应拦截器错误处理
      const result = errorHandler(error)
      
      // 验证错误是否被处理
      expect(result.success).toBe(false)
      expect(result.message).toBe('网络错误')
    })
  })

  describe('请求方法', () => {
    it('应该正确执行GET请求', async () => {
      // 模拟成功的响应
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          data: { id: 1, name: 'test' },
          message: '获取成功'
        }
      })
      
      // 调用GET请求
      const result = await request.get('/api/test')
      
      // 验证请求是否被正确调用
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/test')
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('test')
    })

    it('应该正确执行POST请求', async () => {
      // 模拟成功的响应
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          data: { id: 1, name: 'test' },
          message: '创建成功'
        }
      })
      
      // 调用POST请求
      const data = { name: 'test' }
      const result = await request.post('/api/test', data)
      
      // 验证请求是否被正确调用
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/test', data)
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('test')
    })

    it('应该正确执行PUT请求', async () => {
      // 模拟成功的响应
      mockAxiosInstance.put.mockResolvedValue({
        data: {
          success: true,
          data: { id: 1, name: 'updated' },
          message: '更新成功'
        }
      })
      
      // 调用PUT请求
      const data = { name: 'updated' }
      const result = await request.put('/api/test/1', data)
      
      // 验证请求是否被正确调用
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/test/1', data)
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('updated')
    })

    it('应该正确执行DELETE请求', async () => {
      // 模拟成功的响应
      mockAxiosInstance.delete.mockResolvedValue({
        data: {
          success: true,
          data: null,
          message: '删除成功'
        }
      })
      
      // 调用DELETE请求
      const result = await request.delete('/api/test/1')
      
      // 验证请求是否被正确调用
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/test/1')
      expect(result.success).toBe(true)
    })

    it('应该正确处理请求错误', async () => {
      // 模拟错误响应
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: {
            message: '未找到'
          }
        }
      })
      
      // 调用GET请求
      try {
        await request.get('/api/not-found')
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error.success).toBe(false)
        expect(error.message).toBe('未找到')
        expect(error.code).toBe(404)
      }
    })
  })

  describe('工具函数', () => {
    it('应该正确转换camelCase到snake_case', () => {
      // 重新导入request模块以获取工具函数
      delete require.cache[require.resolve('@/request/index')]
      const requestModule = require('@/request/index')
      
      // 创建测试对象
      const camelCaseObj = {
        userName: 'test',
        userPassword: 'password',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe'
        },
        userRoles: ['admin', 'user']
      }
      
      // 调用转换函数
      const snakeCaseObj = requestModule.deepCamelToSnake(camelCaseObj)
      
      // 验证转换结果
      expect(snakeCaseObj.user_name).toBe('test')
      expect(snakeCaseObj.user_password).toBe('password')
      expect(snakeCaseObj.user_profile.first_name).toBe('John')
      expect(snakeCaseObj.user_profile.last_name).toBe('Doe')
      expect(snakeCaseObj.user_roles).toEqual(['admin', 'user'])
    })

    it('应该正确转换snake_case到camelCase', () => {
      // 重新导入request模块以获取工具函数
      delete require.cache[require.resolve('@/request/index')]
      const requestModule = require('@/request/index')
      
      // 创建测试对象
      const snakeCaseObj = {
        user_name: 'test',
        user_password: 'password',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe'
        },
        user_roles: ['admin', 'user']
      }
      
      // 调用转换函数
      const camelCaseObj = requestModule.deepSnakeToCamel(snakeCaseObj)
      
      // 验证转换结果
      expect(camelCaseObj.userName).toBe('test')
      expect(camelCaseObj.userPassword).toBe('password')
      expect(camelCaseObj.userProfile.firstName).toBe('John')
      expect(camelCaseObj.userProfile.lastName).toBe('Doe')
      expect(camelCaseObj.userRoles).toEqual(['admin', 'user'])
    })

    it('应该正确过滤空值', () => {
      // 重新导入request模块以获取工具函数
      delete require.cache[require.resolve('@/request/index')]
      const requestModule = require('@/request/index')
      
      // 创建测试对象
      const objWithNulls = {
        name: 'test',
        email: null,
        password: undefined,
        age: 0,
        active: false,
        roles: []
      }
      
      // 调用过滤函数
      const filteredObj = requestModule.removeNullAndUndefined(objWithNulls)
      
      // 验证过滤结果
      expect(filteredObj.name).toBe('test')
      expect(filteredObj.email).toBeUndefined()
      expect(filteredObj.password).toBeUndefined()
      expect(filteredObj.age).toBe(0) // 0应该被保留
      expect(filteredObj.active).toBe(false) // false应该被保留
      expect(filteredObj.roles).toEqual([]) // 空数组应该被保留
    })
  })
})