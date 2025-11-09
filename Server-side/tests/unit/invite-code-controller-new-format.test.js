/**
 * 邀请码控制器单元测试
 * 测试新响应格式的正确性
 */

const InviteCodeController = require('../../controllers/invite-code-controller');

// 模拟数据库
jest.mock('../../config/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('InviteCodeController - 新响应格式测试', () => {
  let controller;
  
  beforeEach(() => {
    controller = new InviteCodeController();
    jest.clearAllMocks();
  });

  describe('generateInviteCode', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          roomId: 'room1',
          maxUses: 10
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [{ creator_id: 'user1' }] }); // 房间存在且用户是管理员
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, code: 'ABC123' }] }); // 邀请码创建成功
      
      await controller.generateInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        201, 
        '邀请码生成成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的房间不存在错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          roomId: 'room999',
          maxUses: 10
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询返回空结果
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] }); // 房间不存在
      
      await controller.generateInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(404, '房间不存在');
      expect(mockRes.success).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的权限错误响应', async () => {
      const mockReq = {
        user: { sub: 'user2' }, // 非房间管理员
        body: {
          roomId: 'room1',
          maxUses: 10
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [{ creator_id: 'user1' }] }); // 房间存在但用户不是管理员
      
      await controller.generateInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(403, '只有房间管理员可以生成邀请码');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('verifyInviteCode', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          code: 'ABC123'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          room_id: 'room1',
          room_name: 'Test Room',
          room_admin: 'admin1',
          expires_at: new Date(Date.now() + 86400000), // 明天过期
          used_count: 0,
          max_uses: 10
        }]
      });
      pool.query.mockResolvedValueOnce({ rows: [] }); // 用户不是房间成员
      
      await controller.verifyInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '邀请码验证成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的邀请码不存在错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          code: 'INVALID'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询返回空结果
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await controller.verifyInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(404, '邀请码不存在');
      expect(mockRes.success).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的邀请码已过期错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          code: 'EXPIRED'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功但邀请码已过期
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          room_id: 'room1',
          room_name: 'Test Room',
          room_admin: 'admin1',
          expires_at: new Date(Date.now() - 86400000), // 昨天已过期
          used_count: 0,
          max_uses: 10
        }]
      });
      
      await controller.verifyInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(400, '邀请码已过期');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('useInviteCode', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          code: 'ABC123'
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
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          room_id: 'room1',
          room_name: 'Test Room',
          expires_at: new Date(Date.now() + 86400000), // 明天过期
          used_count: 0,
          max_uses: 10
        }]
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 用户不是房间成员
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 加入房间成功
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 更新邀请码使用次数
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 记录使用日志
      
      await controller.useInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '成功加入房间', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });
  });

  describe('getRoomInviteCodes', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          roomId: 'room1'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ rows: [{ creator_id: 'user1' }] }); // 房间存在且用户是管理员
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, code: 'ABC123' }] }); // 邀请码列表
      
      await controller.getRoomInviteCodes(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '获取邀请码列表成功', 
        expect.any(Array)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });
  });

  describe('revokeInviteCode', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: {
          id: '1'
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      const { pool } = require('../../config/db');
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          id: 1,
          room_admin: 'user1' // 用户是房间管理员
        }]
      });
      pool.query.mockResolvedValueOnce({ rows: [] }); // 撤销成功
      
      await controller.revokeInviteCode(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '邀请码已撤销'
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });
  });
});