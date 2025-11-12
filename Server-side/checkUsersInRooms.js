const { pool } = require('./config/db');

async function checkUsersInRooms() {
  try {
    // 查询用户13在user_room_relations表中的记录
    const user13RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 13');
    console.log('用户13在user_room_relations表中的记录:');
    user13RelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户14在user_room_relations表中的记录
    const user14RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 14');
    console.log('\n用户14在user_room_relations表中的记录:');
    user14RelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户15在user_room_relations表中的记录
    const user15RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 15');
    console.log('\n用户15在user_room_relations表中的记录:');
    user15RelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户16在user_room_relations表中的记录
    const user16RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 16');
    console.log('\n用户16在user_room_relations表中的记录:');
    user16RelationsResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersInRooms();