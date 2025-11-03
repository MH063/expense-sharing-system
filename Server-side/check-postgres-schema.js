const pool = require('./config/database');

async function checkTables() {
  try {
    // 检查rooms表是否存在
    console.log('=== 检查rooms表 ===');
    const roomsCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rooms'
      ORDER BY ordinal_position
    `);
    
    if (roomsCheck.rows && roomsCheck.rows.length > 0) {
      console.log('rooms表结构:');
      roomsCheck.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? '可为空' : '不可为空'})`);
      });
    } else {
      console.log('rooms表不存在');
    }

    // 检查expense_types表是否存在
    console.log('\n=== 检查expense_types表 ===');
    const expenseTypesCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'expense_types'
      ORDER BY ordinal_position
    `);
    
    if (expenseTypesCheck.rows && expenseTypesCheck.rows.length > 0) {
      console.log('expense_types表结构:');
      expenseTypesCheck.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? '可为空' : '不可为空'})`);
      });
    } else {
      console.log('expense_types表不存在');
    }

    // 检查user_room_relations表是否存在
    console.log('\n=== 检查user_room_relations表 ===');
    const userRoomRelationsCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_room_relations'
      ORDER BY ordinal_position
    `);
    
    if (userRoomRelationsCheck.rows && userRoomRelationsCheck.rows.length > 0) {
      console.log('user_room_relations表结构:');
      userRoomRelationsCheck.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? '可为空' : '不可为空'})`);
      });
    } else {
      console.log('user_room_relations表不存在');
    }

  } catch (error) {
    console.error('检查表结构失败:', error);
  }
}

checkTables();