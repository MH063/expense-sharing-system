/**
 * 数据库表结构创建工具
 * 
 * 功能：
 * 1. 数据库连接配置与验证
 * 2. SQL文件处理与验证
 * 3. 执行过程与日志管理
 * 4. 错误处理与异常管理
 * 5. 执行结果确认与报告
 */

const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');
const winston = require('winston');

/**
 * 数据库表结构创建器类
 */
class DatabaseSchemaCreator {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {Object} options.dbConfig 数据库配置
   * @param {string} options.logLevel 日志级别
   * @param {string} options.logFile 日志文件路径
   * @param {number} options.connectionTimeout 连接超时时间（毫秒）
   * @param {number} options.maxRetries 最大重试次数
   */
  constructor(options = {}) {
    // 数据库配置
    this.dbConfig = options.dbConfig || this.getDefaultDbConfig();
    
    // 连接配置
    this.connectionTimeout = options.connectionTimeout || 10000; // 10秒
    this.maxRetries = options.maxRetries || 3;
    
    // 日志配置
    this.logLevel = options.logLevel || 'info';
    this.logFile = options.logFile || path.join(process.cwd(), 'database-schema-creator.log');
    
    // 初始化日志记录器
    this.initLogger();
    
    // 执行统计
    this.stats = {
      startTime: null,
      endTime: null,
      tablesCreated: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * 获取默认数据库配置
   * @returns {Object} 默认数据库配置
   */
  getDefaultDbConfig() {
    // 尝试从环境变量加载配置
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123456789',
      database: process.env.DB_NAME || 'expense_dev',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.connectionTimeout
    };
  }

  /**
   * 初始化日志记录器
   */
  initLogger() {
    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 创建Winston日志记录器
    this.logger = winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'database-schema-creator' },
      transports: [
        // 写入文件
        new winston.transports.File({ 
          filename: this.logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
          )
        }),
        // 输出到控制台
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
          )
        })
      ]
    });
    
    this.logger.info('日志记录器初始化完成', { logLevel: this.logLevel, logFile: this.logFile });
  }

  /**
   * 测试数据库连接
   * @param {number} retryCount 当前重试次数
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection(retryCount = 0) {
    this.logger.info('测试数据库连接...', { 
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      database: this.dbConfig.database,
      user: this.dbConfig.user,
      retryCount
    });
    
    const client = new Client(this.dbConfig);
    
    try {
      // 设置连接超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时')), this.connectionTimeout);
      });
      
      // 尝试连接
      const connectPromise = client.connect();
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // 验证权限
      await this.verifyPermissions(client);
      
      this.logger.info('数据库连接成功');
      return true;
    } catch (error) {
      this.logger.error('数据库连接失败', { 
        error: error.message,
        retryCount,
        maxRetries: this.maxRetries
      });
      
      // 如果未达到最大重试次数，则重试
      if (retryCount < this.maxRetries) {
        this.logger.info(`将在 ${2 ** retryCount} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 2 ** retryCount * 1000));
        return this.testConnection(retryCount + 1);
      }
      
      return false;
    } finally {
      try {
        await client.end();
      } catch (e) {
        this.logger.warn('关闭数据库连接时出错', { error: e.message });
      }
    }
  }

  /**
   * 验证数据库用户权限
   * @param {Client} client 数据库客户端
   */
  async verifyPermissions(client) {
    this.logger.info('验证数据库用户权限...');
    
    try {
      // 检查创建表权限
      const createTableResult = await client.query(`
        SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create
      `);
      
      if (!createTableResult.rows[0].can_create) {
        throw new Error('用户没有创建表的权限');
      }
      
      // 检查基本连接权限（通过查询系统表）
      try {
        await client.query(`SELECT 1`);
      } catch (error) {
        throw new Error('用户没有基本查询权限');
      }
      
      this.logger.info('权限验证通过');
    } catch (error) {
      this.logger.error('权限验证失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 执行SQL文件创建数据库表结构
   * @param {string} sqlFilePath SQL文件路径
   * @returns {Promise<Object>} 执行结果
   */
  async executeSchemaCreation(sqlFilePath) {
    this.stats.startTime = new Date();
    this.logger.info('开始执行数据库表结构创建', { sqlFilePath });
    
    try {
      // 1. 验证SQL文件
      const sqlContent = await this.validateSqlFile(sqlFilePath);
      
      // 2. 测试数据库连接
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('无法连接到数据库');
      }
      
      // 3. 执行SQL文件
      const result = await this.executeSqlFile(sqlContent);
      
      // 4. 验证表结构
      const verificationResult = await this.verifySchema();
      
      this.stats.endTime = new Date();
      
      // 5. 生成执行报告
      const report = this.generateReport(verificationResult);
      
      this.logger.info('数据库表结构创建完成', report);
      return report;
    } catch (error) {
      this.stats.endTime = new Date();
      this.stats.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      
      this.logger.error('数据库表结构创建失败', { 
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * 验证SQL文件
   * @param {string} sqlFilePath SQL文件路径
   * @returns {Promise<string>} SQL文件内容
   */
  async validateSqlFile(sqlFilePath) {
    this.logger.info('验证SQL文件', { sqlFilePath });
    
    // 解析文件路径
    const absolutePath = path.resolve(sqlFilePath);
    
    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`SQL文件不存在: ${absolutePath}`);
    }
    
    // 检查文件是否可读
    try {
      fs.accessSync(absolutePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`SQL文件不可读: ${absolutePath}`);
    }
    
    // 读取文件内容
    let sqlContent;
    try {
      sqlContent = fs.readFileSync(absolutePath, 'utf8');
    } catch (error) {
      throw new Error(`读取SQL文件失败: ${error.message}`);
    }
    
    // 检查文件内容是否为空
    if (!sqlContent.trim()) {
      throw new Error('SQL文件内容为空');
    }
    
    // 执行基本的SQL语法预检查
    await this.performBasicSqlValidation(sqlContent);
    
    this.logger.info('SQL文件验证通过', { 
      filePath: absolutePath,
      size: sqlContent.length
    });
    
    return sqlContent;
  }

  /**
   * 执行基本的SQL语法预检查
   * @param {string} sqlContent SQL内容
   */
  async performBasicSqlValidation(sqlContent) {
    this.logger.info('执行SQL语法预检查...');
    
    // 检查是否包含危险操作
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i,
      /TRUNCATE\s+(?!.*\bIF\s+EXISTS\b)/i,
      /DELETE\s+FROM\s+(?!.*\bWHERE\b)/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sqlContent)) {
        this.logger.warn('检测到潜在危险操作', { pattern: pattern.source });
        this.stats.warnings.push({
          message: `检测到潜在危险操作: ${pattern.source}`,
          timestamp: new Date()
        });
      }
    }
    
    // 检查基本语法结构
    const statements = this.splitSqlStatements(sqlContent);
    let hasCreateTable = false;
    
    for (const statement of statements) {
      if (statement.trim().toUpperCase().startsWith('CREATE TABLE')) {
        hasCreateTable = true;
      }
    }
    
    if (!hasCreateTable) {
      throw new Error('SQL文件中未找到CREATE TABLE语句');
    }
    
    this.logger.info('SQL语法预检查完成', { 
      statementsCount: statements.length,
      hasCreateTable
    });
  }

  /**
   * 分割SQL语句
   * @param {string} sqlContent SQL内容
   * @returns {Array<string>} SQL语句数组
   */
  splitSqlStatements(sqlContent) {
    // 预处理：移除psql特有的命令（如\set ON_ERROR_STOP on）
    let processedContent = sqlContent.replace(/^\\[a-zA-Z_]+.*$/gm, '');
    
    // 分割SQL语句，处理DO块的特殊情况
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let inString = false;
    let stringDelimiter = '';
    
    const lines = processedContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue;
      }
      
      // 检测DO块开始
      if (trimmedLine.startsWith('DO $$') && !inDoBlock) {
        inDoBlock = true;
        currentStatement = line + '\n';
        continue;
      }
      
      // 检测DO块结束
      if (inDoBlock && trimmedLine.endsWith('$$;')) {
        currentStatement += line;
        statements.push(currentStatement);
        currentStatement = '';
        inDoBlock = false;
        continue;
      }
      
      // 在DO块内
      if (inDoBlock) {
        currentStatement += line + '\n';
        continue;
      }
      
      // 处理普通SQL语句
      currentStatement += line + '\n';
      
      // 检查是否在字符串中
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (!inString && (char === "'" || char === '"')) {
          inString = true;
          stringDelimiter = char;
        } else if (inString && char === stringDelimiter && line[i-1] !== '\\') {
          inString = false;
          stringDelimiter = '';
        }
      }
      
      // 如果不在字符串中且行以分号结尾，则语句结束
      if (!inString && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // 添加最后一个语句（如果有）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    return statements.filter(stmt => stmt.length > 0);
  }

  /**
   * 执行SQL文件
   * @param {string} sqlContent SQL内容
   * @returns {Promise<Object>} 执行结果
   */
  async executeSqlFile(sqlContent) {
    this.logger.info('开始执行SQL文件');
    
    const pool = new Pool(this.dbConfig);
    let client;
    
    try {
      client = await pool.connect();
      this.logger.info('已获取数据库连接');
      
      // 开始事务
      await client.query('BEGIN');
      this.logger.info('事务已开始');
      
      // 分割SQL语句
      const statements = this.splitSqlStatements(sqlContent);
      this.logger.info('准备执行SQL语句', { count: statements.length });
      
      let executedCount = 0;
      let tablesCreated = 0;
      
      // 逐条执行SQL语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (!statement.trim()) continue;
        
        try {
          this.logger.debug(`执行SQL语句 ${i + 1}/${statements.length}`, { 
            statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
          
          await client.query(statement);
          executedCount++;
          
          // 检查是否是创建表的语句
          if (statement.trim().toUpperCase().startsWith('CREATE TABLE')) {
            tablesCreated++;
            this.logger.debug('检测到表创建语句', { 
              statement: statement.substring(0, 50) + '...'
            });
          }
          
          this.logger.debug(`SQL语句执行成功 ${i + 1}/${statements.length}`);
        } catch (error) {
          this.logger.error(`SQL语句执行失败 ${i + 1}/${statements.length}`, { 
            error: error.message,
            statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
          
          // 检查是否是"已存在"错误，如果是则忽略
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('关系') && error.message.includes('已存在')) {
            this.logger.warn('忽略已存在错误', { error: error.message });
            this.stats.warnings.push({
              message: `忽略已存在错误: ${error.message}`,
              timestamp: new Date()
            });
            executedCount++;
          } else {
            // 其他错误，回滚事务
            await client.query('ROLLBACK');
            throw new Error(`SQL语句执行失败: ${error.message}`);
          }
        }
      }
      
      // 提交事务
      await client.query('COMMIT');
      this.logger.info('事务已提交');
      
      this.stats.tablesCreated = tablesCreated;
      
      return {
        statementsCount: statements.length,
        executedCount,
        tablesCreated
      };
    } catch (error) {
      this.logger.error('执行SQL文件失败', { error: error.message });
      
      // 尝试回滚事务
      if (client) {
        try {
          await client.query('ROLLBACK');
          this.logger.info('事务已回滚');
        } catch (rollbackError) {
          this.logger.error('回滚事务失败', { error: rollbackError.message });
        }
      }
      
      throw error;
    } finally {
      if (client) {
        client.release();
        this.logger.info('数据库连接已释放');
      }
      
      await pool.end();
      this.logger.info('数据库连接池已关闭');
    }
  }

  /**
   * 验证数据库表结构
   * @returns {Promise<Object>} 验证结果
   */
  async verifySchema() {
    this.logger.info('开始验证数据库表结构');
    
    const pool = new Pool(this.dbConfig);
    let client;
    
    try {
      client = await pool.connect();
      
      // 查询所有表
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const tables = result.rows.map(row => row.table_name);
      
      this.logger.info('表结构验证完成', { 
        tablesCount: tables.length,
        tables: tables.slice(0, 10) + (tables.length > 10 ? '...' : '')
      });
      
      return {
        tablesCount: tables.length,
        tables
      };
    } catch (error) {
      this.logger.error('表结构验证失败', { error: error.message });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
      
      await pool.end();
    }
  }

  /**
   * 生成执行报告
   * @param {Object} verificationResult 表结构验证结果
   * @returns {Object} 执行报告
   */
  generateReport(verificationResult) {
    const duration = this.stats.endTime - this.stats.startTime;
    
    const report = {
      success: this.stats.errors.length === 0,
      duration: {
        milliseconds: duration,
        seconds: Math.round(duration / 1000 * 100) / 100,
        formatted: this.formatDuration(duration)
      },
      tablesCreated: this.stats.tablesCreated,
      tablesVerified: verificationResult.tablesCount,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      startTime: this.stats.startTime,
      endTime: this.stats.endTime
    };
    
    return report;
  }

  /**
   * 格式化持续时间
   * @param {number} milliseconds 毫秒数
   * @returns {string} 格式化的时间字符串
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

module.exports = DatabaseSchemaCreator;