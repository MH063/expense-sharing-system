/**
 * 系统配置控制器单元测试
 * 测试新响应格式的正确性
 */

const SystemConfigController = require('../../controllers/system-config-controller');

// 模拟数据库
jest.mock('../../config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('SystemConfigController - 新响应格式测试', () => {
  let controller;
  
  beforeEach(() => {
    controller = new SystemConfigController();
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        query: {}
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const mockConfig = { key: 'value' };
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [mockConfig] });
      
      await controller.getConfig(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '获取系统配置成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的错误响应', async () => {
      const mockReq = {
        query: {}
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询失败
      const { pool } = require('../../config/db');
      pool.query.mockRejectedValueOnce(new Error('数据库连接失败'));
      
      await controller.getConfig(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(500, '服务器内部错误');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        body: {
          key: 'value'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] }); // 模拟更新成功
      
      await controller.updateConfig(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '已更新系统配置'
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的验证错误响应', async () => {
      const mockReq = {
        body: {} // 空请求体
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      await controller.updateConfig(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(400, '更新内容不能为空');
      expect(mockRes.success).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的数据库错误响应', async () => {
      const mockReq = {
        body: {
          key: 'value'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询失败
      const { pool } = require('../../config/db');
      pool.query.mockRejectedValueOnce(new Error('数据库连接失败'));
      
      await controller.updateConfig(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(500, '服务器内部错误');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });
});