/**
 * 安全的数据库连接管理器
 * 提供多环境数据库连接和密码安全管理
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

class DatabaseConnectionManager {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.loadEnvironmentVariables();
    this.validateEnvironment();
  }

  /**
   * 安全加载环境变量
   */
  loadEnvironmentVariables() {
    // 按优先级加载环境变量文件
    const envFiles = [
      path.resolve(__dirname, '../.env'),           // 本地环境变量（包含真实密码）
      path.resolve(__dirname, `../.env.${this.env}`), // 环境特定配置
      path.resolve(__dirname, '../.env.development')   // 开发环境默认配置
    ];

    envFiles.forEach(envPath => {
      if (fs.existsSync(envPath)) {
        console.log(`📁 加载环境变量文件: ${envPath}`);
        require('dotenv').config({ path: envPath });
      }
    });

    // 确保关键环境变量已设置
    this.ensureRequiredVariables();
  }

  /**
   * 验证环境配置
   */
  validateEnvironment() {
    const requiredVars = ['DB_PASSWORD'];
    
    if (this.env !== 'test') {
      requiredVars.forEach(varName => {
        if (!process.env[varName]) {
          console.warn(`⚠️  警告: 环境变量 ${varName} 未设置`);
        }
      });
    }

    // 检查密码安全性
    this.checkPasswordSecurity();
  }

  /**
   * 检查密码安全性
   */
  checkPasswordSecurity() {
    const password = process.env.DB_PASSWORD;
    
    if (password) {
      // 检查是否为默认密码
      const weakPasswords = ['123456789', 'password', 'postgres', 'admin'];
      if (weakPasswords.includes(password)) {
        console.warn('⚠️  警告: 检测到弱密码，建议使用强密码');
      }
      
      // 检查密码长度
      if (password.length < 8) {
        console.warn('⚠️  警告: 密码长度不足8位，建议使用更长的密码');
      }
    }
  }

  /**
   * 确保必需的环境变量存在
   */
  ensureRequiredVariables() {
    // 为测试环境提供默认值
    if (this.env === 'test' && !process.env.DB_PASSWORD) {
      process.env.DB_PASSWORD = 'test_password';
    }
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    const baseConfig = {
      dialect: process.env.DB_DIALECT || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || this.getDefaultDatabaseName(),
      username: process.env.DB_USER || this.getDefaultUsername(),
      password: process.env.DB_PASSWORD,
      logging: this.getLoggingLevel(),
      pool: this.getPoolConfig(),
      define: {
        freezeTableName: true,
        timestamps: true,
        underscored: true
      },
      dialectOptions: this.getDialectOptions()
    };

    return baseConfig;
  }

  /**
   * 获取默认数据库名称
   */
  getDefaultDatabaseName() {
    const names = {
      development: 'expense_dev',
      test: 'expense_test',
      production: 'expense_prod'
    };
    return names[this.env] || 'expense_dev';
  }

  /**
   * 获取默认用户名
   */
  getDefaultUsername() {
    const users = {
      development: 'postgres',
      test: 'test_user',
      production: 'production_user'
    };
    return users[this.env] || 'postgres';
  }

  /**
   * 获取日志级别
   */
  getLoggingLevel() {
    const levels = {
      development: console.log,
      test: false,
      production: false
    };
    return levels[this.env] || false;
  }

  /**
   * 获取连接池配置
   */
  getPoolConfig() {
    const poolConfigs = {
      development: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      test: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      production: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    };
    return poolConfigs[this.env] || poolConfigs.development;
  }

  /**
   * 获取方言选项
   */
  getDialectOptions() {
    const options = {};
    
    // SSL配置
    if (process.env.DB_SSL === 'true') {
      options.ssl = {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      };
    }

    return options;
  }

  /**
   * 创建数据库连接
   */
  createConnection() {
    const config = this.getDatabaseConfig();
    
    // 安全日志（不记录密码）
    console.log(`🔗 创建数据库连接 - 环境: ${this.env}`);
    console.log(`   📊 数据库: ${config.database}`);
    console.log(`   🏠 主机: ${config.host}:${config.port}`);
    console.log(`   👤 用户: ${config.username}`);
    console.log(`   🔑 密码: ${config.password ? '已设置' : '未设置'}`);

    try {
      const sequelize = new Sequelize(config);
      return sequelize;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(sequelize) {
    try {
      await sequelize.authenticate();
      console.log('✅ 数据库连接测试成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接测试失败:', error.message);
      return false;
    }
  }
}

// 导出单例实例
const dbManager = new DatabaseConnectionManager();
module.exports = {
  DatabaseConnectionManager,
  getDatabaseConfig: () => dbManager.getDatabaseConfig(),
  createConnection: () => dbManager.createConnection(),
  testConnection: (sequelize) => dbManager.testConnection(sequelize)
};