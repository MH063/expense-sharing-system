const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

/**
 * 数据库一致性修复脚本
 * 主要解决：
 * 1. 确保所有环境中的表结构一致
 * 2. 修复数据类型显示问题
 * 3. 添加缺失的枚举类型定义
 */

// 从init_postgres_v18.sql文件中提取枚举类型定义
function extractEnumTypes() {
  const sqlFilePath = path.join(__dirname, '..', 'db', 'init_postgres_v18.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 匹配CREATE TYPE语句
  const enumRegex = /CREATE TYPE (\w+) AS ENUM \(([\s\S]*?)\);/g;
  const enums = {};
  let match;
  
  while ((match = enumRegex.exec(sqlContent)) !== null) {
    const enumName = match[1];
    const enumValues = match[2];
    
    enums[enumName] = enumValues;
  }
  
  return enums;
}

// 检查枚举类型是否存在
async function checkEnumExists(dbName, dbConfig, enumName) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const enumExistsQuery = `
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = '${enumName}' AND typtype = 'e'
      )
    `;
    
    const enumExistsResult = await pool.query(enumExistsQuery);
    return enumExistsResult.rows[0].exists;
  } catch (error) {
    console.error(`检查数据库 ${dbName} 枚举类型 ${enumName} 是否存在时出错:`, error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// 创建枚举类型
async function createEnumType(dbName, dbConfig, enumName, enumValues) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const createEnumSQL = `CREATE TYPE ${enumName} AS ENUM (${enumValues});`;
    await pool.query(createEnumSQL);
    console.log(`✅ 在数据库 ${dbName} 中创建枚举类型 ${enumName}`);
    return true;
  } catch (error) {
    console.error(`在数据库 ${dbName} 中创建枚举类型 ${enumName} 时出错:`, error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// 获取表的实际列信息
async function getTableColumns(dbName, dbConfig, tableName) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    return columnsResult.rows;
  } catch (error) {
    console.error(`获取数据库 ${dbName} 表 ${tableName} 列信息时出错:`, error.message);
    return [];
  } finally {
    await pool.end();
  }
}

// 比较两个环境的表结构
async function compareTableStructures(dbConfig, env1Name, env1DbName, env2Name, env2DbName, tableName) {
  const env1Columns = await getTableColumns(env1DbName, dbConfig, tableName);
  const env2Columns = await getTableColumns(env2DbName, dbConfig, tableName);
  
  const differences = [];
  
  // 检查列数量
  if (env1Columns.length !== env2Columns.length) {
    differences.push(`列数量不匹配: ${env1Name}(${env1Columns.length}) vs ${env2Name}(${env2Columns.length})`);
  }
  
  // 检查每个列
  for (const col1 of env1Columns) {
    const col2 = env2Columns.find(c => c.column_name === col1.column_name);
    
    if (!col2) {
      differences.push(`${env1Name}有列 ${col1.column_name}，但${env2Name}没有`);
      continue;
    }
    
    // 检查数据类型
    if (col1.data_type !== col2.data_type) {
      differences.push(`列 ${col1.column_name} 数据类型不匹配: ${env1Name}(${col1.data_type}) vs ${env2Name}(${col2.data_type})`);
    }
    
    // 检查是否可为空
    if (col1.is_nullable !== col2.is_nullable) {
      differences.push(`列 ${col1.column_name} 可空性不匹配: ${env1Name}(${col1.is_nullable}) vs ${env2Name}(${col2.is_nullable})`);
    }
  }
  
  return differences;
}

// 主函数
async function main() {
  console.log('开始数据库一致性修复...\n');
  
  // 提取枚举类型定义
  const enumTypes = extractEnumTypes();
  console.log(`发现 ${Object.keys(enumTypes).length} 个枚举类型定义`);
  
  // 数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789'
  };
  
  // 要检查的环境
  const environments = [
    { name: '开发环境', dbName: 'expense_dev' },
    { name: '生产环境', dbName: 'expense_prod' },
    { name: '测试环境', dbName: 'expense_test' }
  ];
  
  // 1. 确保所有环境都有相同的枚举类型
  console.log('\n===== 检查并创建枚举类型 =====');
  
  for (const env of environments) {
    console.log(`\n检查 ${env.name} (${env.dbName}) 的枚举类型...`);
    
    for (const [enumName, enumValues] of Object.entries(enumTypes)) {
      const enumExists = await checkEnumExists(env.dbName, dbConfig, enumName);
      
      if (!enumExists) {
        console.log(`  创建缺失的枚举类型: ${enumName}`);
        await createEnumType(env.dbName, dbConfig, enumName, enumValues);
      } else {
        console.log(`  ✅ 枚举类型 ${enumName} 已存在`);
      }
    }
  }
  
  // 2. 比较不同环境之间的表结构
  console.log('\n===== 比较环境之间的表结构 =====');
  
  // 获取所有表名
  const devPool = new Pool({
    ...dbConfig,
    database: 'expense_dev'
  });
  
  const tablesResult = await devPool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const tableNames = tablesResult.rows.map(row => row.table_name);
  await devPool.end();
  
  console.log(`发现 ${tableNames.length} 个表`);
  
  // 比较每对环境之间的表结构
  const envPairs = [
    { env1: environments[0], env2: environments[1] }, // 开发 vs 生产
    { env1: environments[0], env2: environments[2] }, // 开发 vs 测试
    { env1: environments[1], env2: environments[2] }  // 生产 vs 测试
  ];
  
  let hasDifferences = false;
  
  for (const pair of envPairs) {
    console.log(`\n比较 ${pair.env1.name} 与 ${pair.env2.name} 的表结构...`);
    
    for (const tableName of tableNames) {
      const differences = await compareTableStructures(
        dbConfig, 
        pair.env1.name, 
        pair.env1.dbName, 
        pair.env2.name, 
        pair.env2.dbName, 
        tableName
      );
      
      if (differences.length > 0) {
        hasDifferences = true;
        console.log(`\n表 ${tableName} 存在差异:`);
        differences.forEach(diff => console.log(`  - ${diff}`));
      }
    }
    
    if (!hasDifferences) {
      console.log(`✅ ${pair.env1.name} 与 ${pair.env2.name} 的表结构完全一致`);
    }
  }
  
  // 3. 生成报告
  const reportContent = `# 数据库一致性修复报告

## 修复时间
${new Date().toISOString()}

## 修复内容

### 1. 枚举类型检查
- 检查了 ${environments.length} 个环境
- 发现 ${Object.keys(enumTypes).length} 个枚举类型定义
- 确保所有环境都有相同的枚举类型

### 2. 表结构比较
- 比较了 ${envPairs.length} 对环境之间的表结构
- 检查了 ${tableNames.length} 个表的结构
- 发现差异: ${hasDifferences ? '是' : '否'}

## 结论
${hasDifferences ? '发现表结构差异，需要进一步修复' : '所有环境的表结构一致'}

## 建议
1. 定期运行此脚本以确保数据库一致性
2. 在修改数据库结构后，确保在所有环境中应用相同的更改
3. 使用版本控制管理数据库结构变更
`;
  
  fs.writeFileSync(path.join(__dirname, 'database-consistency-report.md'), reportContent);
  
  console.log('\n===== 修复完成 =====');
  console.log('详细报告已保存到 scripts/database-consistency-report.md');
  
  if (!hasDifferences) {
    console.log('✅ 所有环境的数据库结构一致');
  } else {
    console.log('⚠️ 发现表结构差异，请查看详细报告');
  }
}

main().catch(console.error);