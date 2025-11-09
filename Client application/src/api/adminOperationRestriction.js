const request = require('request');

/**
 * 管理员操作限制API
 */
const adminOperationRestrictionApi = {
  /**
   * 获取操作限制列表
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  getRestrictions: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制列表失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制详情
   * @param {string} id 限制ID
   * @returns {Promise} Promise对象
   */
  getRestrictionById: (id) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/${id}`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制详情失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 创建操作限制
   * @param {Object} data 限制数据
   * @returns {Promise} Promise对象
   */
  createRestriction: (data) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 201) {
          reject(new Error(body.message || '创建操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 更新操作限制
   * @param {string} id 限制ID
   * @param {Object} data 限制数据
   * @returns {Promise} Promise对象
   */
  updateRestriction: (id, data) => {
    return new Promise((resolve, reject) => {
      request.put({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/${id}`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '更新操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 删除操作限制
   * @param {string} id 限制ID
   * @returns {Promise} Promise对象
   */
  deleteRestriction: (id) => {
    return new Promise((resolve, reject) => {
      request.delete({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/${id}`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '删除操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 启用/禁用操作限制
   * @param {string} id 限制ID
   * @param {boolean} enabled 是否启用
   * @returns {Promise} Promise对象
   */
  toggleRestriction: (id, enabled) => {
    return new Promise((resolve, reject) => {
      request.patch({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/${id}/toggle`,
        body: { enabled },
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '切换操作限制状态失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制统计
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  getRestrictionStats: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/stats`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制统计失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制日志
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  getRestrictionLogs: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/logs`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制日志失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制类型
   * @returns {Promise} Promise对象
   */
  getRestrictionTypes: () => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/types`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制类型失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 批量更新操作限制
   * @param {Array} data 限制数据数组
   * @returns {Promise} Promise对象
   */
  batchUpdateRestrictions: (data) => {
    return new Promise((resolve, reject) => {
      request.put({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/batch`,
        body: { restrictions: data },
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '批量更新操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取用户操作限制
   * @param {string} userId 用户ID
   * @returns {Promise} Promise对象
   */
  getUserRestrictions: (userId) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/user/${userId}`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取用户操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 设置用户操作限制
   * @param {string} userId 用户ID
   * @param {Object} data 限制数据
   * @returns {Promise} Promise对象
   */
  setUserRestrictions: (userId, data) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/user/${userId}`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '设置用户操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制模板
   * @returns {Promise} Promise对象
   */
  getRestrictionTemplates: () => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/templates`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制模板失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 应用操作限制模板
   * @param {string} templateId 模板ID
   * @param {Array} userIds 用户ID数组
   * @returns {Promise} Promise对象
   */
  applyRestrictionTemplate: (templateId, userIds) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/templates/${templateId}/apply`,
        body: { userIds },
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '应用操作限制模板失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制违规记录
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  getRestrictionViolations: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/violations`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制违规记录失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 处理操作限制违规
   * @param {string} violationId 违规ID
   * @param {Object} data 处理数据
   * @returns {Promise} Promise对象
   */
  handleRestrictionViolation: (violationId, data) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/violations/${violationId}/handle`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '处理操作限制违规失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制趋势
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  getRestrictionTrends: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/trends`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制趋势失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 导出操作限制数据
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  exportRestrictions: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/export`,
        qs: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '导出操作限制数据失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 导入操作限制数据
   * @param {Object} data 导入数据
   * @returns {Promise} Promise对象
   */
  importRestrictions: (data) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/import`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '导入操作限制数据失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 获取操作限制配置
   * @returns {Promise} Promise对象
   */
  getRestrictionConfig: () => {
    return new Promise((resolve, reject) => {
      request.get({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/config`,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '获取操作限制配置失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 更新操作限制配置
   * @param {Object} data 配置数据
   * @returns {Promise} Promise对象
   */
  updateRestrictionConfig: (data) => {
    return new Promise((resolve, reject) => {
      request.put({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/config`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '更新操作限制配置失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 测试操作限制
   * @param {Object} data 测试数据
   * @returns {Promise} Promise对象
   */
  testRestriction: (data) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/test`,
        body: data,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '测试操作限制失败'));
        } else {
          resolve(body);
        }
      });
    });
  },

  /**
   * 重置操作限制统计
   * @param {Object} params 查询参数
   * @returns {Promise} Promise对象
   */
  resetRestrictionStats: (params = {}) => {
    return new Promise((resolve, reject) => {
      request.post({
        url: `${process.env.REACT_APP_API_URL || 'http://localhost:4000'}/api/admin/operation-restrictions/stats/reset`,
        body: params,
        json: true
      }, (error, response, body) => {
        if (error) {
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error(body.message || '重置操作限制统计失败'));
        } else {
          resolve(body);
        }
      });
    });
  }
};

module.exports = adminOperationRestrictionApi;