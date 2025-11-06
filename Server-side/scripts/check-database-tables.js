const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

// 从init_postgres_v18.sql文件中提取所有表名
function extractTableNames() {
  const sqlFilePath = path.join(__dirname, '..', 'db', 'init_postgres_v18.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 匹配CREATE TABLE语句
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)/g;
  const tables = [];
  let match;
  
  while ((match = tableRegex.exec(sqlContent)) !== null) {
    tables.push(match[1]);
  }
  
  return tables;
}

// 从init_postgres_v18.sql文件中提取所有视图名
function extractViewNames() {
  const sqlFilePath = path.join(__dirname, '..', 'db', 'init_postgres_v18.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // 匹配CREATE VIEW语句
  const viewRegex = /CREATE VIEW (\w+)/g;
  const views = [];
  let match;
  
  while ((match = viewRegex.exec(sqlContent)) !== null) {
    views.push(match[1]);
  }
  
  return views;
}

// 检查数据库中的表和视图
async function checkDatabaseTables(dbName, dbConfig) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    // 获取所有表名
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    
    // 获取所有视图名
    const viewsQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    const viewsResult = await pool.query(viewsQuery);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const existingViews = viewsResult.rows.map(row => row.table_name);
    
    return {
      tables: existingTables,
      views: existingViews
    };
  } catch (error) {
    console.error(`检查数据库 ${dbName} 时出错:`, error.message);
    return null;
  } finally {
    await pool.end();
  }
}

// 主函数
async function main() {
  console.log('开始检查数据库表结构...\n');
  
  // 提取预期的表和视图
  const expectedTables = extractTableNames();
  const expectedViews = extractViewNames();
  
  console.log(`预期的表 (${expectedTables.length}个):`, expectedTables);
  console.log(`预期的视图 (${expectedViews.length}个):`, expectedViews);
  console.log('\n');
  
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
    
    const dbObjects = await checkDatabaseTables(env.dbName, dbConfig);
    
    if (!dbObjects) {
      console.log(`无法连接到数据库 ${env.dbName}，跳过检查`);
      continue;
    }
    
    // 检查表
    console.log(`\n表检查结果:`);
    console.log(`- 实际表数量: ${dbObjects.tables.length}`);
    console.log(`- 预期表数量: ${expectedTables.length}`);
    
    const missingTables = expectedTables.filter(table => !dbObjects.tables.includes(table));
    const extraTables = dbObjects.tables.filter(table => !expectedTables.includes(table));
    
    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ 所有表都存在且完整');
    } else {
      if (missingTables.length > 0) {
        console.log(`❌ 缺失的表 (${missingTables.length}个):`, missingTables);
      }
      if (extraTables.length > 0) {
        console.log(`⚠️ 额外的表 (${extraTables.length}个):`, extraTables);
      }
    }
    
    // 检查视图
    console.log(`\n视图检查结果:`);
    console.log(`- 实际视图数量: ${dbObjects.views.length}`);
    console.log(`- 预期视图数量: ${expectedViews.length}`);
    
    const missingViews = expectedViews.filter(view => !dbObjects.views.includes(view));
    const extraViews = dbObjects.views.filter(view => !expectedViews.includes(view));
    
    if (missingViews.length === 0 && extraViews.length === 0) {
      console.log('✅ 所有视图都存在且完整');
    } else {
      if (missingViews.length > 0) {
        console.log(`❌ 缺失的视图 (${missingViews.length}个):`, missingViews);
      }
      if (extraViews.length > 0) {
        console.log(`⚠️ 额外的视图 (${extraViews.length}个):`, extraViews);
      }
    }
    
    // 检查特定表的结构（可选）
    console.log(`\n关键表结构检查:`);
    const criticalTables = ['users', 'rooms', 'bills', 'admin_users'];
    
    // 创建一个新的连接池用于检查表结构
    const structPool = new Pool({
      ...dbConfig,
      database: env.dbName
    });
    
    for (const table of criticalTables) {
      if (dbObjects.tables.includes(table)) {
        try {
          const columnsQuery = `
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = '${table}' AND table_schema = 'public'
            ORDER BY ordinal_position
          `;
          
          const columnsResult = await structPool.query(columnsQuery);
          console.log(`- ${table} 表有 ${columnsResult.rows.length} 个列`);
        } catch (error) {
          console.log(`- 无法获取 ${table} 表的结构: ${error.message}`);
        }
      } else {
        console.log(`- ${table} 表不存在`);
      }
    }
    
    // 关闭结构检查的连接池
    await structPool.end();
  }
  
  console.log('\n数据库表结构检查完成');
}

main().catch(console.error);