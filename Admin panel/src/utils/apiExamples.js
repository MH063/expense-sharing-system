/**
 * API调用示例
 * 展示如何使用新的错误处理和响应处理机制
 */
import request from '@/request'
import apiResponseHandler from '@/utils/apiResponseHandler'
import messageManager from '@/utils/messageManager'
import { loadingState } from '@/components/GlobalLoading.vue'

/**
 * 用户管理API示例
 */
export const userApiExample = {
  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.keyword - 搜索关键词
   * @returns {Promise} 处理后的响应结果
   */
  async getUserList(params = {}) {
    // 使用API响应处理器包装API调用
    const wrappedApiCall = apiResponseHandler.createApiWrapper(
      (params) => request.get('/admin/users', { params }),
      {
        loadingMessage: '正在获取用户列表...',
        successMessage: '获取用户列表成功',
        errorMessage: '获取用户列表失败',
        showLoading: true,
        showMessage: true
      }
    )

    return wrappedApiCall(params)
  },

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise} 处理后的响应结果
   */
  async createUser(userData) {
    try {
      // 显示加载状态
      loadingState.show('正在创建用户...')
      
      // 发送请求
      const response = await request.post('/admin/users', userData)
      
      // 处理响应
      return apiResponseHandler.handleResponse(response, {
        successMessage: '用户创建成功',
        onSuccess: (data) => {
          console.log('[Admin][用户创建成功]', data)
          // 可以在这里添加额外的成功处理逻辑
        }
      })
    } catch (error) {
      // 处理错误
      return apiResponseHandler.handleError(error, {
        errorMessage: '用户创建失败',
        onError: (error) => {
          console.error('[Admin][用户创建失败]', error)
          // 可以在这里添加额外的错误处理逻辑
        }
      })
    } finally {
      // 隐藏加载状态
      loadingState.hide()
    }
  },

  /**
   * 更新用户
   * @param {string} userId - 用户ID
   * @param {Object} userData - 用户数据
   * @returns {Promise} 处理后的响应结果
   */
  async updateUser(userId, userData) {
    return apiResponseHandler.createApiWrapper(
      (userId, userData) => request.put(`/admin/users/${userId}`, userData),
      {
        loadingMessage: '正在更新用户...',
        successMessage: '用户更新成功',
        errorMessage: '用户更新失败',
        onSuccess: (data) => {
          console.log('[Admin][用户更新成功]', data)
        }
      }
    )(userId, userData)
  },

  /**
   * 删除用户
   * @param {string} userId - 用户ID
   * @returns {Promise} 处理后的响应结果
   */
  async deleteUser(userId) {
    // 使用确认对话框
    try {
      await messageManager.confirm('确定要删除该用户吗？此操作不可恢复', '删除确认')
      
      // 确认后执行删除操作
      return apiResponseHandler.createApiWrapper(
        (userId) => request.delete(`/admin/users/${userId}`),
        {
          loadingMessage: '正在删除用户...',
          successMessage: '用户删除成功',
          errorMessage: '用户删除失败',
          onSuccess: () => {
            console.log('[Admin][用户删除成功]', userId)
          }
        }
      )(userId)
    } catch (error) {
      // 用户取消操作或操作失败
      if (error === 'cancel') {
        console.log('[Admin][用户取消删除操作]')
        return { success: false, message: '用户取消操作' }
      }
      
      // 其他错误
      return apiResponseHandler.handleError(error, {
        errorMessage: '删除用户失败'
      })
    }
  }
}

/**
 * 批量操作示例
 */
export const batchOperationExample = {
  /**
   * 批量删除用户
   * @param {Array} userIds - 用户ID数组
   * @returns {Promise} 处理后的响应结果
   */
  async batchDeleteUsers(userIds) {
    if (!userIds || userIds.length === 0) {
      messageManager.warning('请选择要删除的用户')
      return { success: false, message: '请选择要删除的用户' }
    }

    try {
      // 确认批量操作
      await messageManager.confirm(
        `确定要删除选中的 ${userIds.length} 个用户吗？此操作不可恢复`,
        '批量删除确认'
      )
      
      // 显示加载状态
      loadingState.show(`正在删除 ${userIds.length} 个用户...`)
      
      // 执行批量删除
      const response = await request.post('/admin/users/batch-delete', { userIds })
      
      // 处理响应
      const result = apiResponseHandler.handleResponse(response, {
        successMessage: `成功删除 ${userIds.length} 个用户`,
        onSuccess: (data) => {
          console.log('[Admin][批量删除用户成功]', data)
        }
      })
      
      return result
    } catch (error) {
      // 处理错误
      if (error === 'cancel') {
        console.log('[Admin][用户取消批量删除操作]')
        return { success: false, message: '用户取消操作' }
      }
      
      return apiResponseHandler.handleError(error, {
        errorMessage: '批量删除用户失败'
      })
    } finally {
      // 隐藏加载状态
      loadingState.hide()
    }
  }
}

/**
 * 文件上传示例
 */
export const fileUploadExample = {
  /**
   * 上传头像
   * @param {File} file - 文件对象
   * @returns {Promise} 处理后的响应结果
   */
  async uploadAvatar(file) {
    if (!file) {
      messageManager.error('请选择要上传的文件')
      return { success: false, message: '请选择要上传的文件' }
    }

    // 检查文件大小
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      messageManager.error('文件大小不能超过2MB')
      return { success: false, message: '文件大小不能超过2MB' }
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      messageManager.error('只支持上传JPG、PNG、GIF格式的图片')
      return { success: false, message: '只支持上传JPG、PNG、GIF格式的图片' }
    }

    try {
      // 创建FormData
      const formData = new FormData()
      formData.append('avatar', file)
      
      // 显示加载状态
      loadingState.show('正在上传头像...')
      
      // 发送请求
      const response = await request.post('/admin/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // 处理响应
      return apiResponseHandler.handleResponse(response, {
        successMessage: '头像上传成功',
        onSuccess: (data) => {
          console.log('[Admin][头像上传成功]', data)
        }
      })
    } catch (error) {
      return apiResponseHandler.handleError(error, {
        errorMessage: '头像上传失败'
      })
    } finally {
      loadingState.hide()
    }
  }
}

/**
 * 表单提交示例
 */
export const formSubmitExample = {
  /**
   * 提交用户表单
   * @param {Object} formData - 表单数据
   * @param {Object} formRef - 表单引用
   * @returns {Promise} 处理后的响应结果
   */
  async submitUserForm(formData, formRef) {
    try {
      // 表单验证
      if (formRef) {
        const valid = await formRef.validate()
        if (!valid) {
          messageManager.warning('请检查表单填写是否正确')
          return { success: false, message: '请检查表单填写是否正确' }
        }
      }
      
      // 提交表单
      if (formData.id) {
        // 更新用户
        return await userApiExample.updateUser(formData.id, formData)
      } else {
        // 创建用户
        return await userApiExample.createUser(formData)
      }
    } catch (error) {
      return apiResponseHandler.handleError(error, {
        errorMessage: '表单提交失败'
      })
    }
  }
}