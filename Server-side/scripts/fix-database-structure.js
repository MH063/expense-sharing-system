const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

// 从init_postgres_v18.sql文件中提取表结构信息
function extractTableStructures() {
  const sqlFilePath = path.join(__dirname, '..', 'db', 'init_postgres_v18.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 匹配CREATE TABLE语句及其内容
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/g;
  const tables = {};
  let match;
  
  while ((match = tableRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const tableContent = match[2];
    
    tables[tableName] = tableContent;
  }
  
  return tables;
}

// 从init_postgres_v18.sql文件中提取视图定义
function extractViewDefinitions() {
  const sqlFilePath = path.join(__dirname, '..', 'db', 'init_postgres_v18.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 匹配CREATE VIEW语句
  const viewRegex = /CREATE VIEW (\w+) AS ([\s\S]*?);/g;
  const views = {};
  let match;
  
  while ((match = viewRegex.exec(sqlContent)) !== null) {
    const viewName = match[1];
    const viewDefinition = match[2];
    
    views[viewName] = viewDefinition;
  }
  
  return views;
}

// 检查数据库中的表是否存在
async function checkTablesExist(dbName, dbConfig, expectedTables) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const results = {};
    
    for (const tableName of Object.keys(expectedTables)) {
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${tableName}'
        )
      `;
      
      const tableExistsResult = await pool.query(tableExistsQuery);
      const tableExists = tableExistsResult.rows[0].exists;
      
      results[tableName] = tableExists;
    }
    
    return results;
  } catch (error) {
    console.error(`检查数据库 ${dbName} 表是否存在时出错:`, error.message);
    return null;
  } finally {
    await pool.end();
  }
}

// 检查数据库中的视图是否存在
async function checkViewsExist(dbName, dbConfig, expectedViews) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const results = {};
    
    for (const viewName of Object.keys(expectedViews)) {
      const viewExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' AND table_name = '${viewName}'
        )
      `;
      
      const viewExistsResult = await pool.query(viewExistsQuery);
      const viewExists = viewExistsResult.rows[0].exists;
      
      results[viewName] = viewExists;
    }
    
    return results;
  } catch (error) {
    console.error(`检查数据库 ${dbName} 视图是否存在时出错:`, error.message);
    return null;
  } finally {
    await pool.end();
  }
}

// 创建缺失的表和视图
async function createMissingObjects(dbName, dbConfig, expectedTables, expectedViews, missingTables, missingViews) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    await pool.query('BEGIN');
    
    // 创建缺失的表
    for (const tableName of missingTables) {
      console.log(`创建表: ${tableName}`);
      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${expectedTables[tableName]});`;
      await pool.query(createTableSQL);
    }
    
    // 创建缺失的视图
    for (const viewName of missingViews) {
      console.log(`创建视图: ${viewName}`);
      const createViewSQL = `CREATE VIEW ${viewName} AS ${expectedViews[viewName]};`;
      await pool.query(createViewSQL);
    }
    
    await pool.query('COMMIT');
    console.log(`成功创建 ${missingTables.length} 个表和 ${missingViews.length} 个视图`);
    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`创建数据库对象时出错:`, error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// 主函数
async function main() {
  console.log('开始检查并修复数据库表结构...\n');
  
  // 提取预期的表结构和视图定义
  const expectedTables = extractTableStructures();
  const expectedViews = extractViewDefinitions();
  
  console.log(`预期表数量: ${Object.keys(expectedTables).length}`);
  console.log(`预期视图数量: ${Object.keys(expectedViews).length}`);
  
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
  
  // 检查每个环境
  for (const env of environments) {
    console.log(`\n===== 检查 ${env.name} (${env.dbName}) =====`);
    
    // 检查表是否存在
    const tableExistence = await checkTablesExist(env.dbName, dbConfig, expectedTables);
    
    if (!tableExistence) {
      console.log(`无法连接到数据库 ${env.dbName}，跳过检查`);
      continue;
    }
    
    // 检查视图是否存在
    const viewExistence = await checkViewsExist(env.dbName, dbConfig, expectedViews);
    
    // 找出缺失的表和视图
    const missingTables = Object.keys(tableExistence).filter(table => !tableExistence[table]);
    const missingViews = viewExistence ? Object.keys(viewExistence).filter(view => !viewExistence[view]) : [];
    
    console.log(`缺失的表 (${missingTables.length}个): ${missingTables.join(', ') || '无'}`);
    console.log(`缺失的视图 (${missingViews.length}个): ${missingViews.join(', ') || '无'}`);
    
    // 如果有缺失的对象，尝试创建
    if (missingTables.length > 0 || missingViews.length > 0) {
      console.log(`\n尝试创建缺失的表和视图...`);
      const success = await createMissingObjects(
        env.dbName, 
        dbConfig, 
        expectedTables, 
        expectedViews, 
        missingTables, 
        missingViews
      );
      
      if (success) {
        console.log(`✅ ${env.name} 缺失的表和视图创建成功`);
      } else {
        console.log(`❌ ${env.name} 缺失的表和视图创建失败`);
      }
    } else {
      console.log(`✅ ${env.name} 所有表和视图都存在`);
    }
  }
  
  console.log('\n数据库表结构检查和修复完成');
}

main().catch(console.error);