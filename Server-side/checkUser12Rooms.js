const { pool } = require('./config/db');

async function checkUser12Rooms() {
  try {
    // 查询用户12在room_members表中的记录
    const roomMembersResult = await pool.query('SELECT * FROM room_members WHERE user_id = 12');
    console.log('用户12在room_members表中的记录:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户12在user_room_relations表中的记录
    const userRoomRelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 12');
    console.log('\n用户12在user_room_relations表中的记录:');
    userRoomRelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户13在room_members表中的记录
    const user13RoomMembersResult = await pool.query('SELECT * FROM room_members WHERE user_id = 13');
    console.log('\n用户13在room_members表中的记录:');
    user13RoomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户14在room_members表中的记录
    const user14RoomMembersResult = await pool.query('SELECT * FROM room_members WHERE user_id = 14');
    console.log('\n用户14在room_members表中的记录:');
    user14RoomMembersResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser12Rooms();