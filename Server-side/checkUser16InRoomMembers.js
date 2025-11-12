const { pool } = require('./config/db');

async function checkUser16InRoomMembers() {
  try {
    // 查询用户16在room_members表中的记录
    const roomMembersResult = await pool.query('SELECT * FROM room_members WHERE user_id = 16');
    console.log('用户16在room_members表中的记录:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户16在user_room_relations表中的记录
    const userRoomRelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 16');
    console.log('\n用户16在user_room_relations表中的记录:');
    userRoomRelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询寝室6的所有成员
    const room6MembersResult = await pool.query('SELECT * FROM room_members WHERE room_id = 6');
    console.log('\n寝室6的所有成员:');
    room6MembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询寝室6的所有用户关系
    const room6RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE room_id = 6');
    console.log('\n寝室6的所有用户关系:');
    room6RelationsResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser16InRoomMembers();