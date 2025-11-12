const { pool } = require('./config/db');

async function addUserToRoomMembers() {
  try {
    // 将用户16添加到寝室6的room_members表中
    const insertResult = await pool.query(
      'INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [6, 16, 'member']
    );
    
    console.log('成功将用户16添加到寝室6:');
    console.log(insertResult.rows[0]);

    // 查询寝室6的所有成员
    const room6MembersResult = await pool.query('SELECT * FROM room_members WHERE room_id = 6');
    console.log('\n寝室6的所有成员:');
    room6MembersResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    await pool.end();
  }
}

addUserToRoomMembers();