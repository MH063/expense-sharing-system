/**
 * 暴力破解防护集成测试
 * 测试完整的防护流程包括记录、封禁和白名单功能
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../../server');
const { getRedisClient } = require('../../services/cache-service');
const { 
  recordFailure, 
  recordSuccess, 
  isBlocked,
  isIpWhitelisted,
  isUserWhitelisted
} = require('../../middleware/bruteForceRedis');

describe('暴力破解防护集成测试', function() {
  let redisClientStub;
  let server;
  
  before(function() {
    // 启动服务器
    server = app.listen(0);
  });
  
  after(function() {
    // 关闭服务器
    server.close();
  });
  
  beforeEach(function() {
    // 创建Redis客户端桩
    redisClientStub = {
      multi: sinon.stub().returnsThis(),
      incr: sinon.stub().returnsThis(),
      expire: sinon.stub().returnsThis(),
      get: sinon.stub(),
      exec: sinon.stub().resolves(),
      exists: sinon.stub(),
      del: sinon.stub().returnsThis(),
      setex: sinon.stub().returnsThis()
    };
    
    // 替换依赖
    sinon.stub(require('../../services/cache-service'), 'getRedisClient').returns(redisClientStub);
  });
  
  afterEach(function() {
    // 恢复所有桩
    sinon.restore();
  });
  
  describe('白名单功能', function() {
    it('应该允许白名单IP通过', function() {
      const result = isIpWhitelisted('127.0.0.1');
      expect(result).to.be.true;
    });
    
    it('应该拒绝非白名单IP', function() {
      const result = isIpWhitelisted('192.168.1.100');
      expect(result).to.be.false;
    });
  });
  
  describe('记录功能', function() {
    it('应该正确记录失败尝试', async function() {
      redisClientStub.get.resolves('1');
      
      await recordFailure('192.168.1.1', 'testuser');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(redisClientStub.incr.calledTwice).to.be.true;
      expect(redisClientStub.expire.calledTwice).to.be.true;
    });
    
    it('应该正确记录成功登录', async function() {
      await recordSuccess('testuser');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(redisClientStub.del.calledTwice).to.be.true;
    });
  });
  
  describe('封禁功能', function() {
    it('应该检测到被封禁的IP', async function() {
      redisClientStub.exists.resolves(1);
      
      const result = await isBlocked('192.168.1.1', 'testuser');
      
      expect(result.blocked).to.be.true;
      expect(result.reason).to.equal('IP');
    });
    
    it('应该检测到被封禁的用户', async function() {
      redisClientStub.exists.onFirstCall().resolves(0);
      redisClientStub.exists.onSecondCall().resolves(1);
      
      const result = await isBlocked('192.168.1.1', 'testuser');
      
      expect(result.blocked).to.be.true;
      expect(result.reason).to.equal('USER');
    });
    
    it('应该允许未被封禁的请求通过', async function() {
      redisClientStub.exists.resolves(0);
      
      const result = await isBlocked('192.168.1.1', 'testuser');
      
      expect(result.blocked).to.be.false;
    });
  });
  
  describe('中间件集成', function() {
    it('应该阻止被封禁的IP访问登录接口', async function() {
      redisClientStub.exists.resolves(1);
      
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      expect(response.status).to.equal(429);
      expect(response.text).to.include('尝试次数过多');
    });
    
    it('应该允许合法请求通过', async function() {
      redisClientStub.exists.resolves(0);
      
      // 注意：这会实际调用登录逻辑，但我们只是测试中间件是否放行
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });
      
      // 应该返回认证错误而不是防护错误
      expect(response.status).to.not.equal(429);
    });
  });
});