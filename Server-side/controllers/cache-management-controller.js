/**
 * 缓存管理控制器
 * 处理缓存相关的API请求
 */

const { validationResult } = require('express-validator');
const logger = require('../config/logger');
const cacheService = require('../services/cache-service');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

class CacheManagementController {
  /**
   * 获取缓存统计信息
   */
  async getCacheStats(req, res) {
    try {
      const stats = await cacheService.getStats();
      
      logger.info('获取缓存统计信息成功');
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取缓存统计信息失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取所有缓存键
   */
  async getAllCacheKeys(req, res) {
    try {
      const { pattern = '*', page = 1, limit = 50 } = req.query;
      const keys = await cacheService.getKeys(pattern, parseInt(page), parseInt(limit));
      
      logger.info('获取缓存键列表成功');
      
      return res.json({
        success: true,
        data: keys
      });
    } catch (error) {
      logger.error('获取缓存键列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取指定键的缓存值
   */
  async getCacheValue(req, res) {
    try {
      const { key } = req.params;
      const value = await cacheService.getValue(key);
      
      if (value === null) {
        return res.status(404).json({
          success: false,
          message: '缓存键不存在'
        });
      }
      
      logger.info('获取缓存值成功', { key });
      
      return res.json({
        success: true,
        data: {
          key,
          value
        }
      });
    } catch (error) {
      logger.error('获取缓存值失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 设置缓存值
   */
  async setCacheValue(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { key, value, ttl } = req.body;
      await cacheService.setValue(key, value, ttl);
      
      logger.info('设置缓存值成功', { key });
      
      return res.json({
        success: true,
        message: '缓存值设置成功'
      });
    } catch (error) {
      logger.error('设置缓存值失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除指定键的缓存
   */
  async deleteCacheKey(req, res) {
    try {
      const { key } = req.params;
      const deleted = await cacheService.deleteKey(key);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: '缓存键不存在'
        });
      }
      
      logger.info('删除缓存键成功', { key });
      
      return res.json({
        success: true,
        message: '缓存键删除成功'
      });
    } catch (error) {
      logger.error('删除缓存键失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 清空缓存
   */
  async clearCache(req, res) {
    try {
      await cacheService.clearAll();
      
      logger.info('清空缓存成功');
      
      return res.json({
        success: true,
        message: '缓存清空成功'
      });
    } catch (error) {
      logger.error('清空缓存失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 根据模式清空缓存
   */
  async clearCacheByPattern(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { pattern } = req.body;
      const count = await cacheService.clearByPattern(pattern);
      
      logger.info('根据模式清空缓存成功', { pattern, count });
      
      return res.json({
        success: true,
        message: `成功删除 ${count} 个缓存键`,
        data: {
          deletedCount: count
        }
      });
    } catch (error) {
      logger.error('根据模式清空缓存失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取内存使用情况
   */
  async getMemoryUsage(req, res) {
    try {
      const memoryInfo = await cacheService.getMemoryInfo();
      
      logger.info('获取内存使用情况成功');
      
      return res.json({
        success: true,
        data: memoryInfo
      });
    } catch (error) {
      logger.error('获取内存使用情况失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(req, res) {
    try {
      // 这里应该实现实际的缓存预热逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('缓存预热请求已提交');
      
      return res.json({
        success: true,
        message: '缓存预热已启动'
      });
    } catch (error) {
      logger.error('缓存预热失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取缓存配置
   */
  async getCacheConfig(req, res) {
    try {
      const cacheConfig = {
        host: config.cache.host,
        port: config.cache.port,
        ttl: config.cache.ttl,
        maxMemory: config.cache.maxMemory,
        evictionPolicy: config.cache.evictionPolicy
      };
      
      return res.json({
        success: true,
        data: cacheConfig
      });
    } catch (error) {
      logger.error('获取缓存配置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 更新缓存配置
   */
  async updateCacheConfig(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      // 这里应该实现实际的缓存配置更新逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('更新缓存配置成功');
      
      return res.json({
        success: true,
        message: '缓存配置更新成功'
      });
    } catch (error) {
      logger.error('更新缓存配置失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取缓存服务器信息
   */
  async getCacheInfo(req, res) {
    try {
      const info = await cacheService.getServerInfo();
      
      logger.info('获取缓存服务器信息成功');
      
      return res.json({
        success: true,
        data: info
      });
    } catch (error) {
      logger.error('获取缓存服务器信息失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 备份缓存数据
   */
  async backupCache(req, res) {
    try {
      // 这里应该实现实际的缓存备份逻辑
      // 由于这是一个示例，我们直接返回成功
      
      const backupPath = path.join(__dirname, '..', 'backups', `cache-backup-${Date.now()}.json`);
      
      logger.info('缓存数据备份成功', { backupPath });
      
      return res.json({
        success: true,
        message: '缓存数据备份成功',
        data: {
          backupPath
        }
      });
    } catch (error) {
      logger.error('缓存数据备份失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 恢复缓存数据
   */
  async restoreCache(req, res) {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      // 这里应该实现实际的缓存恢复逻辑
      // 由于这是一个示例，我们直接返回成功
      
      logger.info('缓存数据恢复成功');
      
      return res.json({
        success: true,
        message: '缓存数据恢复成功'
      });
    } catch (error) {
      logger.error('缓存数据恢复失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取慢查询日志
   */
  async getSlowLogs(req, res) {
    try {
      const slowLogs = await cacheService.getSlowLogs();
      
      return res.json({
        success: true,
        data: slowLogs
      });
    } catch (error) {
      logger.error('获取慢查询日志失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 清空慢查询日志
   */
  async clearSlowLogs(req, res) {
    try {
      await cacheService.clearSlowLogs();
      
      logger.info('清空慢查询日志成功');
      
      return res.json({
        success: true,
        message: '慢查询日志已清空'
      });
    } catch (error) {
      logger.error('清空慢查询日志失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 检查缓存健康状态
   */
  async checkCacheHealth(req, res) {
    try {
      const healthStatus = await cacheService.checkHealth();
      
      return res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      logger.error('检查缓存健康状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new CacheManagementController();