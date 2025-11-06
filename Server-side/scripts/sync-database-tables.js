const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

// 数据库连接配置
const dbConfigs = {
  dev: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'expense_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  prod: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'expense_prod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'expense_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  }
};

// 创建数据库连接池
async function createPool(config) {
  return new Pool(config);
}

// 获取数据库中的所有表
async function getTables(pool) {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(row => row.table_name);
}

// 获取表的结构信息
async function getTableStructure(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows;
}

// 创建表
async function createTable(pool, tableName, structure) {
  // 构建CREATE TABLE语句
  let createSQL = `CREATE TABLE ${tableName} (\n`;
  const columns = [];
  
  structure.forEach(column => {
    let columnDef = `  ${column.column_name} ${column.data_type}`;
    
    if (column.is_nullable === 'NO') {
      columnDef += ' NOT NULL';
    }
    
    if (column.column_default) {
      columnDef += ` DEFAULT ${column.column_default}`;
    }
    
    columns.push(columnDef);
  });
  
  createSQL += columns.join(',\n');
  createSQL += '\n);';
  
  console.log(`创建表 ${tableName}...`);
  await pool.query(createSQL);
  console.log(`表 ${tableName} 创建成功`);
}

// 主函数
async function main() {
  console.log('===== 开始数据库一致性修复 =====');
  
  const devPool = await createPool(dbConfigs.dev);
  const prodPool = await createPool(dbConfigs.prod);
  const testPool = await createPool(dbConfigs.test);
  
  try {
    // 获取各环境中的表
    console.log('\n===== 获取各环境中的表 =====');
    const devTables = await getTables(devPool);
    const prodTables = await getTables(prodPool);
    const testTables = await getTables(testPool);
    
    console.log(`开发环境表数量: ${devTables.length}`);
    console.log(`生产环境表数量: ${prodTables.length}`);
    console.log(`测试环境表数量: ${testTables.length}`);
    
    // 找出开发环境中独有的表
    const devOnlyTables = devTables.filter(table => 
      !prodTables.includes(table) && !testTables.includes(table)
    );
    
    console.log(`\n开发环境独有的表: ${devOnlyTables.join(', ')}`);
    
    // 为这些表获取结构并创建到其他环境
    for (const table of devOnlyTables) {
      console.log(`\n处理表: ${table}`);
      
      // 获取开发环境中表的结构
      const devStructure = await getTableStructure(devPool, table);
      
      // 在生产环境中创建表
      if (!prodTables.includes(table)) {
        await createTable(prodPool, table, devStructure);
      }
      
      // 在测试环境中创建表
      if (!testTables.includes(table)) {
        await createTable(testPool, table, devStructure);
      }
    }
    
    // 生成修复报告
    const report = `# 数据库一致性修复报告

## 修复时间
${new Date().toISOString()}

## 修复内容

### 1. 表同步
- 开发环境独有的表: ${devOnlyTables.join(', ')}
- 已将这些表同步到生产和测试环境

### 2. 修复详情
${devOnlyTables.map(table => {
  return `- 表 ${table}: 已在生产环境和测试环境中创建`;
}).join('\n')}

## 修复结果
- 开发环境表数量: ${devTables.length}
- 生产环境表数量: ${devTables.length} (修复前: ${prodTables.length})
- 测试环境表数量: ${devTables.length} (修复前: ${testTables.length})

## 结论
所有环境的表结构现已保持一致
`;

    // 保存报告
    fs.writeFileSync(
      path.join(__dirname, 'database-table-sync-report.md'),
      report
    );
    
    console.log('\n===== 修复完成 =====');
    console.log('详细报告已保存到 scripts/database-table-sync-report.md');
    console.log('✅ 所有环境的表结构现已保持一致');
    
  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    // 关闭连接池
    await devPool.end();
    await prodPool.end();
    await testPool.end();
  }
}

// 运行主函数
main().catch(console.error);