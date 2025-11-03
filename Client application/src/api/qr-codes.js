import axios from 'axios';

/**
 * 收款码管理相关API
 */

// 获取用户收款码列表
export const getUserQrCodes = async () => {
  try {
    const response = await axios.get('/api/qr-codes');
    return response.data;
  } catch (error) {
    console.error('获取收款码列表失败:', error);
    throw error;
  }
};

// 上传收款码
export const uploadQrCode = async (formData) => {
  try {
    const response = await axios.post('/api/qr-codes/upload', formData, {
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

// 激活/停用收款码
export const toggleQrCodeStatus = async (id, isActive) => {
  try {
    const response = await axios.patch(`/api/qr-codes/${id}/status`, {
      is_active: isActive
    });
    return response.data;
  } catch (error) {
    console.error('更新收款码状态失败:', error);
    throw error;
  }
};

// 设置默认收款码
export const setDefaultQrCode = async (id) => {
  try {
    const response = await axios.patch(`/api/qr-codes/${id}/default`);
    return response.data;
  } catch (error) {
    console.error('设置默认收款码失败:', error);
    throw error;
  }
};

// 删除收款码
export const deleteQrCode = async (id) => {
  try {
    const response = await axios.delete(`/api/qr-codes/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除收款码失败:', error);
    throw error;
  }
};

// 获取用户的默认收款码
export const getDefaultQrCode = async (qrType) => {
  try {
    const response = await axios.get(`/api/qr-codes/default?qr_type=${qrType}`);
    return response.data;
  } catch (error) {
    console.error('获取默认收款码失败:', error);
    throw error;
  }
};

// 导出qrCodesApi对象
export const qrCodesApi = {
  getUserQrCodes,
  uploadQrCode,
  toggleQrCodeStatus,
  setDefaultQrCode,
  deleteQrCode,
  getDefaultQrCode
};