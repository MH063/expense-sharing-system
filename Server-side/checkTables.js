const db = require('./config/db');

// 查询数据库中的所有表
async function checkTables() {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const result = await db.query(query);
    console.log('数据库中的所有表:');
    console.table(result.rows);
    
    // 检查是否有相关的用户-房间关联表
    const relatedTables = result.rows.filter(row => 
      row.table_name.includes('user') || 
      row.table_name.includes('room') ||
      row.table_name.includes('member')
    );
    
    if (relatedTables.length > 0) {
      console.log('\n与用户或房间相关的表:');
      console.table(relatedTables);
    } else {
      console.log('\n没有找到与用户或房间相关的表');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

checkTables();