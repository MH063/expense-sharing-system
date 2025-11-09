import request from '../request'

/**
 * 文档管理相关API
 */
const docsApi = {
  /**
   * 获取文档列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.category - 文档分类
   * @param {string} params.keyword - 关键词搜索
   * @param {string} params.status - 文档状态
   * @returns {Promise} 返回文档列表
   */
  getDocsList(params = {}) {
    return request({
      url: '/docs/list',
      method: 'get',
      params
    })
  },

  /**
   * 获取文档详情
   * @param {string} id - 文档ID
   * @returns {Promise} 返回文档详情
   */
  getDocsDetail(id) {
    return request({
      url: `/docs/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建文档
   * @param {Object} data - 文档数据
   * @param {string} data.title - 文档标题
   * @param {string} data.content - 文档内容
   * @param {string} data.category - 文档分类
   * @param {string} data.tags - 文档标签
   * @param {boolean} data.isPublic - 是否公开
   * @returns {Promise} 返回创建结果
   */
  createDocs(data) {
    return request({
      url: '/docs',
      method: 'post',
      data
    })
  },

  /**
   * 更新文档
   * @param {string} id - 文档ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 返回更新结果
   */
  updateDocs(id, data) {
    return request({
      url: `/docs/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除文档
   * @param {string} id - 文档ID
   * @returns {Promise} 返回删除结果
   */
  deleteDocs(id) {
    return request({
      url: `/docs/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取文档分类列表
   * @returns {Promise} 返回文档分类列表
   */
  getDocsCategories() {
    return request({
      url: '/docs/categories',
      method: 'get'
    })
  },

  /**
   * 获取文档标签列表
   * @returns {Promise} 返回文档标签列表
   */
  getDocsTags() {
    return request({
      url: '/docs/tags',
      method: 'get'
    })
  },

  /**
   * 上传文档附件
   * @param {FormData} formData - 表单数据
   * @returns {Promise} 返回上传结果
   */
  uploadDocsAttachment(formData) {
    return request({
      url: '/docs/upload',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 获取文档版本历史
   * @param {string} id - 文档ID
   * @returns {Promise} 返回文档版本历史
   */
  getDocsVersionHistory(id) {
    return request({
      url: `/docs/${id}/versions`,
      method: 'get'
    })
  },

  /**
   * 恢复文档版本
   * @param {string} id - 文档ID
   * @param {string} versionId - 版本ID
   * @returns {Promise} 返回恢复结果
   */
  restoreDocsVersion(id, versionId) {
    return request({
      url: `/docs/${id}/versions/${versionId}/restore`,
      method: 'post'
    })
  },

  /**
   * 获取文档评论列表
   * @param {string} id - 文档ID
   * @param {Object} params - 查询参数
   * @returns {Promise} 返回文档评论列表
   */
  getDocsComments(id, params = {}) {
    return request({
      url: `/docs/${id}/comments`,
      method: 'get',
      params
    })
  },

  /**
   * 添加文档评论
   * @param {string} id - 文档ID
   * @param {Object} data - 评论数据
   * @returns {Promise} 返回添加结果
   */
  addDocsComment(id, data) {
    return request({
      url: `/docs/${id}/comments`,
      method: 'post',
      data
    })
  },

  /**
   * 删除文档评论
   * @param {string} id - 文档ID
   * @param {string} commentId - 评论ID
   * @returns {Promise} 返回删除结果
   */
  deleteDocsComment(id, commentId) {
    return request({
      url: `/docs/${id}/comments/${commentId}`,
      method: 'delete'
    })
  },

  /**
   * 点赞/取消点赞文档
   * @param {string} id - 文档ID
   * @returns {Promise} 返回操作结果
   */
  toggleDocsLike(id) {
    return request({
      url: `/docs/${id}/like`,
      method: 'post'
    })
  },

  /**
   * 收藏/取消收藏文档
   * @param {string} id - 文档ID
   * @returns {Promise} 返回操作结果
   */
  toggleDocsFavorite(id) {
    return request({
      url: `/docs/${id}/favorite`,
      method: 'post'
    })
  },

  /**
   * 获取用户收藏的文档列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 返回收藏的文档列表
   */
  getUserFavoriteDocs(params = {}) {
    return request({
      url: '/docs/favorites',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户点赞的文档列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 返回点赞的文档列表
   */
  getUserLikedDocs(params = {}) {
    return request({
      url: '/docs/likes',
      method: 'get',
      params
    })
  },

  /**
   * 获取文档阅读统计
   * @param {string} id - 文档ID
   * @returns {Promise} 返回文档阅读统计
   */
  getDocsReadStats(id) {
    return request({
      url: `/docs/${id}/stats`,
      method: 'get'
    })
  },

  /**
   * 记录文档阅读
   * @param {string} id - 文档ID
   * @returns {Promise} 返回记录结果
   */
  recordDocsRead(id) {
    return request({
      url: `/docs/${id}/read`,
      method: 'post'
    })
  },

  /**
   * 搜索文档
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 关键词
   * @param {string} params.category - 分类
   * @param {string} params.tags - 标签
   * @param {string} params.sort - 排序方式
   * @returns {Promise} 返回搜索结果
   */
  searchDocs(params = {}) {
    return request({
      url: '/docs/search',
      method: 'get',
      params
    })
  },

  /**
   * 导出文档
   * @param {string} id - 文档ID
   * @param {string} format - 导出格式 (pdf, docx, md)
   * @returns {Promise} 返回导出结果
   */
  exportDocs(id, format = 'pdf') {
    return request({
      url: `/docs/${id}/export`,
      method: 'get',
      params: { format },
      responseType: 'blob'
    })
  },

  /**
   * 批量操作文档
   * @param {Object} data - 操作数据
   * @param {string[]} data.ids - 文档ID列表
   * @param {string} data.action - 操作类型 (delete, move, tag)
   * @param {Object} data.params - 操作参数
   * @returns {Promise} 返回操作结果
   */
  batchDocsOperation(data) {
    return request({
      url: '/docs/batch',
      method: 'post',
      data
    })
  }
}

// 导出API对象和单独的函数以保持向后兼容
export default docsApi
export const {
  getDocsList,
  getDocsDetail,
  createDocs,
  updateDocs,
  deleteDocs,
  getDocsCategories,
  getDocsTags,
  uploadDocsAttachment,
  getDocsVersionHistory,
  restoreDocsVersion,
  getDocsComments,
  addDocsComment,
  deleteDocsComment,
  toggleDocsLike,
  toggleDocsFavorite,
  getUserFavoriteDocs,
  getUserLikedDocs,
  getDocsReadStats,
  recordDocsRead,
  searchDocs,
  exportDocs,
  batchDocsOperation
} = docsApi