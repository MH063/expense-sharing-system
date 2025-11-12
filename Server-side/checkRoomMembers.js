const { pool } = require('./config/db');

async function checkRoomMembers() {
  try {
    // 查询room_members表结构
    const roomMembersSchemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'room_members' 
      ORDER BY ordinal_position
    `);
    
    console.log('room_members表结构:');
    roomMembersSchemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    // 查询room_members表内容
    const roomMembersResult = await pool.query('SELECT * FROM room_members LIMIT 10');
    console.log('\nroom_members表内容:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询user_room_relations表结构
    const userRoomRelationsSchemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_room_relations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nuser_room_relations表结构:');
    userRoomRelationsSchemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    // 查询user_room_relations表内容
    const userRoomRelationsResult = await pool.query('SELECT * FROM user_room_relations LIMIT 10');
    console.log('\nuser_room_relations表内容:');
    userRoomRelationsResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkRoomMembers();