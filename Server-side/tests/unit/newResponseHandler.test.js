/**
 * 新响应格式中间件单元测试
 */

const { newResponseMiddleware } = require('../../middleware/newResponseHandler');

describe('新响应格式中间件测试', () => {
  let mockReq;
  let mockRes;
  let nextFunction;
  
  beforeEach(() => {
    // 创建模拟请求对象
    mockReq = {
      url: '/api/test',
      method: 'GET'
    };
    
    // 创建模拟响应对象
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    
    // 创建模拟next函数
    nextFunction = jest.fn();
    
    // 模拟logger
    jest.mock('../../config/logger', () => ({
      logger: {
        debug: jest.fn(),
        error: jest.fn()
      }
    }));
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('newResponseMiddleware', () => {
    it('应该为响应对象添加success方法', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 验证next被调用
      expect(nextFunction).toHaveBeenCalled();
      
      // 验证res.success方法存在
      expect(typeof mockRes.success).toBe('function');
    });
    
    it('应该为响应对象添加error方法', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 验证res.error方法存在
      expect(typeof mockRes.error).toBe('function');
    });
    
    it('应该为响应对象添加payload方法', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 验证res.payload方法存在
      expect(typeof mockRes.payload).toBe('function');
    });
    
    it('应该为响应对象添加paginate方法', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 验证res.paginate方法存在
      expect(typeof mockRes.paginate).toBe('function');
    });
    
    it('res.success应该正确格式化响应', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 调用success方法
      const testData = { id: 1, name: '测试数据' };
      mockRes.success(200, '操作成功', testData);
      
      // 验证响应格式
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '操作成功',
        data: testData
      });
    });
    
    it('res.success应该处理无数据的情况', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 调用success方法，不传数据
      mockRes.success(200, '操作成功');
      
      // 验证响应格式
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '操作成功'
      });
    });
    
    it('res.error应该正确格式化错误响应', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 调用error方法
      mockRes.error(400, '操作失败', { detail: '错误详情' });
      
      // 验证响应格式
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '操作失败',
        error: { detail: '错误详情' }
      });
    });
    
    it('res.payload应该正确格式化载荷响应', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 调用payload方法
      const testData = { id: 1, name: '测试数据' };
      mockRes.payload(testData, 200);
      
      // 验证响应格式
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData
      });
    });
    
    it('res.paginate应该正确格式化分页响应', () => {
      // 调用中间件
      newResponseMiddleware(mockReq, mockRes, nextFunction);
      
      // 调用paginate方法
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        total: 10,
        page: 1,
        pageSize: 2,
        totalPages: 5
      };
      mockRes.paginate(items, pagination, '获取数据成功', 200);
      
      // 验证响应格式
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '获取数据成功',
        data: {
          items: items,
          pagination: pagination
        }
      });
      
      // 验证分页头部设置
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Total-Count', 10);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Current-Page', 1);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Page-Size', 2);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Total-Pages', 5);
    });
  });
});