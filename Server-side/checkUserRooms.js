const { pool } = require('./config/db');

async function checkUserRooms() {
  try {
    // 查询用户12(sysadmin)所属的寝室
    const userRoomsResult = await pool.query('SELECT room_id FROM user_rooms WHERE user_id = 12');
    console.log('用户12(sysadmin)所属的寝室:');
    userRoomsResult.rows.forEach(row => {
      console.log(`寝室ID: ${row.room_id}`);
    });

    // 查询寝室1的成员
    const roomMembersResult = await pool.query('SELECT user_id FROM user_rooms WHERE room_id = 1');
    console.log('\n寝室1的成员:');
    roomMembersResult.rows.forEach(row => {
      console.log(`用户ID: ${row.user_id}`);
    });

    // 查询所有寝室
    const roomsResult = await pool.query('SELECT id, name FROM rooms LIMIT 5');
    console.log('\n所有寝室:');
    roomsResult.rows.forEach(room => {
      console.log(`寝室ID: ${room.id}, 寝室名称: ${room.name}`);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserRooms();