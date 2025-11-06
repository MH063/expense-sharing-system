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
    
    // 提取列定义
    const lines = tableContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('--'));
    const columns = [];
    
    for (const line of lines) {
      // 跳过约束定义（如PRIMARY KEY, FOREIGN KEY等）
      if (line.includes('PRIMARY KEY') || line.includes('FOREIGN KEY') || 
          line.includes('UNIQUE') || line.includes('CHECK') || line.includes('REFERENCES')) {
        continue;
      }
      
      // 匹配列定义
      const columnMatch = line.match(/^(\w+)\s+(.+?)(?:\s+DEFAULT\s+.+?)?(?:\s+NOT\s+NULL)?(?:\s+NULL)?\s*$/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        let dataType = columnMatch[2].split(/\s+DEFAULT\s+/)[0].trim(); // 移除DEFAULT部分
        
        // 简化数据类型表示
        if (dataType.startsWith('VARCHAR')) dataType = 'VARCHAR';
        if (dataType.startsWith('NUMERIC')) dataType = 'NUMERIC';
        if (dataType.startsWith('TEXT')) dataType = 'TEXT';
        if (dataType.startsWith('BOOLEAN')) dataType = 'BOOLEAN';
        if (dataType.startsWith('TIMESTAMPTZ')) dataType = 'TIMESTAMPTZ';
        if (dataType.startsWith('UUID')) dataType = 'UUID';
        if (dataType.startsWith('SMALLINT')) dataType = 'SMALLINT';
        if (dataType.startsWith('INT')) dataType = 'INT';
        if (dataType.startsWith('DATE')) dataType = 'DATE';
        if (dataType.startsWith('INET')) dataType = 'INET';
        
        columns.push({
          name: columnName,
          type: dataType
        });
      }
    }
    
    tables[tableName] = columns;
  }
  
  return tables;
}

// 检查数据库中的表结构
async function checkTableStructure(dbName, dbConfig, expectedTables) {
  const pool = new Pool({
    ...dbConfig,
    database: dbName
  });

  try {
    const results = {};
    
    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      // 检查表是否存在
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${tableName}'
        )
      `;
      
      const tableExistsResult = await pool.query(tableExistsQuery);
      const tableExists = tableExistsResult.rows[0].exists;
      
      if (!tableExists) {
        results[tableName] = {
          exists: false,
          columns: [],
          missingColumns: expectedColumns.map(col => col.name),
          extraColumns: [],
          typeMismatches: []
        };
        continue;
      }
      
      // 获取表的实际列信息
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await pool.query(columnsQuery);
      const actualColumns = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type.toUpperCase(),
        nullable: row.is_nullable === 'YES'
      }));
      
      // 简化实际数据类型
      actualColumns.forEach(col => {
        if (col.type.startsWith('CHARACTER VARYING')) col.type = 'VARCHAR';
        if (col.type.startsWith('NUMERIC')) col.type = 'NUMERIC';
        if (col.type.startsWith('TIMESTAMP WITH TIME ZONE')) col.type = 'TIMESTAMPTZ';
        if (col.type.startsWith('USER-DEFINED')) col.type = 'ENUM'; // 处理枚举类型
      });
      
      // 比较列
      const expectedColumnNames = expectedColumns.map(col => col.name);
      const actualColumnNames = actualColumns.map(col => col.name);
      
      const missingColumns = expectedColumnNames.filter(name => !actualColumnNames.includes(name));
      const extraColumns = actualColumnNames.filter(name => !expectedColumnNames.includes(name));
      
      // 检查类型不匹配
      const typeMismatches = [];
      for (const expectedCol of expectedColumns) {
        const actualCol = actualColumns.find(col => col.name === expectedCol.name);
        if (actualCol && actualCol.type !== expectedCol.type) {
          typeMismatches.push({
            name: expectedCol.name,
            expected: expectedCol.type,
            actual: actualCol.type
          });
        }
      }
      
      results[tableName] = {
        exists: true,
        columns: actualColumns,
        missingColumns,
        extraColumns,
        typeMismatches
      };
    }
    
    return results;
  } catch (error) {
    console.error(`检查数据库 ${dbName} 表结构时出错:`, error.message);
    return null;
  } finally {
    await pool.end();
  }
}

// 主函数
async function main() {
  console.log('开始详细检查数据库表结构...\n');
  
  // 提取预期的表结构
  const expectedTables = extractTableStructures();
  console.log(`预期检查的表数量: ${Object.keys(expectedTables).length}`);
  
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
    
    const tableStructures = await checkTableStructure(env.dbName, dbConfig, expectedTables);
    
    if (!tableStructures) {
      console.log(`无法连接到数据库 ${env.dbName}，跳过检查`);
      continue;
    }
    
    let allTablesComplete = true;
    
    for (const [tableName, structure] of Object.entries(tableStructures)) {
      console.log(`\n表: ${tableName}`);
      
      if (!structure.exists) {
        console.log(`  ❌ 表不存在`);
        allTablesComplete = false;
        continue;
      }
      
      console.log(`  ✅ 表存在 (${structure.columns.length} 个列)`);
      
      if (structure.missingColumns.length > 0) {
        console.log(`  ❌ 缺失列: ${structure.missingColumns.join(', ')}`);
        allTablesComplete = false;
      }
      
      if (structure.extraColumns.length > 0) {
        console.log(`  ⚠️ 额外列: ${structure.extraColumns.join(', ')}`);
      }
      
      if (structure.typeMismatches.length > 0) {
        console.log(`  ⚠️ 类型不匹配:`);
        for (const mismatch of structure.typeMismatches) {
          console.log(`    - ${mismatch.name}: 预期 ${mismatch.expected}, 实际 ${mismatch.actual}`);
        }
      }
      
      if (structure.missingColumns.length === 0 && 
          structure.typeMismatches.length === 0) {
        console.log(`  ✅ 列结构完整且匹配`);
      }
    }
    
    if (allTablesComplete) {
      console.log(`\n✅ ${env.name} 所有表结构完整且匹配`);
    } else {
      console.log(`\n❌ ${env.name} 存在表结构问题`);
    }
  }
  
  console.log('\n数据库表结构详细检查完成');
}

main().catch(console.error);