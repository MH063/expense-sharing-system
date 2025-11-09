const { expect } = require('chai');
const sinon = require('sinon');
const { recordFailure, recordSuccess, isBlocked } = require('../middleware/bruteForceRedis');
const cacheService = require('../services/cache-service');
const redisConfig = require('../config/redis');
const { logger } = require('../config/logger');

describe('暴力破解防护功能测试', function() {
  let redisClientStub;
  let loggerStub;
  
  beforeEach(function() {
    // 创建Redis客户端桩
    const pipelineStub = {
      incr: sinon.stub().returnsThis(),
      expire: sinon.stub().returnsThis(),
      setex: sinon.stub().returnsThis(),
      del: sinon.stub().returnsThis(),
      exec: sinon.stub().resolves()
    };
    
    redisClientStub = {
      multi: sinon.stub().returns(pipelineStub),
      get: sinon.stub(),
      exists: sinon.stub()
    };
    
    // 创建logger桩
    loggerStub = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    // 替换依赖
    sinon.stub(redisConfig, 'getRedisClient').returns(redisClientStub);
    sinon.stub(require('../config/logger'), 'logger').value(loggerStub);
  });
  
  afterEach(function() {
    // 恢复所有桩
    sinon.restore();
  });
  
  describe('recordFailure', function() {
    let pipelineStub;
    
    beforeEach(function() {
      pipelineStub = {
        incr: sinon.stub().returnsThis(),
        expire: sinon.stub().returnsThis(),
        setex: sinon.stub().returnsThis(),
        del: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves()
      };
      redisClientStub.multi.returns(pipelineStub);
      redisClientStub.get.resolves(null); // 默认返回null
    });
    
    it('应该正确记录IP失败尝试', async function() {
      redisClientStub.get.withArgs('brute_force:ip:192.168.1.1').resolves('1');
      
      await recordFailure('192.168.1.1');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(pipelineStub.incr.calledOnce).to.be.true;
      expect(pipelineStub.incr.firstCall.args[0]).to.equal('brute_force:ip:192.168.1.1');
      expect(pipelineStub.expire.calledOnce).to.be.true;
      expect(pipelineStub.exec.calledOnce).to.be.true;
    });
    
    it('应该在超过IP限制时封禁IP', async function() {
      redisClientStub.get.withArgs('brute_force:ip:192.168.1.1').resolves('51'); // 超过默认限制50（测试环境）
      
      await recordFailure('192.168.1.1');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(pipelineStub.incr.calledOnce).to.be.true;
      expect(pipelineStub.expire.calledOnce).to.be.true; // IP键
      expect(pipelineStub.setex.calledOnce).to.be.true;
      expect(pipelineStub.setex.firstCall.args[0]).to.equal('brute_force:blocked:ip:192.168.1.1');
      expect(pipelineStub.exec.calledOnce).to.be.true;
    });
    
    it('应该正确记录用户名失败尝试', async function() {
      redisClientStub.get.withArgs('brute_force:ip:192.168.1.1').resolves('1');
      redisClientStub.get.withArgs('brute_force:user:testuser').resolves('1');
      
      await recordFailure('192.168.1.1', 'testuser');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(pipelineStub.incr.calledTwice).to.be.true; // IP和用户
      expect(pipelineStub.incr.firstCall.args[0]).to.equal('brute_force:ip:192.168.1.1');
      expect(pipelineStub.incr.secondCall.args[0]).to.equal('brute_force:user:testuser');
      expect(pipelineStub.expire.calledTwice).to.be.true;
      expect(pipelineStub.exec.calledOnce).to.be.true;
    });
    
    it('应该在超过用户名限制时封禁用户', async function() {
      redisClientStub.get.withArgs('brute_force:ip:192.168.1.1').resolves('1');
      redisClientStub.get.withArgs('brute_force:user:testuser').resolves('51'); // 超过默认限制50（测试环境）
      
      await recordFailure('192.168.1.1', 'testuser');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(pipelineStub.incr.calledTwice).to.be.true;
      expect(pipelineStub.expire.callCount).to.equal(2); // IP键和用户键
      expect(pipelineStub.setex.calledOnce).to.be.true;
      expect(pipelineStub.setex.firstCall.args[0]).to.equal('brute_force:blocked:user:testuser');
      expect(pipelineStub.exec.calledOnce).to.be.true;
    });
  });
  
  describe('recordSuccess', function() {
    let pipelineStub;
    
    beforeEach(function() {
      pipelineStub = {
        del: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves()
      };
      redisClientStub.multi.returns(pipelineStub);
    });
    
    it('应该清除用户的失败记录', async function() {
      await recordSuccess('testuser');
      
      expect(redisClientStub.multi.calledOnce).to.be.true;
      expect(pipelineStub.del.calledTwice).to.be.true; // 用户记录和封禁记录
      expect(pipelineStub.del.firstCall.args[0]).to.equal('brute_force:user:testuser');
      expect(pipelineStub.del.secondCall.args[0]).to.equal('brute_force:blocked:user:testuser');
      expect(pipelineStub.exec.calledOnce).to.be.true;
    });
    
    it('应该在用户名为空时不做任何操作', async function() {
      await recordSuccess();
      
      expect(redisClientStub.multi.called).to.be.false;
    });
  });
  
  describe('isBlocked', function() {
    beforeEach(function() {
      redisClientStub.exists.resolves(0);
    });
    
    it('应该检测到被封禁的IP', async function() {
      redisClientStub.exists.withArgs('brute_force:blocked:ip:192.168.1.1').resolves(1);
      
      const result = await isBlocked('192.168.1.1');
      
      expect(result.blocked).to.be.true;
      expect(result.reason).to.equal('IP');
    });
    
    it('应该检测到被封禁的用户', async function() {
      redisClientStub.exists.withArgs('brute_force:blocked:user:testuser').resolves(1);
      
      const result = await isBlocked('192.168.1.1', 'testuser');
      
      expect(result.blocked).to.be.true;
      expect(result.reason).to.equal('USER');
    });
    
    it('应该允许正常的请求通过', async function() {
      const result = await isBlocked('192.168.1.1', 'testuser');
      
      expect(result.blocked).to.be.false;
    });
    
    it('应该允许白名单IP通过', async function() {
      // 模拟白名单IP 127.0.0.1
      const result = await isBlocked('127.0.0.1');
      
      expect(result.blocked).to.be.false;
    });
    
    it('应该允许白名单用户通过', async function() {
      // 修改配置使用户成为白名单用户
      const config = require('../config/brute-force-config');
      const originalWhitelist = config.getBruteForceConfig().whitelist;
      
      // 临时修改白名单配置
      originalWhitelist.users.push('admin');
      
      // 模拟白名单用户 'admin'
      const result = await isBlocked('192.168.1.1', 'admin');
      
      expect(result.blocked).to.be.false;
      
      // 恢复原始配置
      originalWhitelist.users.pop();
    });
  });
});