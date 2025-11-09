/**
 * 用户偏好控制器单元测试
 * 测试新响应格式的正确性
 */

const UserPreferencesController = require('../../controllers/user-preferences-controller');

// 模拟数据库
jest.mock('../../config/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('UserPreferencesController - 新响应格式测试', () => {
  let controller;
  
  beforeEach(() => {
    controller = new UserPreferencesController();
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [
          { key: 'theme', value: 'dark' },
          { key: 'language', value: 'zh-CN' }
        ]
      });
      
      await controller.getUserPreferences(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '获取用户偏好设置成功', 
        expect.any(Array)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询出错
      const { pool } = require('../../config/db');
      pool.query.mockRejectedValueOnce(new Error('数据库连接失败'));
      
      await controller.getUserPreferences(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(
        500, 
        '获取用户偏好设置失败', 
        '数据库连接失败'
      );
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('getUserPreference', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'theme'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [{ key: 'theme', value: 'dark' }]
      });
      
      await controller.getUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '获取用户偏好设置成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的404错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'nonexistent'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询返回空结果
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await controller.getUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(404, '偏好设置不存在');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('updateUserPreference', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'theme'
        },
        body: {
          value: 'light'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] }); // 偏好设置不存在
      pool.query.mockResolvedValueOnce({ rows: [] }); // 插入成功
      
      await controller.updateUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '偏好设置更新成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的400错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'theme'
        },
        body: {
          value: null // 值为空
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      await controller.updateUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(400, '偏好设置值不能为空');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('batchUpdateUserPreferences', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          preferences: {
            theme: 'dark',
            language: 'en-US'
          }
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库连接
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      
      const { pool } = require('../../config/db');
      pool.connect.mockResolvedValue(mockClient);
      
      // 模拟数据库查询成功
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 主题偏好不存在
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 插入主题偏好成功
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 语言偏好不存在
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 插入语言偏好成功
      
      await controller.batchUpdateUserPreferences(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '批量更新用户偏好设置成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的400错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          preferences: null // 偏好设置对象为空
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      await controller.batchUpdateUserPreferences(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(400, '偏好设置对象不能为空');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserPreference', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'theme'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [{ key: 'theme', value: 'dark' }]
      });
      pool.query.mockResolvedValueOnce({ rows: [] }); // 删除成功
      
      await controller.deleteUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '偏好设置删除成功'
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的404错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          key: 'nonexistent'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询返回空结果
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await controller.deleteUserPreference(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(404, '偏好设置不存在');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });
});