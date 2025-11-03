/**
 * 测试数据库初始化（SQLite + 原生 SQL 脚本）
 * - 使用 config/db.js 的连接池
 * - 执行 scripts/init-test-database.sql 构建测试 Schema 与基础种子
 * - 在每个测试前使用 TRUNCATE CASCADE 清空全部业务表，保证确定性
 */

const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
// 强制使用共享连接池，避免 open handles
const { pool } = require('../../config/db');

let sequelize; // Sequelize 实例
let models = {}; // 导出给测试使用的模型集合
let poolEnded = false; // 幂等关闭标记

function setupSequelize() {
  if (sequelize) return;
  const { DB_DIALECT, DB_STORAGE } = process.env;
  
  if (DB_DIALECT === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: DB_STORAGE || './database.sqlite',
      logging: false
    });
  } else {
    const { PGDATABASE, PGUSER, PGPASSWORD, PGHOST, PGPORT } = process.env;
    sequelize = new Sequelize(PGDATABASE, PGUSER, String(PGPASSWORD || ''), {
      host: PGHOST,
      port: PGPORT,
      dialect: 'postgres',
      logging: false,
      define: {
        underscored: true,
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    });
  }
  
  // 定义模型（与 init 中一致）
  const User = sequelize.define('users', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false }
  }, { tableName: 'users' });
  
  const Room = sequelize.define('rooms', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    code: { type: DataTypes.STRING },
    creator_id: { type: DataTypes.UUID, allowNull: false }
  }, { tableName: 'rooms' });
  
  Room.beforeCreate((room) => {
    if (room.dataValues.creatorId && !room.creator_id) {
      room.creator_id = room.dataValues.creatorId;
      delete room.dataValues.creatorId;
    }
  });
  
  const RoomMember = sequelize.define('user_room_relations', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    user_id: { type: DataTypes.UUID, allowNull: false },
    room_id: { type: DataTypes.UUID, allowNull: false },
    relation_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'member' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'user_room_relations' });
  
  RoomMember.beforeCreate((rm) => {
    if (rm.dataValues.role) {
      rm.relation_type = rm.dataValues.role === 'admin' ? 'owner' : 'member';
      delete rm.dataValues.role;
    }
    rm.dataValues.join_date = rm.dataValues.join_date || new Date();
  });
  
  const Bill = sequelize.define('bills', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    room_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    total_amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
    creator_id: { type: DataTypes.UUID, allowNull: false },
    due_date: { type: DataTypes.DATE }
  }, { tableName: 'bills' });
  
  Bill.beforeCreate((bill) => {
    if (bill.dataValues.amount && !bill.total_amount) {
      bill.total_amount = bill.dataValues.amount;
      delete bill.dataValues.amount;
    }
    if (bill.dataValues.createdBy && !bill.creator_id) {
      bill.creator_id = bill.dataValues.createdBy;
      delete bill.dataValues.createdBy;
    }
    if (bill.dataValues.status && bill.dataValues.status.toUpperCase) {
      bill.status = bill.dataValues.status.toUpperCase();
    }
  });
  
  const OfflinePayment = sequelize.define('offline_payments', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    bill_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT },
    payment_time: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    last_sync_attempt: { type: DataTypes.DATE },
    sync_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    synced_at: { type: DataTypes.DATE }
  }, { tableName: 'offline_payments' });
  
  const Payment = sequelize.define('payments', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
    bill_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    is_offline: { type: DataTypes.BOOLEAN, defaultValue: false },
    sync_status: { type: DataTypes.STRING },
    device_id: { type: DataTypes.STRING },
    transaction_id: { type: DataTypes.STRING },
    receipt: { type: DataTypes.TEXT },
    synced_at: { type: DataTypes.DATE }
  }, { tableName: 'payments' });
  
  Payment.beforeCreate((p) => {
    const map = {
      billId: 'bill_id', userId: 'user_id', paymentMethod: 'payment_method', isOffline: 'is_offline', syncStatus: 'sync_status', deviceId: 'device_id', transactionId: 'transaction_id'
    };
    Object.entries(map).forEach(([camel, snake]) => {
      if (p.dataValues[camel] !== undefined && p.dataValues[snake] === undefined) {
        p.dataValues[snake] = p.dataValues[camel];
        delete p.dataValues[camel];
      }
    });
  });
  
  OfflinePayment.belongsTo(Bill, { as: 'bill', foreignKey: 'bill_id' });
  OfflinePayment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
  Payment.belongsTo(Bill, { as: 'bill', foreignKey: 'bill_id' });
  Payment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });

  models.User = User;
  models.Room = Room;
  models.RoomMember = RoomMember;
  models.Bill = Bill;
  models.OfflinePayment = OfflinePayment;
  models.Payment = Payment;
  global.models = models;
}

// 模块加载即初始化 Sequelize（保证 models 可用）
setupSequelize();

async function runSqlFile(filePath) {
  const absolutePath = path.resolve(filePath);
  let sql = fs.readFileSync(absolutePath, 'utf8');
  
  // 移除PostgreSQL特定的语法
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, '');
  sql = sql.replace(/DEFAULT gen_random_uuid\(\)/g, "DEFAULT (lower(hex(randomblob(16))))");
  sql = sql.replace(/DO \$\$[\s\S]*?\$\$;/g, '');
  
  // 修改数据类型以适应SQLite
  sql = sql.replace(/UUID/g, 'TEXT');
  sql = sql.replace(/TIMESTAMP/g, 'DATETIME');
  sql = sql.replace(/BOOLEAN/g, 'INTEGER');
  sql = sql.replace(/NOW\(\)/g, "datetime('now')");
  
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (process.env.DB_DIALECT === 'sqlite') {
    // 使用sequelize执行SQLite语句
    for (const stmt of statements) {
      try {
        await sequelize.query(stmt);
      } catch (e) {
        console.error('执行失败的语句:\n', stmt, '\n错误:', e.message);
        // 忽略一些SQLite不支持的语句
        if (!e.message.includes('already exists') && !e.message.includes('duplicate column')) {
          throw e;
        }
      }
    }
  } else {
    // PostgreSQL逻辑
    const client = await pool.connect();
    try {
      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (e) {
          console.error('执行失败的语句:\n', stmt, '\n错误:', e.message);
          throw e;
        }
      }
    } catch (err) {
      console.error('执行 SQL 脚本失败:', absolutePath, err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * 初始化测试数据库：执行 init-test-database.sql（幂等），并初始化 Sequelize 模型
 */
async function initTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }
  
  // 连通性检查
  try {
    if (process.env.DB_DIALECT === 'sqlite') {
      await sequelize.authenticate();
      console.log('SQLite数据库连接成功');
    } else {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    }
  } catch (e) {
    console.error('测试数据库连接失败，请检查配置:', e.message);
    throw e;
  }

  const initSql = path.join(__dirname, '../../scripts/init-test-database.sql');
  await runSqlFile(initSql);
  console.log('测试数据库初始化脚本执行完成');

  // 初始化 Sequelize
  if (process.env.DB_DIALECT === 'sqlite') {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite',
      logging: false
    });
  } else {
    // 复用 PG* 环境变量
    sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      dialect: 'postgres',
      logging: false,
      define: {
        underscored: true,
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    });
  }

  // 定义模型（映射到既有表结构）
  const User = sequelize.define('users', {
    id: { type: DataTypes.STRING, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false }
  }, { tableName: 'users' });

  const Room = sequelize.define('rooms', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    code: { type: DataTypes.STRING },
    creator_id: { type: DataTypes.STRING, allowNull: false }
  }, { tableName: 'rooms' });
  
  // 兼容测试字段：creatorId -> creator_id
  Room.beforeCreate((room) => {
    if (room.dataValues.creatorId && !room.creator_id) {
      room.creator_id = room.dataValues.creatorId;
      delete room.dataValues.creatorId;
    }
  });

  const RoomMember = sequelize.define('user_room_relations', {
    id: { type: DataTypes.STRING, primaryKey: true },
    user_id: { type: DataTypes.STRING, allowNull: false },
    room_id: { type: DataTypes.STRING, allowNull: false },
    relation_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'member' },
    is_active: { type: DataTypes.INTEGER, defaultValue: 1 }
  }, { tableName: 'user_room_relations' });

  // 兼容测试的 role -> relation_type 映射
  RoomMember.beforeCreate((rm) => {
    if (rm.dataValues.role) {
      rm.relation_type = rm.dataValues.role === 'admin' ? 'owner' : 'member';
      delete rm.dataValues.role;
    }
    rm.dataValues.join_date = rm.dataValues.join_date || new Date();
  });

  const Bill = sequelize.define('bills', {
    id: { type: DataTypes.STRING, primaryKey: true },
    room_id: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    total_amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
    creator_id: { type: DataTypes.STRING, allowNull: false },
    due_date: { type: DataTypes.DATE }
  }, { tableName: 'bills' });

  // 兼容测试字段映射：amount/createdBy → total_amount/creator_id
  Bill.beforeCreate((bill) => {
    if (bill.dataValues.amount && !bill.total_amount) {
      bill.total_amount = bill.dataValues.amount;
      delete bill.dataValues.amount;
    }
    if (bill.dataValues.createdBy && !bill.creator_id) {
      bill.creator_id = bill.dataValues.createdBy;
      delete bill.dataValues.createdBy;
    }
    if (bill.dataValues.status && bill.dataValues.status.toUpperCase) {
      bill.status = bill.dataValues.status.toUpperCase();
    }
  });

  const OfflinePayment = sequelize.define('offline_payments', {
    id: { type: DataTypes.STRING, primaryKey: true },
    bill_id: { type: DataTypes.STRING, allowNull: false },
    user_id: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT },
    payment_time: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    last_sync_attempt: { type: DataTypes.DATE },
    sync_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    synced_at: { type: DataTypes.DATE }
  }, { tableName: 'offline_payments' });

  // payments 表模型（优化控制器测试使用）
  const Payment = sequelize.define('payments', {
    id: { type: DataTypes.STRING, primaryKey: true },
    bill_id: { type: DataTypes.STRING, allowNull: false },
    user_id: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    is_offline: { type: DataTypes.INTEGER, defaultValue: 0 },
    sync_status: { type: DataTypes.STRING },
    device_id: { type: DataTypes.STRING },
    transaction_id: { type: DataTypes.STRING },
    receipt: { type: DataTypes.TEXT },
    synced_at: { type: DataTypes.DATE }
  }, { tableName: 'payments' });

  // 字段名兼容：驼峰到下划线
  Payment.beforeCreate((p) => {
    const map = {
      billId: 'bill_id', userId: 'user_id', paymentMethod: 'payment_method', isOffline: 'is_offline', syncStatus: 'sync_status', deviceId: 'device_id', transactionId: 'transaction_id'
    };
    Object.entries(map).forEach(([camel, snake]) => {
      if (p.dataValues[camel] !== undefined && p.dataValues[snake] === undefined) {
        p.dataValues[snake] = p.dataValues[camel];
        delete p.dataValues[camel];
      }
    });
  });

  // 关联
  OfflinePayment.belongsTo(Bill, { as: 'bill', foreignKey: 'bill_id' });
  OfflinePayment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
  Payment.belongsTo(Bill, { as: 'bill', foreignKey: 'bill_id' });
  Payment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });

  // 暴露 models 给测试使用（保持同一对象引用，填充属性以便 require 缓存保持最新值）
  models.User = User;
  models.Room = Room;
  models.RoomMember = RoomMember;
  models.Bill = Bill;
  models.OfflinePayment = OfflinePayment;
  models.Payment = Payment;
  // 注入到全局，供服务层在无 models 目录时访问
  global.models = models;
}

/**
 * 清理测试数据库：删除并重新创建表（SQLite）或 TRUNCATE（PostgreSQL）
 */
async function clearTestDatabase() {
  if (process.env.DB_DIALECT === 'sqlite') {
    // 对于SQLite，重新运行初始化脚本
    const initSql = path.join(__dirname, '../../scripts/init-test-database.sql');
    await runSqlFile(initSql);
    console.log('SQLite测试数据库已重置');
  } else {
    // PostgreSQL逻辑
    const client = await pool.connect();
    try {
      await client.query(`DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE;';
        END LOOP;
      END $$;`);
      // 重新插入基础种子（如系统 expense_types 与 system_settings）
      const initSql = path.join(__dirname, '../../scripts/init-test-database.sql');
      await runSqlFile(initSql);
      console.log('测试数据库清理并重置基础数据完成');
    } catch (e) {
      console.error('测试数据库清理失败:', e.message);
      throw e;
    } finally {
      client.release();
    }
  }
}

/**
 * 关闭数据库连接池（幂等）
 */
async function closeTestDatabase() {
  try {
    if (!poolEnded) {
      if (process.env.DB_DIALECT === 'sqlite') {
        // SQLite不需要特殊关闭
        console.log('SQLite数据库连接已关闭');
      } else {
        await pool.end();
        console.log('PostgreSQL数据库连接池已关闭');
      }
      poolEnded = true;
    }
    if (sequelize) {
      await sequelize.close();
      sequelize = null;
    }
  } catch (e) {
    console.error('关闭测试数据库连接失败:', e.message);
    // 不再抛出，避免影响后续测试套件
  }
}

module.exports = {
  initTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
  models
};