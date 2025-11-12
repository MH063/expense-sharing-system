const { pool } = require('./config/db');

async function checkUser14InRoomMembers() {
  try {
    // 查询用户14在room_members表中的记录
    const roomMembersResult = await pool.query('SELECT * FROM room_members WHERE user_id = 14');
    console.log('用户14在room_members表中的记录:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询用户14在user_room_relations表中的记录
    const userRoomRelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE user_id = 14');
    console.log('\n用户14在user_room_relations表中的记录:');
    userRoomRelationsResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询寝室3的所有成员
    const room3MembersResult = await pool.query('SELECT * FROM room_members WHERE room_id = 3');
    console.log('\n寝室3的所有成员:');
    room3MembersResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询寝室3的所有用户关系
    const room3RelationsResult = await pool.query('SELECT * FROM user_room_relations WHERE room_id = 3');
    console.log('\n寝室3的所有用户关系:');
    room3RelationsResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser14InRoomMembers();