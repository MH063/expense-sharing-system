const pool = require('./config/database');

async function checkSchema() {
  try {
    // 检查rooms表结构
    console.log('=== rooms表结构 ===');
    const roomsSchema = await pool.query("PRAGMA table_info(rooms)");
    roomsSchema.forEach(column => {
      console.log(`列名: ${column.name}, 类型: ${column.type}, 是否允许NULL: ${column.notnull ? '否' : '是'}`);
    });

    // 检查expense_types表结构
    console.log('\n=== expense_types表结构 ===');
    const expenseTypesSchema = await pool.query("PRAGMA table_info(expense_types)");
    expenseTypesSchema.forEach(column => {
      console.log(`列名: ${column.name}, 类型: ${column.type}, 是否允许NULL: ${column.notnull ? '否' : '是'}`);
    });

    // 检查user_room_relations表结构
    console.log('\n=== user_room_relations表结构 ===');
    const userRoomRelationsSchema = await pool.query("PRAGMA table_info(user_room_relations)");
    userRoomRelationsSchema.forEach(column => {
      console.log(`列名: ${column.name}, 类型: ${column.type}, 是否允许NULL: ${column.notnull ? '否' : '是'}`);
    });

  } catch (error) {
    console.error('检查表结构失败:', error);
  }
}

checkSchema();