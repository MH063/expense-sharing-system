/**
 * 支付转移控制器单元测试
 * 测试新响应格式的正确性
 */

const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/db');
const PaymentTransferController = require('../../controllers/payment-transfer-controller');

// 模拟数据库查询结果
const mockTransferRecord = {
  id: 1,
  from_payment_id: 101,
  to_payment_id: 102,
  from_user_id: 'user1',
  to_user_id: 'user2',
  amount: 100.00,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date()
};

// 模拟数据库
jest.mock('../../config/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('PaymentTransferController - 新响应格式测试', () => {
  let controller;
  
  beforeEach(() => {
    controller = new PaymentTransferController();
    jest.clearAllMocks();
  });

  describe('createPaymentTransfer', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          from_payment_id: 101,
          to_payment_id: 102,
          amount: 100.00
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] });
      pool.query.mockResolvedValueOnce({ rows: [] }); // 模拟没有重复记录
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] }); // 模拟插入成功
      
      await controller.createPaymentTransfer(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        201, 
        '支付转移记录创建成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        body: {
          from_payment_id: 101,
          to_payment_id: 102,
          amount: 100.00
        }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询失败
      pool.query.mockRejectedValueOnce(new Error('数据库连接失败'));
      
      await controller.createPaymentTransfer(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(500, '服务器内部错误');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('confirmPaymentTransfer', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user2' },
        params: { id: '1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] });
      pool.query.mockResolvedValueOnce({ rows: [] }); // 模拟没有重复记录
      pool.query.mockResolvedValueOnce({ rows: [{ ...mockTransferRecord, status: 'confirmed' }] }); // 模拟更新成功
      
      await controller.confirmPaymentTransfer(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '确认支付转移记录成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的权限错误响应', async () => {
      const mockReq = {
        user: { sub: 'user3' }, // 非目标用户
        params: { id: '1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] });
      
      await controller.confirmPaymentTransfer(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(403, '没有权限确认此转移记录');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });

  describe('cancelPaymentTransfer', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: { id: '1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] });
      pool.query.mockResolvedValueOnce({ rows: [{ ...mockTransferRecord, status: 'cancelled' }] }); // 模拟更新成功
      
      await controller.cancelPaymentTransfer(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '取消支付转移记录成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentTransferById', () => {
    it('应该返回新响应格式的成功响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: { id: '1' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询成功
      pool.query.mockResolvedValueOnce({ rows: [mockTransferRecord] });
      
      await controller.getPaymentTransferById(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.success).toHaveBeenCalledWith(
        200, 
        '获取支付转移记录详情成功', 
        expect.any(Object)
      );
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    it('应该返回新响应格式的记录不存在错误响应', async () => {
      const mockReq = {
        user: { sub: 'user1' },
        params: { id: '999' }
      };
      
      const mockRes = {
        success: jest.fn(),
        error: jest.fn()
      };
      
      // 模拟数据库查询返回空结果
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      await controller.getPaymentTransferById(mockReq, mockRes);
      
      // 验证新响应格式被调用
      expect(mockRes.error).toHaveBeenCalledWith(404, '支付转移记录不存在');
      expect(mockRes.success).not.toHaveBeenCalled();
    });
  });
});