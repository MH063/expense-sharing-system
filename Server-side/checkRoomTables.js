const db = require('./config/db');

// 查询room_members和user_room_relations表的结构
async function checkRoomTables() {
  try {
    // 检查room_members表结构
    const roomMembersQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'room_members'
      ORDER BY ordinal_position
    `;
    
    const roomMembersResult = await db.query(roomMembersQuery);
    console.log('room_members表结构:');
    console.table(roomMembersResult.rows);
    
    // 检查user_room_relations表结构
    const userRoomRelationsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_room_relations'
      ORDER BY ordinal_position
    `;
    
    const userRoomRelationsResult = await db.query(userRoomRelationsQuery);
    console.log('\nuser_room_relations表结构:');
    console.table(userRoomRelationsResult.rows);
    
    // 查看room_members表中的数据
    const roomMembersDataQuery = 'SELECT * FROM room_members LIMIT 5';
    const roomMembersData = await db.query(roomMembersDataQuery);
    console.log('\nroom_members表中的数据示例:');
    console.table(roomMembersData.rows);
    
    // 查看user_room_relations表中的数据
    const userRoomRelationsDataQuery = 'SELECT * FROM user_room_relations LIMIT 5';
    const userRoomRelationsData = await db.query(userRoomRelationsDataQuery);
    console.log('\nuser_room_relations表中的数据示例:');
    console.table(userRoomRelationsData.rows);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

checkRoomTables();