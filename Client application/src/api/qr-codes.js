import http from './config';

/**
 * 收款码管理相关API
 */

export const getUserQrCodes = async () => {
  try {
    const response = await http.get('/qr-codes');
    return response.data;
  } catch (error) {
    console.error('获取收款码列表失败:', error);
    throw error;
  }
};

export const uploadQrCode = async (formData) => {
  try {
    const response = await http.post('/qr-codes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传收款码失败:', error);
    throw error;
  }
};

export const toggleQrCodeStatus = async (id, isActive) => {
  try {
    const response = await http.patch(`/qr-codes/${id}/status`, {
      is_active: isActive
    });
    return response.data;
  } catch (error) {
    console.error('切换收款码状态失败:', error);
    throw error;
  }
};

export const setDefaultQrCode = async (id) => {
  try {
    const response = await http.patch(`/qr-codes/${id}/default`);
    return response.data;
  } catch (error) {
    console.error('设置默认收款码失败:', error);
    throw error;
  }
};

export const deleteQrCode = async (id) => {
  try {
    const response = await http.delete(`/qr-codes/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除收款码失败:', error);
    throw error;
  }
};

export const getDefaultQrCode = async (qrType) => {
  try {
    const response = await http.get(`/qr-codes/default?qr_type=${qrType}`);
    return response.data;
  } catch (error) {
    console.error('获取默认收款码失败:', error);
    throw error;
  }
};

export const qrCodesApi = {
  /**
   * 获取收款码列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 收款码列表
   */
  getQrCodes(params = {}) {
    return http.get('/qr-codes', { params });
  },

  /**
   * 创建收款码
   * @param {Object} data - 收款码数据
   * @returns {Promise} 创建的收款码
   */
  createQrCode(data) {
    return http.post('/qr-codes', data);
  },

  /**
   * 更新收款码
   * @param {string} id - 收款码ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的收款码
   */
  updateQrCode(id, data) {
    return http.put(`/qr-codes/${id}`, data);
  },

  /**
   * 删除收款码
   * @param {string} id - 收款码ID
   * @returns {Promise} 删除结果
   */
  deleteQrCode(id) {
    return http.delete(`/qr-codes/${id}`);
  },

  /**
   * 设置默认收款码
   * @param {string} id - 收款码ID
   * @returns {Promise} 更新结果
   */
  setDefaultQrCode(id) {
    return http.patch(`/qr-codes/${id}/default`);
  },

  /**
   * 切换收款码状态
   * @param {string} id - 收款码ID
   * @param {boolean} isActive - 是否激活
   * @returns {Promise} 更新结果
   */
  toggleQrCodeStatus(id, isActive) {
    return http.patch(`/qr-codes/${id}/status`, { is_active: isActive });
  },

  /**
   * 获取默认收款码
   * @param {string} qrType - 收款码类型
   * @returns {Promise} 默认收款码
   */
  getDefaultQrCode(qrType) {
    return http.get(`/qr-codes/default?qr_type=${qrType}`);
  },

  /**
   * 上传收款码图片
   * @param {FormData} formData - 表单数据
   * @returns {Promise} 上传结果
   */
  uploadQrCode(formData) {
    return http.post('/qr-codes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default qrCodesApi;